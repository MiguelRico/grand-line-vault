var Router = {
  route: function (params, requestId) {
    QueryParameterValidator.validate(params);
    var resource = params.resource || 'metadata';
    var result;
    if (resource === 'cards') result = CatalogService.search(QueryParameterValidator.criteria(params), params.provider);
    else if (resource === 'card') result = CatalogService.getCard({ id: params.id, code: params.code }, params.provider);
    else if (resource === 'sets') result = CatalogService.getSets(params.provider);
    else if (resource === 'metadata') result = { data: CatalogService.metadata(), meta: {} };
    else if (resource === 'providers') result = { data: CatalogService.providers(), meta: {} };
    else if (resource === 'health') result = { data: CatalogService.health(params.provider), meta: {} };
    else if (resource === 'provider-statuses') result = { data: CatalogService.providerStatuses(), meta: {} };
    else throw CatalogError.functional('UNKNOWN_RESOURCE', 'Recurso desconocido.', 404);
    return ResponseFactory.success(result.data, Object.assign({}, result.meta, {
      requestId: requestId, timestamp: new Date().toISOString()
    }));
  }
};
