var HttpClient = {
  getJson: function (url, headers) {
    return RetryPolicy.execute(function () {
      var started = Date.now();
      var response;
      try {
        response = UrlFetchApp.fetch(url, {
          method: 'get',
          headers: headers || {},
          muteHttpExceptions: true,
          followRedirects: true
        });
      } catch (error) {
        throw CatalogError.retryable('NETWORK_ERROR', 'Error temporal de conexión.');
      }
      var status = response.getResponseCode();
      if ([429, 500, 502, 503, 504].indexOf(status) >= 0)
        throw CatalogError.retryable('UPSTREAM_' + status, 'Proveedor temporalmente no disponible.', status);
      if (status === 401 || status === 403)
        throw CatalogError.functional('PROVIDER_AUTH', 'Configuración de autenticación del proveedor inválida.', status);
      if (status === 404) return null;
      if (status < 200 || status >= 300)
        throw CatalogError.functional('UPSTREAM_' + status, 'Respuesta no válida del proveedor.', status);
      try {
        return { body: JSON.parse(response.getContentText()), latencyMs: Date.now() - started };
      } catch (error) {
        throw CatalogError.retryable('INVALID_PROVIDER_JSON', 'El proveedor devolvió JSON inválido.');
      }
    });
  }
};
