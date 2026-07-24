function OptcgApiProvider() { this.client = new OptcgApiClient(); }
OptcgApiProvider.prototype.getProviderInfo = function () {
  return { id: 'OPTCG_API', name: 'OPTCG API', baseUrl: Config.get('OPTCG_API_BASE_URL'), documentationUrl: 'https://optcgapi.com/documentation' };
};
OptcgApiProvider.prototype.getCapabilities = function () { return ProviderCapabilities.OPTCG_API; };
OptcgApiProvider.prototype.isEnabled = function () { return Config.bool('OPTCG_API_ENABLED'); };
OptcgApiProvider.prototype.isConfigured = function () { return Boolean(Config.get('OPTCG_API_BASE_URL')); };
OptcgApiProvider.prototype.supports = function (operation) {
  return ['search', 'getCard', 'getSets'].indexOf(operation) >= 0;
};
OptcgApiProvider.prototype.search = function (criteria) {
  var filters = {
    card_name: criteria.query, set_id: criteria.set,
    card_color: titleCase(criteria.color), card_type: titleCase(criteria.type),
    rarity: criteria.rarity, card_cost_min: criteria.minCost, card_cost_max: criteria.maxCost,
    card_power_min: criteria.minPower, card_power_max: criteria.maxPower
  };
  var hasFilters = Object.keys(filters).some(function (key) {
    return filters[key] !== undefined && filters[key] !== null && filters[key] !== '';
  });
  var response = this.client.get(hasFilters ? '/sets/filtered/' : '/allSetCards/', hasFilters ? filters : {});
  var rows = response && Array.isArray(response.body) ? response.body : [];
  var cards = OptcgApiCardMapper.mapMany(rows);
  cards = NormalizedFilter.apply(cards, criteria);
  var sorted = NormalizedFilter.sort(cards, criteria.sort, criteria.direction);
  var start = (criteria.page - 1) * criteria.pageSize;
  return { items: sorted.slice(start, start + criteria.pageSize), page: criteria.page, pageSize: criteria.pageSize, total: sorted.length };
};
OptcgApiProvider.prototype.getCard = function (criteria) {
  var code = String(criteria.code || criteria.id || '').replace(/^BASE::/, '');
  var response = this.client.get('/sets/card/' + encodeURIComponent(code) + '/', {});
  var cards = OptcgApiCardMapper.mapMany(response && response.body ? response.body : []);
  return cards[0] || null;
};
OptcgApiProvider.prototype.getSets = function () {
  var response = this.client.get('/allSets/', {});
  return (response.body || []).map(function (set) { return { code: set.set_id, name: set.set_name }; });
};
OptcgApiProvider.prototype.healthCheck = function () {
  return Boolean(this.client.get('/allSets/', {}));
};
