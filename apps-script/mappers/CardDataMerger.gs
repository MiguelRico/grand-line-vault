var CardDataMerger = {
  merge: function (preferred, enrichment) {
    var merged = Object.assign({}, enrichment || {}, preferred || {});
    merged.variants = CardVariantResolver.merge(preferred.variants, enrichment.variants);
    merged.prices = (preferred.prices || []).concat(enrichment.prices || []);
    merged.sources = (preferred.sources || []).concat(enrichment.sources || []);
    return merged;
  }
};
