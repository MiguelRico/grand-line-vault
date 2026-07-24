var OptcgApiCardMapper = {
  mapMany: function (rows) {
    var grouped = {};
    (rows || []).forEach(function (raw) {
      if (!raw.card_set_id || !raw.card_name || !raw.card_image) return;
      var code = raw.card_set_id;
      var id = CardIdentityResolver.baseId(code);
      var source = { providerId: 'OPTCG_API', providerCardId: raw.card_image_id, fetchedAt: new Date().toISOString() };
      var price = raw.market_price === null || raw.market_price === undefined ? [] : [{
        amount: Number(raw.market_price), currency: 'USD', source: 'optcgapi',
        updatedAt: raw.date_scraped ? new Date(raw.date_scraped + 'T00:00:00Z').toISOString() : undefined,
        marketType: 'MARKET'
      }];
      var isVariant = raw.card_image_id !== code;
      if (!grouped[id]) {
        grouped[id] = {
          id: id, code: code, name: String(raw.card_name).replace(/\s*\(\d+\)(?:\s*\(Parallel\))?$/, ''),
          description: raw.card_text || undefined, type: normalizeType(raw.card_type),
          colors: String(raw.card_color || '').split('/').filter(Boolean).map(normalizeColor),
          rarity: raw.rarity || undefined, set: { code: raw.set_id, name: raw.set_name },
          cost: numberOrUndefined(raw.card_cost), power: numberOrUndefined(raw.card_power),
          counter: numberOrUndefined(raw.counter_amount), life: numberOrUndefined(raw.life),
          attributes: raw.attribute ? [raw.attribute] : [],
          traits: raw.sub_types ? [raw.sub_types] : [], effect: raw.card_text || undefined,
          language: 'EN', imageUrl: raw.card_image, variants: [], prices: price, sources: [source]
        };
      }
      if (isVariant) grouped[id].variants.push({
        id: CardIdentityResolver.variantId(code, raw.card_image_id), baseCardId: id,
        type: 'PARALLEL', label: 'Parallel', imageUrl: raw.card_image,
        language: 'EN', prices: price, sources: [source]
      });
    });
    return Object.keys(grouped).map(function (key) { return grouped[key]; });
  }
};

function numberOrUndefined(value) {
  return value === null || value === undefined || value === '' ? undefined : Number(value);
}
function normalizeType(value) {
  var map = { leader: 'LEADER', character: 'CHARACTER', event: 'EVENT', stage: 'STAGE', don: 'DON', 'don!!': 'DON' };
  return map[String(value || '').toLowerCase()] || 'CHARACTER';
}
function normalizeColor(value) {
  var normalized = String(value || '').toUpperCase();
  return ['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'].indexOf(normalized) >= 0 ? normalized : 'BLACK';
}
function normalizeVariant(value) {
  var map = { alt_art: 'ALTERNATE_ART', reprint: 'REPRINT', manga: 'MANGA', serial: 'SERIAL' };
  return map[String(value || '').toLowerCase()] || 'PARALLEL';
}
