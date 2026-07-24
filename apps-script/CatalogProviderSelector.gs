var CatalogProviderSelector = {
  select: function (operation) {
    var ids = [Config.get('CATALOG_PRIMARY_PROVIDER')].concat(Config.list('CATALOG_FALLBACK_PROVIDERS'));
    return ids.filter(function (id, index) {
      if (ids.indexOf(id) !== index) return false;
      var provider = CatalogProviderRegistry.get(id);
      if (!provider.isEnabled() || !provider.isConfigured()) return false;
      if (CircuitBreaker.state(id) === 'OPEN') return false;
      return provider.supports(operation);
    }).map(function (id) { return CatalogProviderRegistry.get(id); });
  }
};
