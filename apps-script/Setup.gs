function setupScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    CATALOG_PRIMARY_PROVIDER: 'ARJUNKAI_OPTCG',
    CATALOG_FALLBACK_PROVIDERS: 'OPTCG_API',
    CATALOG_PROVIDER_FALLBACK_ENABLED: 'true',
    ARJUNKAI_API_BASE_URL: '',
    ARJUNKAI_API_KEY: '',
    ARJUNKAI_API_KEY_HEADER: 'X-API-Key',
    ARJUNKAI_ENABLED: 'true',
    ARJUNKAI_ALLOW_UNAUTHENTICATED: 'false',
    OPTCG_API_BASE_URL: 'https://optcgapi.com/api',
    OPTCG_API_KEY: '',
    OPTCG_API_KEY_HEADER: 'X-API-Key',
    OPTCG_API_ENABLED: 'true',
    CATALOG_CACHE_ENABLED: 'true',
    CATALOG_CACHE_SCHEMA_VERSION: 'v1',
    APP_ALLOWED_ORIGIN: ''
  }, false);
}

function clearCatalogCache() {
  CacheService.getScriptCache().removeAll([]);
  LoggerService.info('catalog_cache_clear_requested', {});
}
