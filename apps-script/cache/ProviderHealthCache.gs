var ProviderHealthCache = {
  get: function (id) {
    var value = CacheService.getScriptCache().get('health:' + id);
    return value ? JSON.parse(value) : null;
  },
  put: function (id, value) {
    CacheService.getScriptCache().put('health:' + id, JSON.stringify(value), Config.number('CATALOG_HEALTH_CACHE_TTL_SECONDS'));
  }
};
