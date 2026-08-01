(function () {
  var F = window.FPEM;
  var state = F.state;

  // Hover animation: a button tilts counterclockwise by HOVER_ROT_DEG degrees
  // over roughly HOVER_ROT_DURATION seconds while the pointer rests on it, then
  // unwinds back to flat once the pointer leaves. A tilt always runs to its
  // endpoint before it can turn around (see stepHoverAnim).
  var HOVER_ROT_DURATION = 0.25; // seconds for a full 0 -> peak tilt
  var HOVER_ROT_DEG = 6;         // peak tilt in degrees
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

  // Advance every rendered button's tilt using real elapsed time, so a full
  // tilt lasts about HOVER_ROT_DURATION seconds regardless of frame rate.
  //
  // Each button keeps { p, dir }: p is the 0..1 tilt progress and dir is the
  // leg currently playing (+1 tilting toward the peak, -1 unwinding back to
  // flat, 0 resting at an endpoint). A leg always runs to its endpoint before
  // it can turn around, so leaving a button mid-tilt lets it finish reaching
  // the peak and only then reverses. Mutates state.buttonHoverAnim in place.
  function stepHoverAnim(rects, hovered) {
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!state.buttonAnimLastTime) state.buttonAnimLastTime = now;
    // Clamp dt so returning from another screen (or a background tab) can't
    // snap a button instantly to its endpoint.
    var dt = Math.min((now - state.buttonAnimLastTime) / 1000, 1 / 15);
    state.buttonAnimLastTime = now;
    var step = HOVER_ROT_DURATION > 0 ? dt / HOVER_ROT_DURATION : 1;

    var anim = state.buttonHoverAnim;
    for (var i = 0; i < rects.length; i++) {
      var label = rects[i].label;
      var isHovered = !!(hovered && hovered.label === label);
      var s = anim[label];
      if (!s) { s = { p: 0, dir: 0 }; anim[label] = s; }

      // At rest, only start a leg when the endpoint disagrees with the pointer.
      if (s.dir === 0) {
        if (s.p <= 0 && isHovered) s.dir = 1;
        else if (s.p >= 1 && !isHovered) s.dir = -1;
      }

      // Run the current leg to completion; decide the next leg only once an
      // endpoint is reached.
      if (s.dir > 0) {
        s.p = Math.min(1, s.p + step);
        if (s.p >= 1) { s.p = 1; s.dir = isHovered ? 0 : -1; }
      } else if (s.dir < 0) {
        s.p = Math.max(0, s.p - step);
        if (s.p <= 0) { s.p = 0; s.dir = isHovered ? 1 : 0; }
      }
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
      var s = state.buttonHoverAnim[r.label];
      var angle = F.getButtonHoverAngle(s ? s.p : 0);
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
