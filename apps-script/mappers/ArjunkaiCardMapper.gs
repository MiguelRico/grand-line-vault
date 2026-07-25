var ArjunkaiCardMapper = {
  map: function (raw) {
    if (!raw || !raw.id || !raw.name)
      throw CatalogError.retryable('INVALID_CARD', 'Carta incompleta del proveedor.');
    var code = String(raw.base_id || raw.id).split('_')[0];
    var source = {
      providerId: 'ARJUNKAI_OPTCG',
      providerCardId: raw.id,
      fetchedAt: new Date().toISOString(),
    };
    var price =
      raw.price === null || raw.price === undefined
        ? []
        : [
            {
              amount: Number(raw.price),
              currency: 'USD',
              source: raw.price_source || 'unknown',
              sourceProductId: raw.tcg_ids && raw.tcg_ids[0] ? String(raw.tcg_ids[0]) : undefined,
              updatedAt: raw.price_updated_at
                ? new Date(Number(raw.price_updated_at) * 1000).toISOString()
                : undefined,
              marketType: 'MARKET',
            },
          ];
    return {
      id: CardIdentityResolver.baseId(code),
      code: code,
      name: raw.name,
      description: raw.effect || undefined,
      type: normalizeType(raw.category),
      colors: (raw.colors || []).map(normalizeColor).filter(Boolean),
      rarity: normalizeArjunkaiRarity(raw.rarity),
      set: {
        code: raw.sets && raw.sets[0] ? raw.sets[0].id : 'UNKNOWN',
        name: raw.sets && raw.sets[0] ? raw.sets[0].label : 'Desconocida',
      },
      cost: numberOrUndefined(raw.cost),
      power: numberOrUndefined(raw.power),
      counter: numberOrUndefined(raw.counter),
      life: numberOrUndefined(raw.life),
      attributes: raw.attributes || [],
      traits: raw.types || [],
      effect: raw.effect || undefined,
      trigger: raw.trigger || undefined,
      language: String(raw.id).indexOf('_jp') >= 0 ? 'JP' : 'EN',
      imageUrl: raw.image_url,
      variants: raw.parallel
        ? [
            {
              id: CardIdentityResolver.variantId(code, raw.id),
              baseCardId: CardIdentityResolver.baseId(code),
              type: normalizeVariant(raw.variant_type),
              label: raw.variant_type || 'Parallel',
              imageUrl: raw.image_url,
              language: 'EN',
              prices: price,
              sources: [source],
            },
          ]
        : [],
      prices: price,
      sources: [source],
    };
  },
};

function normalizeArjunkaiRarity(value) {
  var map = {
    leader: 'L',
    common: 'C',
    uncommon: 'UC',
    rare: 'R',
    superrare: 'SR',
    secretrare: 'SEC',
    promo: 'PR',
    treasurerare: 'TR',
  };
  var normalized = String(value || '')
    .replace(/[\s_-]/g, '')
    .toLowerCase();
  return map[normalized] || value || undefined;
}
