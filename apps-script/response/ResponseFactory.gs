var ResponseFactory = {
  success: function (data, meta) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data, meta: meta }))
      .setMimeType(ContentService.MimeType.JSON);
  },
  error: function (error, meta) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error, meta: meta }))
      .setMimeType(ContentService.MimeType.JSON);
  }
};
