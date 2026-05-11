(function () {
  var F = window.FPEM;
  var state = F.state;
  var T = F.T;

  F.isFloor = function (px, py) {
    var tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= state.MAP || ty >= state.MAP) return false;
    return state.map[ty * state.MAP + tx] === 1;
  };

  F.canMove = function (px, py, hw, hh) {
    return F.isFloor(px - hw, py - hh) && F.isFloor(px + hw, py - hh) &&
      F.isFloor(px - hw, py + hh) && F.isFloor(px + hw, py + hh) &&
      F.isFloor(px, py - hh) && F.isFloor(px, py + hh) &&
      F.isFloor(px - hw, py) && F.isFloor(px + hw, py);
  };

  F.hasLineOfSight = function (x1, y1, x2, y2, hw, hh) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return true;
    var step = dist < 4 * T ? T / 4 : T / 2;
    var steps = Math.max(4, Math.ceil(dist / step));
    for (var i = 1; i <= steps; i++) {
      var px = x1 + (dx / steps) * i;
      var py = y1 + (dy / steps) * i;
      if (!F.canMove(px, py, hw, hh)) return false;
    }
    return true;
  };

  F.recalcEnemyPath = function () {
    var eCell = F.pxToCell(state.enemy.x, state.enemy.y);
    var targetX = state.player.x, targetY = state.player.y;
    if (state.playerInLocker) {
      targetX = state.startTX * T;
      targetY = state.startTY * T;
    }
    var pCell = F.pxToCell(targetX, targetY);
    var path = F.bfsCellPath(eCell.r, eCell.c, pCell.r, pCell.c);

    if (path.length > 0) {
      path.push({ x: targetX, y: targetY });

      var hw = state.enemyVariant.w / 2, hh = state.enemyVariant.h / 2;

      var targetIdx = 0;
      if (path.length > 1 && F.hasLineOfSight(state.enemy.x, state.enemy.y, path[1].x, path[1].y, hw, hh)) {
        targetIdx = 1;
      }

      var MAX_SKIP = 3;
      var finalTargetIdx = targetIdx;

      for (var k = Math.min(path.length - 1, targetIdx + MAX_SKIP); k > targetIdx; k--) {
        if (F.hasLineOfSight(state.enemy.x, state.enemy.y, path[k].x, path[k].y, hw, hh)) {
          finalTargetIdx = k;
          break;
        }
      }

      state.enemyWaypoints = path;
      state.enemyWpIdx = finalTargetIdx;
    } else {
      state.enemyWaypoints = [{ x: targetX, y: targetY }];
      state.enemyWpIdx = 0;
    }
  };
})();
