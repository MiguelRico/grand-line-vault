var LoggerService = {
  error: function (event, error, requestId) {
    console.error(JSON.stringify({
      event: event, requestId: requestId, code: error && error.code,
      message: error && error.message, timestamp: new Date().toISOString()
    }));
  },
  info: function (event, data) {
    console.log(JSON.stringify({ event: event, data: data, timestamp: new Date().toISOString() }));
  }
};
