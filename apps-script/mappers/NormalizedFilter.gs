var NormalizedFilter = {
  apply: function (cards, criteria) {
    var query = String(criteria.query || '').toLowerCase();
    return cards.filter(function (card) {
      return (!query || card.name.toLowerCase().indexOf(query) >= 0 || card.code.toLowerCase().indexOf(query) >= 0) &&
        (!criteria.set || card.set.code === criteria.set) &&
        (!criteria.color || card.colors.indexOf(String(criteria.color).toUpperCase()) >= 0) &&
        (!criteria.type || card.type === String(criteria.type).toUpperCase()) &&
        (!criteria.rarity || card.rarity === criteria.rarity) &&
        (!criteria.variant || criteria.variant === 'BASE' ||
          card.variants.some(function (variant) { return variant.type === criteria.variant; })) &&
        (criteria.minCost === undefined || (card.cost || 0) >= criteria.minCost) &&
        (criteria.maxCost === undefined || (card.cost || 0) <= criteria.maxCost) &&
        (criteria.minPower === undefined || (card.power || 0) >= criteria.minPower) &&
        (criteria.maxPower === undefined || (card.power || 0) <= criteria.maxPower);
    });
  },
  sort: function (cards, field, direction) {
    var key = field === 'code' ? 'code' : field;
    return cards.slice().sort(function (a, b) {
      var av = key === 'price' ? ((a.prices[0] || {}).amount || 0) : (a[key] || 0);
      var bv = key === 'price' ? ((b.prices[0] || {}).amount || 0) : (b[key] || 0);
      var result = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return direction === 'desc' ? -result : result;
    });
  }
};
