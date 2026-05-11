(function () {
  var F = window.FPEM;
  var state = F.state;
  F.getCellOpenings = function (r, c) {
    var o = [];
    if (r > 0 && !state.hSegWall[r][c]) o.push({ nr: r - 1, nc: c, type: 'h', wr: r, wc: c });
    if (r < state.rows - 1 && !state.hSegWall[r + 1][c]) o.push({ nr: r + 1, nc: c, type: 'h', wr: r + 1, wc: c });
    if (c > 0 && !state.vSegWall[r][c]) o.push({ nr: r, nc: c - 1, type: 'v', wr: r, wc: c });
    if (c < state.cols - 1 && !state.vSegWall[r][c + 1]) o.push({ nr: r, nc: c + 1, type: 'v', wr: r, wc: c + 1 });
    return o;
  };
  F.getClosedWalls = function (r, c) {
    var w = [];
    if (r > 0 && state.hSegWall[r][c]) w.push({ type: 'h', wr: r, wc: c });
    if (r < state.rows - 1 && state.hSegWall[r + 1][c]) w.push({ type: 'h', wr: r + 1, wc: c });
    if (c > 0 && state.vSegWall[r][c]) w.push({ type: 'v', wr: r, wc: c });
    if (c < state.cols - 1 && state.vSegWall[r][c + 1]) w.push({ type: 'v', wr: r, wc: c + 1 });
    return w;
  };
})();
