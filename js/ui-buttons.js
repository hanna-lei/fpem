(function () {
  var F = window.FPEM;
  var state = F.state;

  F.getButtonRects = function () {
    var W = state.canvas.width, H = state.canvas.height;
    var btnW = 280, btnH = 50, gap = 18;
    var startY = H / 2 + 20;
    return state.menuButtons.map(function (btn, i) {
      return {
        x: W / 2 - btnW / 2,
        y: startY + i * (btnH + gap),
        w: btnW,
        h: btnH,
        label: btn.label,
        active: btn.active
      };
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
    var btnW = 280, btnH = 50, gap = 18;
    var startY = H / 2 + 55;
    var buttons = [
      { label: 'New Round', active: true },
      { label: 'Game Settings', active: true },
      { label: 'Main Menu', active: true }
    ];
    return buttons.map(function (btn, i) {
      return {
        x: W / 2 - btnW / 2,
        y: startY + i * (btnH + gap),
        w: btnW,
        h: btnH,
        label: btn.label,
        active: btn.active
      };
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
      state.ctx.font = 'bold 22px Arial';
      state.ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2);

      if (!isActive) {
        state.ctx.fillStyle = '#555';
        state.ctx.font = '12px Arial';
        state.ctx.fillText('coming soon', r.x + r.w / 2, r.y + r.h / 2 + 18);
      }
    }
  };
})();
