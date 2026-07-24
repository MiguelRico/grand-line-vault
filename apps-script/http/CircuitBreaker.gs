var CircuitBreaker = (function () {
  function key(id) { return 'circuit:' + id; }
  function read(id) {
    var raw = CacheService.getScriptCache().get(key(id));
    return raw ? JSON.parse(raw) : { state: 'CLOSED', failures: 0, openedAt: 0 };
  }
  function write(id, value, seconds) {
    CacheService.getScriptCache().put(key(id), JSON.stringify(value), seconds || 21600);
  }
  function state(id) {
    var current = read(id);
    if (current.state === 'OPEN' && Date.now() - current.openedAt > Config.number('PROVIDER_CIRCUIT_OPEN_SECONDS') * 1000) {
      current.state = 'HALF_OPEN'; write(id, current); return 'HALF_OPEN';
    }
    return current.state;
  }
  function success(id) { write(id, { state: 'CLOSED', failures: 0, openedAt: 0 }); }
  function failure(id) {
    var current = read(id);
    current.failures += 1;
    if (current.failures >= Config.number('PROVIDER_FAILURE_THRESHOLD')) {
      current.state = 'OPEN'; current.openedAt = Date.now();
    }
    write(id, current);
  }
  return { state: state, success: success, failure: failure };
})();
