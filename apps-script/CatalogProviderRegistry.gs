var CatalogProviderRegistry = (function () {
  function providers() {
    return {
      ARJUNKAI_OPTCG: new ArjunkaiOptcgProvider(),
      OPTCG_API: new OptcgApiProvider()
    };
  }
  function get(id) {
    var provider = providers()[id];
    if (!provider) throw CatalogError.functional('UNKNOWN_PROVIDER', 'Proveedor no registrado.');
    return provider;
  }
  function describe() {
    return Object.keys(providers()).map(function (id) {
      var provider = get(id);
      return {
        id: id,
        name: provider.getProviderInfo().name,
        documentationUrl: provider.getProviderInfo().documentationUrl,
        enabled: provider.isEnabled(),
        configured: provider.isConfigured(),
        capabilities: provider.getCapabilities()
      };
    });
  }
  return { get: get, describe: describe };
})();
