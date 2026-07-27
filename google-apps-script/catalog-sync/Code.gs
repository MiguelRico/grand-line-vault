/**
 * Sincronizador independiente TCGGO -> Firestore.
 *
 * Script Properties requeridas:
 * TCGGO_API_KEY, TCGGO_API_BASE_URL, FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
 */
var PAGE_SIZE = 100;
var WRITE_BATCH_SIZE = 400;
var API_DELAY_MS = 150;

function syncCatalogIndex() {
  var cards = fetchAllCards_();
  var grouped = {};
  cards.forEach(function (card) {
    var number = normalize_(card.card_number);
    if (!number) return;
    if (!grouped[number]) grouped[number] = [];
    grouped[number].push(card);
  });

  var writes = [];
  var sets = {};
  Object.keys(grouped).forEach(function (number) {
    var prints = grouped[number];
    var base = prints.filter(function (card) { return !card.version; })[0] || prints[0];
    var document = catalogDocument_(base, prints);
    writes.push(firestoreWrite_('catalogIndex', document.id, document));
    if (base.episode && base.episode.id !== undefined) {
      var setDocument = setDocument_(base.episode);
      sets[setDocument.id] = setDocument;
    }
  });
  Object.keys(sets).forEach(function (id) {
    writes.push(firestoreWrite_('catalogSets', id, sets[id]));
  });

  for (var index = 0; index < writes.length; index += WRITE_BATCH_SIZE) {
    firestoreBatchWrite_(writes.slice(index, index + WRITE_BATCH_SIZE));
  }
  console.log('Sincronizadas ' + Object.keys(grouped).length + ' cartas y ' +
    Object.keys(sets).length + ' expansiones.');
}

function installDailyCatalogSync() {
  ScriptApp.getProjectTriggers()
    .filter(function (trigger) { return trigger.getHandlerFunction() === 'syncCatalogIndex'; })
    .forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('syncCatalogIndex').timeBased().everyDays(1).atHour(4).create();
}

function fetchAllCards_() {
  var cards = [];
  var page = 1;
  while (true) {
    var payload = tcggoFetch_('/cards?page=' + page + '&per_page=' + PAGE_SIZE);
    var batch = payload.data || [];
    cards = cards.concat(batch);
    var total = payload.paging && payload.paging.total;
    if (!batch.length || batch.length < PAGE_SIZE || (total && cards.length >= total)) break;
    page += 1;
  }
  return cards;
}

function tcggoFetch_(path) {
  var properties = PropertiesService.getScriptProperties();
  var base = properties.getProperty('TCGGO_API_BASE_URL') ||
    'https://one-piece-tcg-prices.p.rapidapi.com';
  var key = properties.getProperty('TCGGO_API_KEY');
  if (!key) throw new Error('Falta TCGGO_API_KEY.');
  for (var attempt = 0; attempt < 3; attempt += 1) {
    Utilities.sleep(API_DELAY_MS * Math.pow(2, attempt));
    var url = base.replace(/\/$/, '') + path;
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: 'application/json',
        'x-rapidapi-key': key,
        'x-rapidapi-host': url.replace(/^https?:\/\//, '').split('/')[0]
      }
    });
    var status = response.getResponseCode();
    if (status >= 200 && status < 300) return JSON.parse(response.getContentText());
    if (status !== 429 && status < 500) break;
  }
  throw new Error('TCGGO no pudo completar ' + path + '.');
}

function catalogDocument_(card, prints) {
  var episode = setDocument_(card.episode || {});
  var colors = String(card.color || '').split(/[/,&+-]/).map(normalize_).filter(Boolean);
  var variants = prints.map(function (print) {
    return print.version ? inferVariant_(print.version) : 'BASE';
  }).filter(function (value, index, values) { return values.indexOf(value) === index; });
  var id = 'TCGGO::' + card.id;
  return {
    id: id,
    tcggoId: String(card.id),
    name: String(card.name || ''),
    card_number: String(card.card_number || ''),
    normalized_card_number: normalize_(card.card_number).replace(/\s/g, ''),
    image: String(card.image || ''),
    episode: episode,
    rarity: normalize_(card.rarity),
    rarity_normalized: normalizeRarity_(card.rarity),
    color: card.color || null,
    artist: card.artist && card.artist.name ? {
      id: String(card.artist.id || normalize_(card.artist.name)),
      name: String(card.artist.name),
      slug: String(card.artist.slug || '')
    } : null,
    game: {
      card_type: normalizeCardType_(card),
      colors: colors,
      cost: finiteOrNull_(card.cost),
      power: finiteOrNull_(card.power),
      attributes: array_(card.attributes || card.attribute)
    },
    variantTypes: variants,
    totalVariants: prints.length,
    filterColors: booleanMap_(colors),
    filterVariants: booleanMap_(variants),
    filterCostRanges: rangeMap_(finiteOrNull_(card.cost), 20, 1),
    filterPowerRanges: rangeMap_(finiteOrNull_(card.power), 20000, 1000),
    searchPrefixes: prefixes_(String(card.name || '') + ' ' + String(card.card_number || '')),
    sort: {
      cardNumber: normalize_(card.card_number),
      name: normalize_(card.name),
      cost: finiteOrNull_(card.cost) || -1,
      power: finiteOrNull_(card.power) || -1
    },
    source: {
      providerId: 'FIRESTORE_INDEX',
      providerCardId: String(card.id),
      fetchedAt: new Date().toISOString()
    },
    syncedAt: new Date().toISOString()
  };
}

