(function () {
  var F = window.FPEM;
  var state = F.state;
  var B = F.B, CORR_W = F.CORR_W, T = F.T, WALL_W = F.WALL_W;
  var ENEMY_VARIANTS = F.ENEMY_VARIANTS;
  F.getCornerPos = function (name) {
    var tlX = B + WALL_W + Math.floor(CORR_W / 2);
    var tlY = B + WALL_W + Math.floor(CORR_W / 2);
    var trX0 = state.vLines[state.cols - 1] + WALL_W;
    var trX1 = (state.cols < state.vLines.length) ? state.vLines[state.cols] : state.MAP - B;
    var trX = Math.floor((trX0 + trX1) / 2);
    var trY = tlY;
    var blY0 = state.hLines[state.rows - 1] + WALL_W;
    var blY1 = (state.rows < state.hLines.length) ? state.hLines[state.rows] : state.MAP - B;
    var blX = tlX;
    var blY = Math.floor((blY0 + blY1) / 2);
    var brX = trX;
    var brY = blY;
    switch (name) {
      case 'top-left': return { x: tlX, y: tlY };
      case 'top-right': return { x: trX, y: trY };
      case 'bottom-left': return { x: blX, y: blY };
      case 'bottom-right': return { x: brX, y: brY };
    }
  };
  F.chooseExitCorner = function (ms) {
    var s = ms;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    var roll = (s >>> 0) / 4294967296;
    if (roll < 0.50) return 'bottom-right';
    if (roll < 0.75) return 'bottom-left';
    return 'top-right';
  };
  F.chooseEnemyVariant = function (ms) {
    var s = ms * 2654435761 | 0;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    var roll = (s >>> 0) / 4294967296;
    var cumulative = 0;
    for (var i = 0; i < ENEMY_VARIANTS.length; i++) {
      var v = ENEMY_VARIANTS[i];
      cumulative += v.weight;
      if (roll < cumulative) return v;
    }
    return ENEMY_VARIANTS[ENEMY_VARIANTS.length - 1];
  };
  F.cellCenterPx = function (r, c) {
    var x0 = state.vLines[c] + WALL_W;
    var x1 = (c + 1 < state.vLines.length) ? state.vLines[c + 1] : state.MAP - B;
    var y0 = state.hLines[r] + WALL_W;
    var y1 = (r + 1 < state.hLines.length) ? state.hLines[r + 1] : state.MAP - B;
    return { x: ((x0 + x1) / 2) * T, y: ((y0 + y1) / 2) * T };
  };
  F.pxToCell = function (px, py) {
    var bestR = 0, bestC = 0, bestDist = Infinity;
    for (var r = 0; r < state.rows; r++) {
      for (var c = 0; c < state.cols; c++) {
        var ctr = F.cellCenterPx(r, c);
        var dx = px - ctr.x, dy = py - ctr.y;
        var d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestR = r; bestC = c; }
      }
    }
    return { r: bestR, c: bestC };
  };
  F.findDeadEnds = function () {
    var de = [];
    for (var r = 0; r < state.rows; r++) for (var c = 0; c < state.cols; c++)
      if (F.getCellOpenings(r, c).length === 1) de.push([r, c]);
    return de;
  };
})();
