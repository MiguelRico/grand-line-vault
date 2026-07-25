function ArjunkaiOptcgProvider() {
  this.client = new ArjunkaiOptcgClient();
}
ArjunkaiOptcgProvider.prototype.getProviderInfo = function () {
  return {
    id: 'ARJUNKAI_OPTCG',
    name: 'Arjunkai OPTCG',
    baseUrl: Config.get('ARJUNKAI_API_BASE_URL'),
    documentationUrl: 'https://github.com/arjunkai/optcg-api',
  };
};
ArjunkaiOptcgProvider.prototype.getCapabilities = function () {
  return ProviderCapabilities.ARJUNKAI_OPTCG;
};
ArjunkaiOptcgProvider.prototype.isEnabled = function () {
  return Config.bool('ARJUNKAI_ENABLED');
};
ArjunkaiOptcgProvider.prototype.isConfigured = function () {
  return (
    Boolean(Config.get('ARJUNKAI_API_BASE_URL')) &&
    (Boolean(Config.get('ARJUNKAI_API_KEY')) || Config.bool('ARJUNKAI_ALLOW_UNAUTHENTICATED'))
  );
};
ArjunkaiOptcgProvider.prototype.supports = function (operation) {
  return ['search', 'getCard', 'getSets'].indexOf(operation) >= 0;
};
ArjunkaiOptcgProvider.prototype.search = function (criteria) {
  var response = this.client.get('/cards', {
    name: criteria.query,
    set_id: criteria.set,
    color: titleCase(criteria.color),
    category: titleCase(criteria.type),
    rarity: arjunkaiRarity(criteria.rarity),
    parallel:
      criteria.variant === 'BASE' ? false : criteria.variant === 'PARALLEL' ? true : undefined,
    variant_type:
      criteria.variant && ['BASE', 'PARALLEL'].indexOf(criteria.variant) < 0
        ? String(criteria.variant).toLowerCase()
        : '',
    min_cost: criteria.minCost,
    max_cost: criteria.maxCost,
    min_power: criteria.minPower,
    max_power: criteria.maxPower,
    min_price: criteria.minPrice,
    max_price: criteria.maxPrice,
    sort: criteria.sort,
    order: criteria.direction,
    page: criteria.page,
    page_size: criteria.pageSize,
  });
  var payload = response && response.body;
  var rows = Array.isArray(payload) ? payload : payload.cards || payload.data || [];
  var cards = rows.map(ArjunkaiCardMapper.map);
  return {
    items: cards,
    page: criteria.page,
    pageSize: criteria.pageSize,
    total: Number(payload.total || payload.count || cards.length),
  };
};
ArjunkaiOptcgProvider.prototype.getCard = function (criteria) {
  var externalId = String(criteria.id || criteria.code || '').replace(/^BASE::/, '');
  var response = this.client.get('/cards/' + encodeURIComponent(externalId), {});
  return response && response.body ? ArjunkaiCardMapper.map(response.body) : null;
};
ArjunkaiOptcgProvider.prototype.getSets = function () {
  var response = this.client.get('/sets', {});
  return (response.body.sets || response.body.data || response.body || []).map(function (set) {
    return { code: set.id, name: set.label || set.name || set.id };
  });
};
ArjunkaiOptcgProvider.prototype.healthCheck = function () {
  var response = this.client.get('/sets', {});
  return Boolean(response);
};
ArjunkaiOptcgProvider.prototype.getFilterSummary = function () {
  var response = this.client.get('/cards/all', {});
  var payload = response && response.body;
  var rows = Array.isArray(payload) ? payload : payload.cards || payload.data || [];
  var grouped = {};
  rows.forEach(function (raw) {
    var card = ArjunkaiCardMapper.map(raw);
    if (!grouped[card.id]) grouped[card.id] = card;
    else if (raw.parallel) grouped[card.id] = CardDataMerger.merge(grouped[card.id], card);
    else grouped[card.id] = CardDataMerger.merge(card, grouped[card.id]);
  });
  return CatalogFilterSummary.fromCards(
    Object.keys(grouped).map(function (id) {
      return grouped[id];
    }),
  );
};

function titleCase(value) {
  if (!value) return '';
  var lower = String(value).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function arjunkaiRarity(value) {
  var map = {
    L: 'Leader',
    C: 'Common',
    UC: 'Uncommon',
    R: 'Rare',
    SR: 'SuperRare',
    SEC: 'SecretRare',
    PR: 'Promo',
    TR: 'TreasureRare',
  };
  return map[String(value || '').toUpperCase()] || value;
}
