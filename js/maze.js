(function () {
  var F = window.FPEM;
  var state = F.state;
  var B = F.B, CORR_W = F.CORR_W, DIRS = F.DIRS, T = F.T, WALL_W = F.WALL_W;

  F.bfsCellPath = function (fromR, fromC, toR, toC) {
    if (fromR === toR && fromC === toC) return [];
    var total = state.rows * state.cols;
    var vis = new Uint8Array(total);
    var prev = new Int32Array(total).fill(-1);
    var startId = fromR * state.cols + fromC;
    var endId = toR * state.cols + toC;
    vis[startId] = 1;
    var q = [startId]; var head = 0;
    while (head < q.length) {
      var id = q[head++];
      if (id === endId) {
        var path = [];
        var cur = endId;
        while (cur !== -1) {
          var pr = Math.floor(cur / state.cols), pc = cur % state.cols;
          path.push(F.cellCenterPx(pr, pc));
          cur = prev[cur];
        }
        path.reverse();
        return path;
      }
      var cr = Math.floor(id / state.cols), cc = id % state.cols;
      var openings = F.getCellOpenings(cr, cc);
      for (var oi = 0; oi < openings.length; oi++) {
        var op = openings[oi];
        var nid = op.nr * state.cols + op.nc;
        if (!vis[nid]) {
          vis[nid] = 1;
          prev[nid] = id;
          q.push(nid);
        }
      }
    }
    return [];
  };

  F.generateMaze = function (trySeed, targetDE) {
    state.seed = trySeed;
    state.hSegWall = Array.from({ length: state.hLines.length }, function () { return new Uint8Array(state.cols).fill(1); });
    state.vSegWall = Array.from({ length: state.rows }, function () { return new Uint8Array(state.vLines.length).fill(1); });
    state.map.fill(0);
    var visited = Array.from({ length: state.rows }, function () { return new Uint8Array(state.cols).fill(0); });
    visited[0][0] = 1;
    var frontier = [];
    function addFrontier(r, c) {
      for (var di = 0; di < DIRS.length; di++) {
        var dr = DIRS[di][0], dc = DIRS[di][1];
        var nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) continue;
        if (!visited[nr][nc]) frontier.push({ r: r, c: c, nr: nr, nc: nc });
      }
    }
    addFrontier(0, 0);
    while (frontier.length > 0) {
      var idx = F.rngInt(frontier.length);
      var wall = frontier[idx];
      frontier[idx] = frontier[frontier.length - 1];
      frontier.pop();
      if (visited[wall.nr][wall.nc]) continue;
      var dr = wall.nr - wall.r, dc = wall.nc - wall.c;
      if (dr === -1) state.hSegWall[wall.nr + 1][wall.nc] = 0;
      else if (dr === 1) state.hSegWall[wall.nr][wall.nc] = 0;
      else if (dc === -1) state.vSegWall[wall.nr][wall.nc + 1] = 0;
      else if (dc === 1) state.vSegWall[wall.nr][wall.nc] = 0;
      visited[wall.nr][wall.nc] = 1;
      addFrontier(wall.nr, wall.nc);
    }
    var iter;
    for (iter = 0; iter < 2000; iter++) {
      var de = F.findDeadEnds();
      if (de.length <= targetDE) break;
      var cands = de.filter(function (rc) { return !(rc[0] === 0 && rc[1] === 0); });
      if (cands.length === 0) break;
      var pick = cands[F.rngInt(cands.length)];
      var dr = pick[0], dc = pick[1];
      var walls = F.getClosedWalls(dr, dc);
      if (walls.length > 0) {
        var w = walls[F.rngInt(walls.length)];
        if (w.type === 'h') state.hSegWall[w.wr][w.wc] = 0;
        else state.vSegWall[w.wr][w.wc] = 0;
      }
    }
    var r, c, y, x, dy, dx, yy, xx;
    for (r = 0; r < state.rows; r++) {
      for (c = 0; c < state.cols; c++) {
        var x0 = state.vLines[c] + WALL_W;
        var y0 = state.hLines[r] + WALL_W;
        var x1 = (c + 1 < state.vLines.length) ? state.vLines[c + 1] : state.MAP - B;
        var y1 = (r + 1 < state.hLines.length) ? state.hLines[r + 1] : state.MAP - B;
        for (y = y0; y < y1; y++)
          for (x = x0; x < x1; x++)
            if (x >= 0 && x < state.MAP && y >= 0 && y < state.MAP) state.map[y * state.MAP + x] = 1;
      }
    }
    for (r = 0; r < state.hLines.length; r++) {
      for (c = 0; c < state.cols; c++) {
        if (state.hSegWall[r][c]) continue;
        y0 = state.hLines[r];
        x0 = state.vLines[c] + WALL_W;
        x1 = (c + 1 < state.vLines.length) ? state.vLines[c + 1] : state.MAP - B;
        for (dy = 0; dy < WALL_W; dy++)
          for (x = x0; x < x1; x++) {
            yy = y0 + dy;
            if (yy >= 0 && yy < state.MAP && x >= 0 && x < state.MAP) state.map[yy * state.MAP + x] = 1;
          }
      }
    }
    for (r = 0; r < state.rows; r++) {
      for (c = 0; c < state.vLines.length; c++) {
        if (state.vSegWall[r][c]) continue;
        x0 = state.vLines[c];
        y0 = state.hLines[r] + WALL_W;
        y1 = (r + 1 < state.hLines.length) ? state.hLines[r + 1] : state.MAP - B;
        for (dx = 0; dx < WALL_W; dx++)
          for (y = y0; y < y1; y++) {
            xx = x0 + dx;
            if (xx >= 0 && xx < state.MAP && y >= 0 && y < state.MAP) state.map[y * state.MAP + xx] = 1;
          }
      }
    }
    for (r = 0; r < state.hLines.length; r++) {
      for (c = 0; c < state.vLines.length; c++) {
        var hasAdjacentWall = false;
        if (c < state.cols && state.hSegWall[r][c]) hasAdjacentWall = true;
        if (c > 0 && state.hSegWall[r][c - 1]) hasAdjacentWall = true;
        if (r < state.rows && state.vSegWall[r][c]) hasAdjacentWall = true;
        if (r > 0 && state.vSegWall[r - 1][c]) hasAdjacentWall = true;
        if (hasAdjacentWall) {
          for (dy = 0; dy < WALL_W; dy++) for (dx = 0; dx < WALL_W; dx++) {
            yy = state.hLines[r] + dy; xx = state.vLines[c] + dx;
            if (yy >= 0 && yy < state.MAP && xx >= 0 && xx < state.MAP) state.map[yy * state.MAP + xx] = 0;
          }
        }
      }
    }
    var wallVisited = new Uint8Array(state.MAP * state.MAP);
    for (y = B; y < state.MAP - B; y++) {
      for (x = B; x < state.MAP - B; x++) {
        if (state.map[y * state.MAP + x] !== 0 || wallVisited[y * state.MAP + x]) continue;
        var comp = [];
        var minX = x, maxX = x, minY = y, maxY = y;
        var wq = [[x, y]]; wallVisited[y * state.MAP + x] = 1; var wh = 0;
        var touchesBorder = false;
        while (wh < wq.length) {
          var wp = wq[wh++]; var wx = wp[0], wy = wp[1];
          comp.push([wx, wy]);
          if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
          if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
          if (wx <= B || wx >= state.MAP - B - 1 || wy <= B || wy >= state.MAP - B - 1) touchesBorder = true;
          var dirs4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var di = 0; di < 4; di++) {
            var ddx = dirs4[di][0], ddy = dirs4[di][1];
            var nx2 = wx + ddx, ny2 = wy + ddy;
            if (nx2 < B || ny2 < B || nx2 >= state.MAP - B || ny2 >= state.MAP - B) continue;
            if (state.map[ny2 * state.MAP + nx2] === 0 && !wallVisited[ny2 * state.MAP + nx2]) {
              wallVisited[ny2 * state.MAP + nx2] = 1;
              wq.push([nx2, ny2]);
            }
          }
        }
        if (touchesBorder) continue;
        var spanW = maxX - minX + 1, spanH = maxY - minY + 1;
        if (Math.max(spanW, spanH) < 16) {
          for (var ci = 0; ci < comp.length; ci++) {
            var p = comp[ci];
            state.map[p[1] * state.MAP + p[0]] = 1;
          }
        }
      }
    }
    var startPos = F.getCornerPos('top-left');
    state.startTX = startPos.x;
    state.startTY = startPos.y;
    var exitPos = F.getCornerPos(state.exitCorner);
    state.exitTX = exitPos.x;
    state.exitTY = exitPos.y;
    function clearArea(cx, cy, rr) {
      for (dy = -rr; dy <= rr; dy++) for (dx = -rr; dx <= rr; dx++) {
        var tx = cx + dx, ty = cy + dy;
        if (tx >= B && tx < state.MAP - B && ty >= B && ty < state.MAP - B) state.map[ty * state.MAP + tx] = 1;
      }
    }
    clearArea(state.startTX, state.startTY, 2);
    clearArea(state.exitTX, state.exitTY, 2);
    if (!F.bfsReachable(state.startTX, state.startTY, state.exitTX, state.exitTY, -1, -1)) {
      var cx = state.startTX, cy = state.startTY, ty, tx;
      while (cx !== state.exitTX) {
        for (dy = -Math.floor(CORR_W / 2); dy < Math.ceil(CORR_W / 2); dy++) {
          ty = cy + dy;
          if (ty >= B && ty < state.MAP - B && cx >= B && cx < state.MAP - B) state.map[ty * state.MAP + cx] = 1;
        }
        cx += (state.exitTX > cx) ? 1 : -1;
      }
      while (cy !== state.exitTY) {
        for (dx = -Math.floor(CORR_W / 2); dx < Math.ceil(CORR_W / 2); dx++) {
          var tx = cx + dx;
          if (tx >= B && tx < state.MAP - B && cy >= B && cy < state.MAP - B) state.map[cy * state.MAP + tx] = 1;
        }
        cy += (state.exitTY > cy) ? 1 : -1;
      }
    }
  };

  F.bfsReachable = function (sx, sy, ex, ey, avoidX, avoidY) {
    var exitAvoidR = 4;
    var vis = new Uint8Array(state.MAP * state.MAP);
    var q = [sx + sy * state.MAP]; vis[sy * state.MAP + sx] = 1; var head = 0;
    while (head < q.length) {
      var idx = q[head++]; var cxi = idx % state.MAP, cyi = (idx - cxi) / state.MAP;
      if (cxi === ex && cyi === ey) return true;
      var nbr = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var ni = 0; ni < 4; ni++) {
        var dx = nbr[ni][0], dy = nbr[ni][1];
        var nx = cxi + dx, ny = cyi + dy;
        if (nx < 0 || ny < 0 || nx >= state.MAP || ny >= state.MAP) continue;
        var nii = ny * state.MAP + nx;
        if (vis[nii] || state.map[nii] !== 1) continue;
        if (avoidX >= 0) {
          var adx = nx - avoidX, ady = ny - avoidY;
          if (adx * adx + ady * ady <= exitAvoidR * exitAvoidR) continue;
        }
        vis[nii] = 1;
        q.push(nii);
      }
    }
    return false;
  };

  F.getNonExitCorners = function () {
    var allCorners = ['top-right', 'bottom-left', 'bottom-right'];
    return allCorners.filter(function (name) { return name !== state.exitCorner; });
  };

  F.preRenderMaze = function () {
    state.mazeCanvas.width = state.MAP_PX;
    state.mazeCanvas.height = state.MAP_PX;
    state.mctx.clearRect(0, 0, state.MAP_PX, state.MAP_PX);
    var mx, my;
    state.mctx.fillStyle = '#2d2d4e';
    for (my = 0; my < state.MAP; my++) for (mx = 0; mx < state.MAP; mx++)
      if (state.map[my * state.MAP + mx] === 0) state.mctx.fillRect(mx * T, my * T, T, T);
    state.mctx.fillStyle = '#f0e6d3';
    for (my = 0; my < state.MAP; my++) for (mx = 0; mx < state.MAP; mx++)
      if (state.map[my * state.MAP + mx] === 1) state.mctx.fillRect(mx * T, my * T, T, T);
    state.mctx.strokeStyle = 'rgba(0,0,0,0.05)'; state.mctx.lineWidth = 0.5;
    for (my = 0; my < state.MAP; my++) for (mx = 0; mx < state.MAP; mx++)
      if (state.map[my * state.MAP + mx] === 1) state.mctx.strokeRect(mx * T, my * T, T, T);
    for (my = 0; my < state.MAP; my++) {
      for (mx = 0; mx < state.MAP; mx++) {
        if (state.map[my * state.MAP + mx] === 0) continue;
        var px = mx * T, py = my * T;
        if (mx > 0 && state.map[my * state.MAP + (mx - 1)] === 0) { state.mctx.fillStyle = 'rgba(0,0,0,0.12)'; state.mctx.fillRect(px, py, 2, T); }
        if (mx < state.MAP - 1 && state.map[my * state.MAP + (mx + 1)] === 0) { state.mctx.fillStyle = 'rgba(0,0,0,0.06)'; state.mctx.fillRect(px + T - 2, py, 2, T); }
        if (my > 0 && state.map[(my - 1) * state.MAP + mx] === 0) { state.mctx.fillStyle = 'rgba(0,0,0,0.12)'; state.mctx.fillRect(px, py, T, 2); }
        if (my < state.MAP - 1 && state.map[(my + 1) * state.MAP + mx] === 0) { state.mctx.fillStyle = 'rgba(0,0,0,0.06)'; state.mctx.fillRect(px, py + T - 2, T, 2); }
      }
    }
  };
})();
