var CardVariantResolver = {
  merge: function (left, right) {
    var seen = {};
    return (left || []).concat(right || []).filter(function (variant) {
      if (seen[variant.id]) return false;
      seen[variant.id] = true; return true;
    });
  }
};
