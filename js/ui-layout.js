(function () {
  var F = window.FPEM;

  F.getUiPadding = function (W) {
    return Math.max(20, Math.min(48, Math.round(W * 0.05)));
  };

  F.getUiColumns = function (W, maxCols) {
    maxCols = maxCols || 2;
    if (W < 560) return 1;
    return Math.min(maxCols, 2);
  };

  F.getUiContentWidth = function (W) {
    return W - 2 * F.getUiPadding(W);
  };

  F.layoutButtonGrid = function (buttons, W, H, opts) {
    opts = opts || {};
    var padding = F.getUiPadding(W);
    var contentW = W - 2 * padding;
    var cols = F.getUiColumns(W, opts.maxCols || 2);
    var btnH = opts.btnH || 50;
    var gap = opts.gap || 18;
    var colGap = gap;
    var btnW = Math.min(opts.maxBtnW || 280, Math.floor((contentW - (cols - 1) * colGap) / cols));
    var startY = opts.startY || 0;

    return buttons.map(function (btn, i) {
      var row = Math.floor(i / cols);
      var col = i % cols;
      var rowStart = row * cols;
      var itemsInRow = Math.min(cols, buttons.length - rowStart);
      var rowGridW = itemsInRow * btnW + (itemsInRow - 1) * colGap;
      var rowStartX = padding + (contentW - rowGridW) / 2;
      return {
        x: rowStartX + col * (btnW + colGap),
        y: startY + row * (btnH + gap),
        w: btnW,
        h: btnH,
        label: btn.label,
        active: btn.active
      };
    });
  };

  F.layoutSliders = function (x, y, width, count, vertical) {
    var sliders = [];
    var sliderH = 10;
    var rowGap = 50;
    var minSliderW = 72;

    if (vertical || width < count * minSliderW + (count - 1) * 12) {
      var sliderW = Math.min(200, width);
      var sliderX = x + (width - sliderW) / 2;
      for (var i = 0; i < count; i++) {
        sliders.push({ x: sliderX, y: y + i * rowGap, w: sliderW, h: sliderH });
      }
      return { sliders: sliders, textY: y + count * rowGap - 20, blockH: count * rowGap + 10 };
    }

    var gap = 12;
    var sliderW2 = Math.min(100, Math.floor((width - (count - 1) * gap) / count));
    var totalW = count * sliderW2 + (count - 1) * gap;
    var startX = x + (width - totalW) / 2;
    for (var j = 0; j < count; j++) {
      sliders.push({ x: startX + j * (sliderW2 + gap), y: y, w: sliderW2, h: sliderH });
    }
    return { sliders: sliders, textY: y + 30, blockH: 70 };
  };
})();
