(function () {
  var F = window.FPEM;
  var state = F.state;
  var B = F.B, CELL = F.CELL, CORR_W = F.CORR_W, T = F.T, WALL_W = F.WALL_W;
  F.rebuildMapGrid = function (newSize) {
    state.MAP = newSize;
    state.MAP_PX = state.MAP * T;
    var minBorder = B;
    var maxCols = Math.floor((state.MAP - 2 * minBorder - WALL_W) / CELL);
    var actualGridWidth = maxCols * CELL + WALL_W;
    var extraSpace = (state.MAP - 2 * minBorder) - actualGridWidth;
    var baseExtra = Math.floor(extraSpace / maxCols);
    var remainder = extraSpace % maxCols;
    state.hLines = [];
    state.vLines = [];
    var p = minBorder;
    for (var i = 0; i <= maxCols; i++) {
      state.hLines.push(p);
      state.vLines.push(p);
      var currentCellWidth = CELL + baseExtra + (i < remainder ? 1 : 0);
      p += currentCellWidth;
    }
    state.rows = state.hLines.length - 1;
    state.cols = state.vLines.length - 1;
    state.map = new Uint8Array(state.MAP * state.MAP);
  };
  F.getTargetDeadEnds = function (mapSz) {
    var gridSize = Math.floor((mapSz - 2 * B - WALL_W) / CELL);
    return Math.max(3, Math.round(3 * gridSize * gridSize / 49));
  };
  F.rebuildMapGrid(100);
})();
