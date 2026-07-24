var CatalogCache = {
  key: function (provider, operation, args) {
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(args || []));
    var hash = Utilities.base64EncodeWebSafe(digest).slice(0, 32);
    return ['catalog', Config.get('CATALOG_CACHE_SCHEMA_VERSION'), provider, operation, hash].join(':');
  },
  get: function (key) {
    if (!Config.bool('CATALOG_CACHE_ENABLED')) return null;
    var value = CacheService.getScriptCache().get(key);
    return value ? JSON.parse(value) : null;
  },
  put: function (key, value, ttl) {
    if (!Config.bool('CATALOG_CACHE_ENABLED')) return;
    var serialized = JSON.stringify(value);
    if (serialized.length < 95000) CacheService.getScriptCache().put(key, serialized, ttl);
  },
  ttl: function (operation) {
    if (operation === 'getSets') return Config.number('CATALOG_SETS_CACHE_TTL_SECONDS');
    if (operation === 'getCard') return Config.number('CATALOG_CARD_CACHE_TTL_SECONDS');
    return Config.number('CATALOG_SEARCH_CACHE_TTL_SECONDS');
  }
};
