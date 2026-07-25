var CatalogFilterSummary = {
  fromCards: function (cards) {
    var dimensions = {
      sets: {},
      colors: {},
      types: {},
      rarities: {},
      variants: {},
      costs: {},
      powers: {},
    };

    function increment(dimension, value, label) {
      if (value === undefined || value === null || value === '') return;
      var key = String(value);
      if (!dimension[key]) dimension[key] = { value: key, label: label, count: 0 };
      dimension[key].count += 1;
    }

    (cards || []).forEach(function (card) {
      increment(dimensions.sets, card.set.code, card.set.name);
      (card.colors || []).forEach(function (color) {
        increment(dimensions.colors, color);
      });
      increment(dimensions.types, card.type);
      increment(dimensions.rarities, card.rarity);
      increment(dimensions.variants, 'BASE');
      if ((card.variants || []).length) increment(dimensions.variants, 'PARALLEL');
      if (card.cost !== undefined) increment(dimensions.costs, card.cost);
      if (card.power !== undefined) increment(dimensions.powers, card.power);
    });

    function buckets(dimension, numeric) {
      return Object.keys(dimension)
        .map(function (key) {
          return dimension[key];
        })
        .sort(function (left, right) {
          return numeric
            ? Number(left.value) - Number(right.value)
            : String(left.value).localeCompare(String(right.value));
        });
    }

    return {
      totalCards: (cards || []).length,
      filters: {
        sets: buckets(dimensions.sets, false),
        colors: buckets(dimensions.colors, false),
        types: buckets(dimensions.types, false),
        rarities: buckets(dimensions.rarities, false),
        variants: buckets(dimensions.variants, false),
        costs: buckets(dimensions.costs, true),
        powers: buckets(dimensions.powers, true),
      },
    };
  },
};
