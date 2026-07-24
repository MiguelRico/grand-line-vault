var CatalogService = (function () {
  function execute(operation, args) {
    var cacheKey = CatalogCache.key('normalized', operation, args);
    var cached = CatalogCache.get(cacheKey);
    if (cached) {
      cached.meta.cached = true;
      return cached;
    }
    var candidates = CatalogProviderSelector.select(operation);
    if (!candidates.length) throw CatalogError.retryable('NO_PROVIDER', 'No hay proveedores disponibles.');
    var lastError;
    for (var index = 0; index < candidates.length; index += 1) {
      var provider = candidates[index];
      try {
        var data = provider[operation].apply(provider, args || []);
        CircuitBreaker.success(provider.getProviderInfo().id);
        var result = {
          data: data,
          meta: {
            provider: provider.getProviderInfo().id,
            fallbackUsed: index > 0,
            cached: false,
            partialData: index > 0 && provider.getProviderInfo().id === 'OPTCG_API'
          }
        };
        CatalogCache.put(cacheKey, result, CatalogCache.ttl(operation));
        return result;
      } catch (error) {
        lastError = error;
        if (error && error.retryable === true) {
          CircuitBreaker.failure(provider.getProviderInfo().id);
        }
        if (!CatalogFallbackPolicy.shouldFallback(error)) throw error;
      }
    }
    throw lastError || CatalogError.retryable('CATALOG_UNAVAILABLE', 'Catálogo no disponible.');
  }
  return {
    search: function (criteria) { return execute('search', [criteria]); },
    getCard: function (criteria) { return execute('getCard', [criteria]); },
    getSets: function () { return execute('getSets', []); },
    metadata: function () {
      return {
        providers: CatalogProviderRegistry.describe(),
        maxPageSize: Config.number('CATALOG_MAX_PAGE_SIZE'),
        defaultPageSize: Config.number('CATALOG_DEFAULT_PAGE_SIZE')
      };
    },
    providers: function () {
      return {
        primary: Config.get('CATALOG_PRIMARY_PROVIDER'),
        fallbacks: Config.list('CATALOG_FALLBACK_PROVIDERS'),
        providers: CatalogProviderRegistry.describe()
      };
    },
    health: function (providerId) {
      var ids = providerId ? [providerId] : CatalogProviderRegistry.describe().map(function (p) { return p.id; });
      return ids.map(function (id) {
        var started = Date.now();
        try {
          var provider = CatalogProviderRegistry.get(id);
          var available = provider.isConfigured() && provider.healthCheck();
          return { providerId: id, available: available, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), circuit: CircuitBreaker.state(id) };
        } catch (error) {
          return { providerId: id, available: false, latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), errorCode: error.code || 'HEALTH_ERROR' };
        }
      });
    }
  };
})();
