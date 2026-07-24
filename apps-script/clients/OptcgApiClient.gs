function OptcgApiClient() {
  this.baseUrl = String(Config.get('OPTCG_API_BASE_URL')).replace(/\/$/, '');
}
OptcgApiClient.prototype.headers = function () {
  var headers = {};
  var apiKey = Config.get('OPTCG_API_KEY');
  if (apiKey) headers[Config.get('OPTCG_API_KEY_HEADER') || 'X-API-Key'] = apiKey;
  return headers;
};
OptcgApiClient.prototype.get = function (path, params) {
  var query = Object.keys(params || {}).filter(function (key) {
    return params[key] !== undefined && params[key] !== null && params[key] !== '';
  }).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
  return HttpClient.getJson(this.baseUrl + path + (query ? '?' + query : ''), this.headers());
};
