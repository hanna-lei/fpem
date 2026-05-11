(function () {
  var F = window.FPEM;
  var state = F.state;

  F.renderMenu = function () {
    var W = state.canvas.width, H = state.canvas.height;
    state.ctx.fillStyle = '#1a1a2e';
    state.ctx.fillRect(0, 0, W, H);

    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'middle';

    state.ctx.fillStyle = '#f0e6d3';
    state.ctx.font = 'bold 42px Arial';
    state.ctx.fillText('Fundamental Paper Education', W / 2, 70);

    state.ctx.fillStyle = '#ffffff';
    state.ctx.font = 'bold 56px Arial';
    state.ctx.fillText('MAZE', W / 2, 130);

    var rects = F.getButtonRects();
    var hovered = F.getHoveredButton();
    F.drawButtons(rects, hovered);
  };
})();
