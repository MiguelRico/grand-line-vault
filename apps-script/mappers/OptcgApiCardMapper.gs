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
        updatedAt: isoDateOrUndefined(raw.date_scraped),
        marketType: 'MARKET'
      }];
      var isVariant = raw.card_image_id !== code;
      if (!grouped[id]) {
        grouped[id] = {
          id: id, code: code, name: String(raw.card_name).replace(/\s*\(\d+\)(?:\s*\(Parallel\))?$/, ''),
          description: raw.card_text || undefined, type: normalizeType(raw.card_type),
          colors: normalizeColors(raw.card_color),
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
function isoDateOrUndefined(value) {
  if (!value) return undefined;
  var text = String(value).trim();
  var isoDate = /^\d{4}-\d{2}-\d{2}$/.test(text);
  var usDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  var date = isoDate
    ? new Date(text + 'T00:00:00Z')
    : usDate
      ? new Date(Date.UTC(Number(usDate[3]), Number(usDate[1]) - 1, Number(usDate[2])))
      : new Date(text);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}
function normalizeType(value) {
  var map = { leader: 'LEADER', character: 'CHARACTER', event: 'EVENT', stage: 'STAGE', don: 'DON', 'don!!': 'DON' };
  return map[String(value || '').toLowerCase()] || 'CHARACTER';
}
function normalizeColor(value) {
  var normalized = String(value || '').toUpperCase();
  return ['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'].indexOf(normalized) >= 0 ? normalized : null;
}
function normalizeColors(value) {
  return String(value || '').split(/[\/,\s]+/).map(normalizeColor).filter(Boolean);
}
function normalizeVariant(value) {
  var map = { alt_art: 'ALTERNATE_ART', reprint: 'REPRINT', manga: 'MANGA', serial: 'SERIAL' };
  return map[String(value || '').toLowerCase()] || 'PARALLEL';
}