function setDocument_(episode) {
  return {
    id: String(episode.id || normalize_(episode.code)),
    name: String(episode.name || episode.code || 'Sin expansión'),
    slug: String(episode.slug || ''),
    code: String(episode.code || ''),
    normalized_code: normalize_(episode.code),
    released_at: episode.released_at || '',
    logo: episode.logo || ''
  };
}

function prefixes_(value) {
  var tokens = normalize_(value).split(/\s+/).filter(Boolean);
  var prefixes = {};
  tokens.forEach(function (token) {
    for (var length = 1; length <= Math.min(token.length, 24); length += 1) {
      prefixes[token.substring(0, length)] = true;
    }
  });
  var full = normalize_(value);
  for (var size = 1; size <= Math.min(full.length, 40); size += 1) {
    prefixes[full.substring(0, size)] = true;
  }
  return Object.keys(prefixes).slice(0, 200);
}

function normalize_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toUpperCase().replace(/\s+/g, ' ');
}

function inferVariant_(version) {
  var value = normalize_(version);
  if (value.indexOf('MANGA') >= 0) return 'MANGA';
  if (value.indexOf('PROMO') >= 0) return 'PROMO';
  if (value.indexOf('REPRINT') >= 0) return 'REPRINT';
  return 'PARALLEL';
}

function normalizeCardType_(card) {
  var type = normalize_(card.card_type || card.category || card.type);
  if (['LEADER', 'CHARACTER', 'EVENT', 'STAGE', 'DON'].indexOf(type) >= 0) return type;
  return normalize_(card.rarity).indexOf('LEADER') >= 0 ? 'LEADER' : 'UNKNOWN';
}

function normalizeRarity_(rarity) {
  var value = normalize_(rarity);
  var map = { C: 'COMMON', COMMON: 'COMMON', UC: 'UNCOMMON', UNCOMMON: 'UNCOMMON',
    R: 'RARE', RARE: 'RARE', SR: 'SUPER_RARE', 'SUPER RARE': 'SUPER_RARE',
    SEC: 'SECRET_RARE', 'SECRET RARE': 'SECRET_RARE', L: 'LEADER', LEADER: 'LEADER',
    P: 'PROMO', PR: 'PROMO', PROMO: 'PROMO', TR: 'TREASURE_RARE',
    'TREASURE RARE': 'TREASURE_RARE', SPECIAL: 'SPECIAL', 'SP CARD': 'SPECIAL' };
  return map[value] || 'UNKNOWN';
}

function booleanMap_(values) {
  var result = {};
  values.forEach(function (value) { result[value] = true; });
  return result;
}

function rangeMap_(value, maximum, step) {
  var result = {};
  if (value === null) return result;
  for (var minimum = 0; minimum <= value; minimum += step) {
    for (var maximumValue = value; maximumValue <= maximum; maximumValue += step) {
      result[minimum + '_' + maximumValue] = true;
    }
  }
  return result;
}

function array_(value) {
  if (Array.isArray(value)) return value.map(String);
  return value ? String(value).split(/[,/]/).map(function (entry) { return entry.trim(); }) : [];
}

function finiteOrNull_(value) {
  var number = Number(value);
  return isFinite(number) ? number : null;
}

function firestoreWrite_(collection, id, fields) {
  var project = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  return {
    update: {
      name: 'projects/' + project + '/databases/(default)/documents/' +
        collection + '/' + encodeURIComponent(id),
      fields: firestoreFields_(fields)
    }
  };
}

function firestoreBatchWrite_(writes) {
  var project = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  var response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + project +
      '/databases/(default)/documents:batchWrite',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + serviceAccountToken_() },
      payload: JSON.stringify({ writes: writes }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() >= 300) throw new Error(response.getContentText());
}

function firestoreFields_(object) {
  var result = {};
  Object.keys(object).forEach(function (key) { result[key] = firestoreValue_(object[key]); });
  return result;
}

function firestoreValue_(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue_) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'object') return { mapValue: { fields: firestoreFields_(value) } };
  return { stringValue: String(value) };
}

function serviceAccountToken_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('firestore-token');
  if (cached) return cached;
  var properties = PropertiesService.getScriptProperties();
  var now = Math.floor(Date.now() / 1000);
  var header = webSafeBase64_(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var claim = webSafeBase64_(JSON.stringify({
    iss: properties.getProperty('FIREBASE_CLIENT_EMAIL'),
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  var unsigned = header + '.' + claim;
  var signature = Utilities.computeRsaSha256Signature(
    unsigned,
    properties.getProperty('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n')
  );
  var assertion = unsigned + '.' + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion
    }
  });
  var token = JSON.parse(response.getContentText()).access_token;
  cache.put('firestore-token', token, 3300);
  return token;
}

function webSafeBase64_(value) {
  return Utilities.base64EncodeWebSafe(value).replace(/=+$/, '');
}
