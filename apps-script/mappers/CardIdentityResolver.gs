var CardIdentityResolver = {
  baseId: function (code) { return 'BASE::' + String(code).trim().toUpperCase(); },
  variantId: function (code, key) {
    return 'VARIANT::' + String(code).trim().toUpperCase() + '::' + String(key).trim().toUpperCase();
  }
};
