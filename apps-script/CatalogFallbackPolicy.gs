var CatalogFallbackPolicy = {
  shouldFallback: function (error) {
    if (!Config.bool('CATALOG_PROVIDER_FALLBACK_ENABLED')) return false;
    return Boolean(error && error.retryable === true);
  }
};

var CatalogError = {
  retryable: function (code, message, status) {
    var error = new Error(message);
    error.code = code; error.status = status || 503; error.retryable = true;
    return error;
  },
  functional: function (code, message, status) {
    var error = new Error(message);
    error.code = code; error.status = status || 400; error.retryable = false;
    return error;
  }
};
