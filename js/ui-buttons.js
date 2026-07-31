(function () {
  var F = window.FPEM;
  var state = F.state;

  // Hover animation: a button tilts counterclockwise by HOVER_ROT_DEG degrees
  // over roughly HOVER_ROT_DURATION seconds while the pointer rests on it, then
  // unwinds back to flat once the pointer leaves.
  var HOVER_ROT_DURATION = 1.0; // seconds for a full 0 -> peak tilt
  var HOVER_ROT_DEG = 12;       // peak tilt in degrees
  var HOVER_ROT_RAD = HOVER_ROT_DEG * Math.PI / 180;

  // Smoothstep easing: slow, then fast, then slow. Applied to the linear hover
  // progress so both the tilt and its reversal accelerate and decelerate
  // gently (the "ease in / ease out" of classic animation).
  function easeInOut(t) { return t * t * (3 - 2 * t); }

  // Map linear hover progress (0..1) to a rotation angle in radians. The canvas
  // y-axis points down, so a negative angle rotates counterclockwise on screen.
  F.getButtonHoverAngle = function (progress) {
    return -HOVER_ROT_RAD * easeInOut(progress);
  };

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

  // Advance every rendered button's hover progress toward its target (1 while
  // hovered, 0 otherwise) using real elapsed time, so the tilt lasts about
  // HOVER_ROT_DURATION seconds regardless of frame rate. Returns nothing; it
  // mutates state.buttonHoverAnim in place.
  function stepHoverAnim(rects, hovered) {
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!state.buttonAnimLastTime) state.buttonAnimLastTime = now;
    // Clamp dt so returning from another screen (or a background tab) can't
    // snap a button instantly to its target.
    var dt = Math.min((now - state.buttonAnimLastTime) / 1000, 1 / 15);
    state.buttonAnimLastTime = now;
    var step = HOVER_ROT_DURATION > 0 ? dt / HOVER_ROT_DURATION : 1;

    var anim = state.buttonHoverAnim;
    for (var i = 0; i < rects.length; i++) {
      var label = rects[i].label;
      var target = (hovered && hovered.label === label) ? 1 : 0;
      var p = anim[label] || 0;
      if (p < target) p = Math.min(target, p + step);
      else if (p > target) p = Math.max(target, p - step);
      anim[label] = p;
    }
  }

  F.drawButtons = function (rects, hovered) {
    stepHoverAnim(rects, hovered);

    for (var ri = 0; ri < rects.length; ri++) {
      var r = rects[ri];
      var isHovered = hovered && hovered.label === r.label;
      var isActive = r.active;

      // Rotate around the button's center. This applies to inactive ("coming
      // soon") buttons too, since they are hoverable and share this renderer.
      var angle = F.getButtonHoverAngle(state.buttonHoverAnim[r.label] || 0);
      state.ctx.save();
      if (angle !== 0) {
        var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        state.ctx.translate(cx, cy);
        state.ctx.rotate(angle);
        state.ctx.translate(-cx, -cy);
      }

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

      state.ctx.restore();
    }
  };
})();
