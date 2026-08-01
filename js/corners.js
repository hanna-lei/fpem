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
    // Only teachers whose settings toggle is on are eligible to spawn. Each
    // eligible teacher gets an equal share of the roll: 1 enabled => that one
    // always spawns, 2 => 50/50, 3 => a third each. No teachers enabled => no
    // teacher spawns this round.
    var enabled = {
      'Miss Bloomie': state.teacherBloomie,
      'Miss Thavel': state.teacherThavel,
      'Miss Circle': state.teacherCircle
    };
    var pool = [];
    for (var i = 0; i < ENEMY_VARIANTS.length; i++) {
      if (enabled[ENEMY_VARIANTS[i].name]) pool.push(ENEMY_VARIANTS[i]);
    }
    if (pool.length === 0) return null;

    var s = ms * 2654435761 | 0;
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    var roll = (s >>> 0) / 4294967296;
    var idx = Math.floor(roll * pool.length);
    if (idx >= pool.length) idx = pool.length - 1;
    return pool[idx];
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
