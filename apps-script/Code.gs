function doGet(e) {
  var requestId = Utilities.getUuid();
  try {
    return Router.route(e && e.parameter ? e.parameter : {}, requestId);
  } catch (error) {
    LoggerService.error('catalog_request_failed', error, requestId);
    return ErrorHandler.toResponse(error, requestId);
  }
}
