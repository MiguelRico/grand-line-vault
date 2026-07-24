var RetryPolicy = {
  execute: function (operation) {
    var retries = Config.number('HTTP_MAX_RETRIES');
    var base = Config.number('HTTP_RETRY_BASE_DELAY_MS');
    var max = Config.number('HTTP_RETRY_MAX_DELAY_MS');
    for (var attempt = 0; attempt <= retries; attempt += 1) {
      try { return operation(); }
      catch (error) {
        if (!error.retryable || attempt >= retries) throw error;
        Utilities.sleep(Math.min(max, base * Math.pow(2, attempt)));
      }
    }
  }
};
