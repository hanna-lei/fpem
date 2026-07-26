(function () {
  var F = window.FPEM;
  var state = F.state;

  F.getMenuTitleBottomY = function () {
    var W = state.canvas.width;
    if (W < 560) return 120;
    if (W < 800) return 145;
    return 165;
  };

  F.getButtonRects = function () {
    var W = state.canvas.width, H = state.canvas.height;
    var btnH = 50, gap = 18;
    var cols = F.getUiColumns(W, 2);
    var titleBottomY = F.getMenuTitleBottomY();
    var rows = Math.ceil(state.menuButtons.length / cols);
    var totalH = rows * btnH + (rows - 1) * gap;
    var startY = titleBottomY + Math.max(20, (H - titleBottomY - totalH) / 2);
    return F.layoutButtonGrid(state.menuButtons, W, H, {
      startY: startY,
      btnH: btnH,
      gap: gap,
      maxCols: 2,
      maxBtnW: 280
    });
  };

  F.getHoveredButton = function () {
    var rects = F.getButtonRects();
    for (var ri = 0; ri < rects.length; ri++) {
      var r = rects[ri];
      if (state.mouseX >= r.x && state.mouseX <= r.x + r.w && state.mouseY >= r.y && state.mouseY <= r.y + r.h) return r;
    }
    return null;
  };

  F.getEndGameButtonRects = function () {
    var W = state.canvas.width, H = state.canvas.height;
    var btnH = 50, gap = 18;
    var buttons = [
      { label: 'New Round', active: true },
      { label: 'Game Settings', active: true },
      { label: 'Main Menu', active: true }
    ];
    return F.layoutButtonGrid(buttons, W, H, {
      startY: H / 2 + 55,
      btnH: btnH,
      gap: gap,
      maxCols: 2,
      maxBtnW: 280
    });
  };

  F.getHoveredEndGameButton = function () {
    var rects = F.getEndGameButtonRects();
    for (var ri = 0; ri < rects.length; ri++) {
      var r = rects[ri];
      if (state.mouseX >= r.x && state.mouseX <= r.x + r.w && state.mouseY >= r.y && state.mouseY <= r.y + r.h) return r;
    }
    return null;
  };

  F.drawButtons = function (rects, hovered) {
    for (var ri = 0; ri < rects.length; ri++) {
      var r = rects[ri];
      var isHovered = hovered && hovered.label === r.label;
      var isActive = r.active;

      if (!isActive) { state.ctx.fillStyle = '#2a2a3e'; state.ctx.strokeStyle = '#444'; }
      else if (isHovered) { state.ctx.fillStyle = '#5a5a7e'; state.ctx.strokeStyle = '#888'; }
      else { state.ctx.fillStyle = '#3a3a5e'; state.ctx.strokeStyle = '#666'; }

      var br = 10;
      state.ctx.beginPath();
      state.ctx.moveTo(r.x + br, r.y);
      state.ctx.lineTo(r.x + r.w - br, r.y);
      state.ctx.quadraticCurveTo(r.x + r.w, r.y, r.x + r.w, r.y + br);
      state.ctx.lineTo(r.x + r.w, r.y + r.h - br);
      state.ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w - br, r.y + r.h);
      state.ctx.lineTo(r.x + br, r.y + r.h);
      state.ctx.quadraticCurveTo(r.x, r.y + r.h, r.x, r.y + r.h - br);
      state.ctx.lineTo(r.x, r.y + br);
      state.ctx.quadraticCurveTo(r.x, r.y, r.x + br, r.y);
      state.ctx.closePath();

      state.ctx.fill();
      state.ctx.lineWidth = 2;
      state.ctx.stroke();

      state.ctx.fillStyle = isActive ? '#fff' : '#666';
      state.ctx.font = 'bold 22px "Barrio", cursive';
      state.ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2);

      if (!isActive) {
        state.ctx.fillStyle = '#555';
        state.ctx.font = '12px "Barrio", cursive';
        state.ctx.fillText('coming soon', r.x + r.w / 2, r.y + r.h / 2 + 18);
      }
    }
  };
})();
