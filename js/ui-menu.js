(function () {
  var F = window.FPEM;
  var state = F.state;

  F.renderMenu = function () {
    var W = state.canvas.width, H = state.canvas.height;
    state.ctx.fillStyle = '#1a1a2e';
    state.ctx.fillRect(0, 0, W, H);

    var bg = F.menuBgImg;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      var scale = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      var dw = bg.naturalWidth * scale, dh = bg.naturalHeight * scale;
      state.ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'middle';

    var padding = F.getUiPadding(W);
    var titleY = W < 560 ? 52 : W < 800 ? 62 : 70;
    var subtitleY = W < 560 ? 92 : W < 800 ? 112 : 130;
    var titleFont = W < 400 ? 'bold 22px Arial' : W < 560 ? 'bold 28px Arial' : W < 800 ? 'bold 36px Arial' : 'bold 42px Arial';
    var subtitleFont = W < 560 ? 'bold 40px Arial' : W < 800 ? 'bold 48px Arial' : 'bold 56px Arial';

    state.ctx.save();
    state.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    state.ctx.shadowBlur = 6;

    state.ctx.fillStyle = '#f0e6d3';
    state.ctx.font = titleFont;
    state.ctx.fillText('Fundamental Paper Education', W / 2, titleY, W - 2 * padding);

    state.ctx.fillStyle = '#ffffff';
    state.ctx.font = subtitleFont;
    state.ctx.fillText('MAZE', W / 2, subtitleY);
    state.ctx.restore();

    var rects = F.getButtonRects();
    var hovered = F.getHoveredButton();
    F.drawButtons(rects, hovered);
  };
})();
