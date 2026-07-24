var ErrorHandler = {
  toResponse: function (error, requestId) {
    return ResponseFactory.error({
      code: error.code || 'INTERNAL_ERROR',
      message: error.code ? error.message : 'Se ha producido un error inesperado.',
      retryable: Boolean(error.retryable)
    }, { requestId: requestId, timestamp: new Date().toISOString() });
  }
};
