(function () {
  var F = window.FPEM;
  var state = F.state;
  F.rng = function () {
    state.seed ^= state.seed << 13;
    state.seed ^= state.seed >> 17;
    state.seed ^= state.seed << 5;
    return (state.seed >>> 0) / 4294967296;
  };
  F.rngInt = function (n) {
    return Math.floor(F.rng() * n);
  };
})();
