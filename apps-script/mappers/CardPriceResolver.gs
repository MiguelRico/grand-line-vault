var CardPriceResolver = {
  preferred: function (prices) {
    var priorities = Config.list('PRICE_PROVIDER_PRIORITY');
    return (prices || []).slice().sort(function (a, b) {
      var ai = priorities.indexOf(a.source); var bi = priorities.indexOf(b.source);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    })[0] || null;
  }
};
