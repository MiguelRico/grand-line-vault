var CatalogService = (function () {
  function execute(operation, args, preferredProviderId) {
    var cacheKey = CatalogCache.key(preferredProviderId || 'automatic', operation, args);
    var cached = CatalogCache.get(cacheKey);
    if (cached) {
      cached.meta.cached = true;
      return cached;
    }
    var candidates = CatalogProviderSelector.select(operation, preferredProviderId);
    if (!candidates.length)
      throw CatalogError.retryable('NO_PROVIDER', 'No hay proveedores disponibles.');
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
            partialData: index > 0 && provider.getProviderInfo().id === 'OPTCG_API',
          },
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
    search: function (criteria, providerId) {
      return execute('search', [criteria], providerId);
    },
    getCard: function (criteria, providerId) {
      return execute('getCard', [criteria], providerId);
    },
    getSets: function (providerId) {
      return execute('getSets', [], providerId);
    },
    metadata: function () {
      return {
        providers: CatalogProviderRegistry.describe(),
        maxPageSize: Config.number('CATALOG_MAX_PAGE_SIZE'),
        defaultPageSize: Config.number('CATALOG_DEFAULT_PAGE_SIZE'),
      };
    },
    providers: function () {
      return {
        primary: Config.get('CATALOG_PRIMARY_PROVIDER'),
        fallbacks: Config.list('CATALOG_FALLBACK_PROVIDERS'),
        providers: CatalogProviderRegistry.describe(),
      };
    },
    health: function (providerId) {
      var ids = providerId
        ? [providerId]
        : CatalogProviderRegistry.describe().map(function (p) {
            return p.id;
          });
      return ids.map(function (id) {
        var started = Date.now();
        try {
          var provider = CatalogProviderRegistry.get(id);
          var available = provider.isConfigured() && provider.healthCheck();
          return {
            providerId: id,
            available: available,
            latencyMs: Date.now() - started,
            checkedAt: new Date().toISOString(),
            circuit: CircuitBreaker.state(id),
          };
        } catch (error) {
          return {
            providerId: id,
            available: false,
            latencyMs: Date.now() - started,
            checkedAt: new Date().toISOString(),
            errorCode: error.code || 'HEALTH_ERROR',
          };
        }
      });
    },
    providerStatuses: function () {
      return CatalogProviderRegistry.describe().map(function (description) {
        var started = Date.now();
        var base = {
          providerId: description.id,
          name: description.name,
          enabled: description.enabled,
          configured: description.configured,
          available: false,
          totalCards: null,
          filterSummary: null,
          latencyMs: 0,
          checkedAt: new Date().toISOString(),
          documentationUrl: description.documentationUrl,
        };
        if (!description.enabled) {
          base.errorCode = 'PROVIDER_DISABLED';
          return base;
        }
        if (!description.configured) {
          base.errorCode = 'PROVIDER_NOT_CONFIGURED';
          return base;
        }
        var statusKey = CatalogCache.key(description.id, 'providerStatusV2', []);
        var cachedStatus = CatalogCache.get(statusKey);
        if (cachedStatus) return cachedStatus;
        try {
          var provider = CatalogProviderRegistry.get(description.id);
          var result = provider.getFilterSummary();
          base.available = true;
          base.totalCards = Number(result.totalCards || 0);
          base.filterSummary = result.filters;
        } catch (error) {
          base.errorCode = error.code || 'HEALTH_ERROR';
        }
        base.latencyMs = Date.now() - started;
        base.checkedAt = new Date().toISOString();
        CatalogCache.put(statusKey, base, 900);
        return base;
      });
    },
  };
})();
