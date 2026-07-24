var Config = (function () {
  var defaults = {
    CATALOG_PRIMARY_PROVIDER: 'ARJUNKAI_OPTCG',
    CATALOG_FALLBACK_PROVIDERS: 'OPTCG_API',
    CATALOG_PROVIDER_FALLBACK_ENABLED: 'true',
    ARJUNKAI_ENABLED: 'true',
    OPTCG_API_ENABLED: 'true',
    OPTCG_API_BASE_URL: 'https://optcgapi.com/api',
    CATALOG_CACHE_ENABLED: 'true',
    CATALOG_CACHE_SCHEMA_VERSION: 'v1',
    CATALOG_SEARCH_CACHE_TTL_SECONDS: '900',
    CATALOG_CARD_CACHE_TTL_SECONDS: '21600',
    CATALOG_SETS_CACHE_TTL_SECONDS: '86400',
    CATALOG_HEALTH_CACHE_TTL_SECONDS: '300',
    CATALOG_MAX_PAGE_SIZE: '100',
    CATALOG_DEFAULT_PAGE_SIZE: '24',
    HTTP_MAX_RETRIES: '2',
    HTTP_RETRY_BASE_DELAY_MS: '250',
    HTTP_RETRY_MAX_DELAY_MS: '1500',
    PROVIDER_FAILURE_THRESHOLD: '3',
    PROVIDER_CIRCUIT_OPEN_SECONDS: '120',
    APP_ALLOWED_ORIGIN: ''
  };

  function all() {
    var props = PropertiesService.getScriptProperties().getProperties();
    var result = {};
    Object.keys(defaults).forEach(function (key) {
      result[key] = Object.prototype.hasOwnProperty.call(props, key) ? props[key] : defaults[key];
    });
    Object.keys(props).forEach(function (key) { result[key] = props[key]; });
    return result;
  }

  function get(key) { return all()[key] || ''; }
  function bool(key) { return String(get(key)).toLowerCase() === 'true'; }
  function number(key) { return Number(get(key)); }
  function list(key) {
    return String(get(key)).split(',').map(function (v) { return v.trim(); }).filter(Boolean);
  }

  return { get: get, bool: bool, number: number, list: list, all: all };
})();
