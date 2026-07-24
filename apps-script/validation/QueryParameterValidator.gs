var QueryParameterValidator = {
  validate: function (params) {
    ['page', 'pageSize', 'minCost', 'maxCost', 'minPower', 'maxPower', 'minPrice', 'maxPrice'].forEach(function (key) {
      if (params[key] !== undefined && params[key] !== '' && !isFinite(Number(params[key])))
        throw CatalogError.functional('INVALID_PARAMETER', key + ' debe ser numérico.');
    });
  },
  criteria: function (params) {
    var max = Config.number('CATALOG_MAX_PAGE_SIZE');
    return {
      query: String(params.query || '').trim().slice(0, 100),
      set: String(params.set || '').trim(), color: String(params.color || '').trim(),
      type: String(params.type || '').trim(), rarity: String(params.rarity || '').trim(),
      variant: String(params.variant || '').trim(),
      minCost: optionalNumber(params.minCost), maxCost: optionalNumber(params.maxCost),
      minPower: optionalNumber(params.minPower), maxPower: optionalNumber(params.maxPower),
      minPrice: optionalNumber(params.minPrice), maxPrice: optionalNumber(params.maxPrice),
      sort: ['name', 'price', 'power', 'cost', 'id', 'code'].indexOf(params.sort) >= 0 ? params.sort : 'name',
      direction: params.direction === 'desc' ? 'desc' : 'asc',
      page: Math.max(1, Number(params.page || 1)),
      pageSize: Math.min(max, Math.max(1, Number(params.pageSize || Config.number('CATALOG_DEFAULT_PAGE_SIZE'))))
    };
  }
};
function optionalNumber(value) { return value === undefined || value === '' ? undefined : Number(value); }
