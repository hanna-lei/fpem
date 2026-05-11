(function () {
  var F = window.FPEM;
  var state = F.state;
  var oreoImg = F.oreoImg;
  var assignmentImg = F.assignmentImg;
  var kitkatImg = F.kitkatImg;
  var appleImg = F.appleImg;
  var flashlightImg = F.flashlightImg;
  var APPLE_TILE_H = F.APPLE_TILE_H;
  var ASSIGNMENT_CHALLENGE_DURATION = F.ASSIGNMENT_CHALLENGE_DURATION;
  var ASSIGNMENT_TILE_W = F.ASSIGNMENT_TILE_W;
  var ENEMY_SPAWN_DELAY = F.ENEMY_SPAWN_DELAY;
  var KITKAT_TILE_W = F.KITKAT_TILE_W;
  var MAX_STAMINA = F.MAX_STAMINA;
  var OREO_TILE_W = F.OREO_TILE_W;
  var PH = F.PH;
  var PLAYER_RED_GLOW_RADIUS = F.PLAYER_RED_GLOW_RADIUS;
  var PW = F.PW;
  var SPRINT_MIN_STAMINA = F.SPRINT_MIN_STAMINA;
  var T = F.T;

  F.renderGame = function () {
    var W = state.canvas.width, H = state.canvas.height;
    var camX = state.player.x - W / 2, camY = state.player.y - H / 2;

    state.ctx.fillStyle = '#1a1a2e'; state.ctx.fillRect(0, 0, W, H);

    var sx = Math.max(0, camX), sy = Math.max(0, camY);
    var sw = Math.min(W, state.MAP_PX - sx), sh = Math.min(H, state.MAP_PX - sy);
    var ddx = Math.max(0, -camX), ddy = Math.max(0, -camY);
    if (sw > 0 && sh > 0) state.ctx.drawImage(state.mazeCanvas, sx, sy, sw, sh, ddx, ddy, sw, sh);

    var exitVisible = F.remainingAssignments ? F.remainingAssignments() === 0 : true;
    if (exitVisible) {
      var exSX = state.exitX - camX, exSY = state.exitY - camY;
      var pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      state.ctx.globalAlpha = pulse;
      state.ctx.fillStyle = '#4caf50';
      state.ctx.beginPath(); state.ctx.arc(exSX, exSY, state.exitR, 0, Math.PI * 2); state.ctx.fill();
      state.ctx.globalAlpha = 1;

      state.ctx.fillStyle = '#fff';
      state.ctx.font = 'bold 18px Arial';
      state.ctx.textAlign = 'center';
      state.ctx.textBaseline = 'middle';
      state.ctx.fillText('EXIT', exSX, exSY);
    }

    var stSX = state.startTX * T - camX, stSY = state.startTY * T - camY;
    state.ctx.fillStyle = 'rgba(100,149,237,0.2)';
    state.ctx.beginPath(); state.ctx.arc(stSX, stSY, state.exitR, 0, Math.PI * 2); state.ctx.fill();
    state.ctx.fillStyle = '#6495ED';
    state.ctx.font = '13px Arial';
    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'middle';
    state.ctx.fillText('START', stSX, stSY);

    if (oreoImg.complete && oreoImg.naturalWidth > 0) {
      var oreoDrawW = OREO_TILE_W * T;
      var oreoDrawH = (oreoImg.naturalHeight / oreoImg.naturalWidth) * oreoDrawW;
      for (var oi = 0; oi < state.oreos.length; oi++) {
        var oreo = state.oreos[oi];
        if (oreo.collected) continue;
        var ox = oreo.x - camX - oreoDrawW / 2;
        var oy = oreo.y - camY - oreoDrawH / 2;
        state.ctx.drawImage(oreoImg, ox, oy, oreoDrawW, oreoDrawH);
      }
    }

    if (appleImg.complete && appleImg.naturalWidth > 0) {
      var appleDrawH = APPLE_TILE_H * T;
      var appleDrawW = (appleImg.naturalWidth / appleImg.naturalHeight) * appleDrawH;
      for (var ai = 0; ai < state.apples.length; ai++) {
        var apple = state.apples[ai];
        if (apple.collected) continue;
        var ax = apple.x - camX - appleDrawW / 2;
        var ay = apple.y - camY - appleDrawH / 2;
        state.ctx.drawImage(appleImg, ax, ay, appleDrawW, appleDrawH);
      }
    }

    if (state.enemy.active && assignmentImg.complete && assignmentImg.naturalWidth > 0) {
      var assignmentDrawW = ASSIGNMENT_TILE_W * T * 1.5;
      var assignmentDrawH = (oreoImg.complete && oreoImg.naturalWidth > 0) ?
        (oreoImg.naturalHeight / oreoImg.naturalWidth) * assignmentDrawW :
        (assignmentImg.naturalHeight / assignmentImg.naturalWidth) * assignmentDrawW;
      for (var asi = 0; asi < state.assignments.length; asi++) {
        var assignment = state.assignments[asi];
        if (assignment.collected) continue;
        var asx = assignment.x - camX - assignmentDrawW / 2;
        var asy = assignment.y - camY - assignmentDrawH / 2;
        state.ctx.drawImage(assignmentImg, asx, asy, assignmentDrawW, assignmentDrawH);
      }
    }

    if (kitkatImg.complete && kitkatImg.naturalWidth > 0) {
      var kkDrawW = KITKAT_TILE_W * T;
      var kkDrawH = (kitkatImg.naturalHeight / kitkatImg.naturalWidth) * kkDrawW;
      for (var ki = 0; ki < state.kitkats.length; ki++) {
        var kk = state.kitkats[ki];
        if (kk.collected) continue;
        var kx = kk.x - camX - kkDrawW / 2;
        var ky = kk.y - camY - kkDrawH / 2;
        state.ctx.drawImage(kitkatImg, kx, ky, kkDrawW, kkDrawH);
      }
    }

    if (flashlightImg.complete && flashlightImg.naturalWidth > 0) {
      var flDrawW = 6 * T;
      var flDrawH = (flashlightImg.naturalHeight / flashlightImg.naturalWidth) * flDrawW;
      for (var fi = 0; fi < state.flashlights.length; fi++) {
        var fl = state.flashlights[fi];
        if (fl.collected) continue;
        var fx = fl.x - camX - flDrawW / 2;
        var fy = fl.y - camY - flDrawH / 2;
        state.ctx.drawImage(flashlightImg, fx, fy, flDrawW, flDrawH);
      }
    }

    if (state.enemy.active) F.drawEnemy(state.enemy.x - camX, state.enemy.y - camY);

    for (var li = 0; li < state.lockers.length; li++) {
      var locker = state.lockers[li];
      if (!locker.used) {
        state.ctx.fillStyle = '#87CEEB';
        state.ctx.fillRect(locker.x - camX, locker.y - camY, locker.w, locker.h);
      } else if (state.playerInLocker && li === state.activeLockerIndex) {
        state.ctx.fillStyle = '#fff';
        state.ctx.font = 'bold 20px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.textBaseline = 'bottom';
        state.ctx.fillText(String(Math.ceil(state.lockerTimer)), locker.x + locker.w / 2 - camX, locker.y - camY - 5);
      }
    }

    var ppx = W / 2, ppy = H / 2, phw = PW / 2, phh = PH / 2;

    if (state.darknessEnabled) {
      var redGlow = state.ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, PLAYER_RED_GLOW_RADIUS);
      redGlow.addColorStop(0, 'rgba(220, 70, 70, 0.3)');
      redGlow.addColorStop(0.35, 'rgba(200, 45, 45, 0.15)');
      redGlow.addColorStop(0.65, 'rgba(170, 35, 35, 0.06)');
      redGlow.addColorStop(1, 'rgba(140, 25, 25, 0)');
      state.ctx.fillStyle = redGlow;
      state.ctx.beginPath();
      state.ctx.arc(ppx, ppy, PLAYER_RED_GLOW_RADIUS, 0, Math.PI * 2);
      state.ctx.fill();
    }

    if (!state.playerInLocker) {

      state.ctx.fillStyle = 'rgba(0,0,0,0.15)';
      state.ctx.beginPath();
      state.ctx.ellipse(ppx + 1, ppy + phh + 3, phw * 0.8, 4, 0, 0, Math.PI * 2);
      state.ctx.fill();

      if (state.invincible) { state.ctx.save(); state.ctx.shadowColor = '#ffdd00'; state.ctx.shadowBlur = 20; }

      var br = 4;
      var bodyColor = state.invincible ? '#ffd700' : '#ff6b6b';
      var strokeColor = state.invincible ? '#daa520' : '#c0392b';

      state.ctx.fillStyle = bodyColor; state.ctx.beginPath();
      state.ctx.moveTo(ppx - phw + br, ppy - phh); state.ctx.lineTo(ppx + phw - br, ppy - phh);
      state.ctx.quadraticCurveTo(ppx + phw, ppy - phh, ppx + phw, ppy - phh + br);
      state.ctx.lineTo(ppx + phw, ppy + phh - br); state.ctx.quadraticCurveTo(ppx + phw, ppy + phh, ppx + phw - br, ppy + phh);
      state.ctx.lineTo(ppx - phw + br, ppy + phh); state.ctx.quadraticCurveTo(ppx - phw, ppy + phh, ppx - phw, ppy + phh - br);
      state.ctx.lineTo(ppx - phw, ppy - phh + br); state.ctx.quadraticCurveTo(ppx - phw, ppy - phh, ppx - phw + br, ppy - phh);
      state.ctx.closePath(); state.ctx.fill();
      state.ctx.strokeStyle = strokeColor; state.ctx.lineWidth = 2; state.ctx.stroke();

      if (state.invincible) state.ctx.restore();

      var peox = 0, peoy = 0;
      if (state.player.dir === 0) peox = 2; else if (state.player.dir === 2) peox = -2;
      if (state.player.dir === 1) peoy = 3; else if (state.player.dir === 3) peoy = -3;

      var pfaceY = ppy - phh * 0.35;
      state.ctx.fillStyle = '#fff';
      state.ctx.beginPath(); state.ctx.arc(ppx - 6 + peox, pfaceY + peoy, 5, 0, Math.PI * 2); state.ctx.fill();
      state.ctx.beginPath(); state.ctx.arc(ppx + 6 + peox, pfaceY + peoy, 5, 0, Math.PI * 2); state.ctx.fill();

      state.ctx.fillStyle = '#222';
      state.ctx.beginPath(); state.ctx.arc(ppx - 5 + peox * 1.5, pfaceY + peoy * 1.2, 2.5, 0, Math.PI * 2); state.ctx.fill();
      state.ctx.beginPath(); state.ctx.arc(ppx + 7 + peox * 1.5, pfaceY + peoy * 1.2, 2.5, 0, Math.PI * 2); state.ctx.fill();

      state.ctx.strokeStyle = strokeColor; state.ctx.lineWidth = 1.5; state.ctx.beginPath();
      state.ctx.arc(ppx + peox * 0.5, pfaceY + 12 + peoy * 0.5, 4, 0.1 * Math.PI, 0.9 * Math.PI);
      state.ctx.stroke();

      if (state.invincible) {
        var countNum = Math.ceil(Math.max.apply(null, state.invincibleTimers));
        state.ctx.fillStyle = '#ffdd00';
        state.ctx.font = 'bold 22px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.textBaseline = 'bottom';
        state.ctx.fillText(String(countNum), ppx, ppy - phh - 8);
      }

      if (state.playerStunned) {
        var haloY = ppy - phh - 10;
        var spinSpeed = Date.now() / 300;
        var starCount = 5;
        var haloRadius = 20;
        state.ctx.font = '14px Arial'; state.ctx.textAlign = 'center'; state.ctx.textBaseline = 'middle';
        for (var si = 0; si < starCount; si++) {
          var angle = spinSpeed + (si * Math.PI * 2 / starCount);
          var ssx = ppx + Math.cos(angle) * haloRadius;
          var ssy = haloY + Math.sin(angle) * (haloRadius * 0.4);
          state.ctx.fillStyle = '#ffdd00';
          state.ctx.fillText('⭐', ssx, ssy);
        }
      }
    }

    if (state.darknessEnabled) {
      var darkCanvas = document.createElement('canvas');
      darkCanvas.width = W; darkCanvas.height = H;
      var dctx = darkCanvas.getContext('2d');
      dctx.fillStyle = '#000';
      dctx.fillRect(0, 0, W, H);
      dctx.globalCompositeOperation = 'destination-out';
      var cx = state.playerInLocker ? (state.player.x - camX) : W / 2;
      var cy = state.playerInLocker ? (state.player.y - camY) : H / 2;
      var currentDarknessRadius = (state.darknessRadiusTiles * T) * (1 + 0.25 * state.flashlightTimers.length);
      var currentDarknessOuter = currentDarknessRadius * 1.12;
      var innerR = currentDarknessRadius * 0.12;
      var grad = dctx.createRadialGradient(cx, cy, innerR, cx, cy, currentDarknessOuter);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.18, 'rgba(0,0,0,0.97)');
      grad.addColorStop(0.38, 'rgba(0,0,0,0.82)');
      grad.addColorStop(0.58, 'rgba(0,0,0,0.52)');
      grad.addColorStop(0.76, 'rgba(0,0,0,0.24)');
      grad.addColorStop(0.9, 'rgba(0,0,0,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = grad;
      dctx.beginPath();
      dctx.arc(cx, cy, currentDarknessOuter, 0, Math.PI * 2);
      dctx.fill();
      state.ctx.drawImage(darkCanvas, 0, 0);
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = '16px Arial';
    state.ctx.textAlign = 'left';
    state.ctx.textBaseline = 'top';
    state.ctx.fillText('⏱ ' + state.elapsed + 's', 15, 15);

    var barX = 15, barY = 36, barW = 120, barH = 10;
    state.ctx.fillStyle = '#333';
    state.ctx.fillRect(barX, barY, barW, barH);

    state.ctx.fillStyle = (state.stamina < SPRINT_MIN_STAMINA) ? '#ff3333' : (state.sprinting ? '#ffaa00' : '#ffdd00');
    state.ctx.fillRect(barX, barY, barW * (state.stamina / MAX_STAMINA), barH);

    state.ctx.strokeStyle = '#888';
    state.ctx.lineWidth = 1;
    state.ctx.strokeRect(barX, barY, barW, barH);

    var invY = barY + barH + 8;
    var invRadius = 24;
    var invGap = 10;

    for (var ii = 0; ii < 3; ii++) {
      var icx = barX + invRadius + ii * (invRadius * 2 + invGap);
      var icy = invY + invRadius;

      state.ctx.beginPath();
      state.ctx.arc(icx, icy, invRadius, 0, Math.PI * 2);
      state.ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
      state.ctx.fill();
      state.ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
      state.ctx.lineWidth = 1.5;
      state.ctx.stroke();

      if (state.inventory[ii] === 'oreo' && oreoImg.complete && oreoImg.naturalWidth > 0) {
        var iconW = invRadius * 2.24;
        var iconH = (oreoImg.naturalHeight / oreoImg.naturalWidth) * iconW;
        state.ctx.drawImage(oreoImg, icx - iconW / 2, icy - iconH / 2, iconW, iconH);
      }
      if (state.inventory[ii] === 'kitkat' && kitkatImg.complete && kitkatImg.naturalWidth > 0) {
        var iconW2 = invRadius * 2.24;
        var iconH2 = (kitkatImg.naturalHeight / kitkatImg.naturalWidth) * iconW2;
        state.ctx.drawImage(kitkatImg, icx - iconW2 / 2, icy - iconH2 / 2, iconW2, iconH2);
      }
      if (state.inventory[ii] === 'apple' && appleImg.complete && appleImg.naturalWidth > 0) {
        var iconH3 = invRadius * 1.8;
        var iconW3 = (appleImg.naturalWidth / appleImg.naturalHeight) * iconH3;
        state.ctx.drawImage(appleImg, icx - iconW3 / 2, icy - iconH3 / 2, iconW3, iconH3);
      }
      if (state.inventory[ii] === 'flashlight' && flashlightImg.complete && flashlightImg.naturalWidth > 0) {
        var iconW4 = invRadius * 2.7;
        var iconH4 = (flashlightImg.naturalHeight / flashlightImg.naturalWidth) * iconW4;
        state.ctx.drawImage(flashlightImg, icx - iconW4 / 2, icy - iconH4 / 2, iconW4, iconH4);
      }
    }

    var elapsedSec = F.getElapsedSec ? F.getElapsedSec() : (Date.now() - state.startTime) / 1000;
    if (!state.enemy.active && state.gameState === 'playing') {
      var secsLeft = Math.max(0, Math.ceil(ENEMY_SPAWN_DELAY - elapsedSec));
      if (secsLeft > 0) {
        state.ctx.fillStyle = state.enemyVariant.body;
        state.ctx.font = 'bold 20px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.fillText('⚠️ ' + state.enemyVariant.name.toUpperCase() + ' ENTERS IN ' + secsLeft + '...', W / 2, 60);
      }
    }

    if (state.assignmentTeacherStunTimer > 0) {
      state.ctx.fillStyle = '#88d8ff';
      state.ctx.font = 'bold 18px Arial';
      state.ctx.textAlign = 'center';
      state.ctx.fillText('TEACHER STUNNED: ' + Math.ceil(state.assignmentTeacherStunTimer), W / 2, 88);
    } else if (state.assignmentTeacherBoostTimer > 0) {
      state.ctx.fillStyle = '#ff7777';
      state.ctx.font = 'bold 18px Arial';
      state.ctx.textAlign = 'center';
      state.ctx.fillText('TEACHER BOOSTED: ' + Math.ceil(state.assignmentTeacherBoostTimer), W / 2, 88);
    }

    if (state.assignments.length > 0 && state.gameState === 'playing') {
      var assignmentsLeft = F.remainingAssignments ? F.remainingAssignments() : 0;
      state.ctx.fillStyle = '#ff3333';
      state.ctx.font = 'bold 22px Arial';
      state.ctx.textAlign = 'center';
      state.ctx.textBaseline = 'top';
      state.ctx.fillText(assignmentsLeft > 0 ? assignmentsLeft + ' assignment(s) remaining!' : 'Find the exit!', W / 2, 12);
    }

    if (state.assignmentActive) {
      var panelW = Math.min(460, W - 40);
      var panelH = 220;
      var panelX = W / 2 - panelW / 2;
      var panelY = H / 2 - panelH / 2;
      state.ctx.fillStyle = 'rgba(0,0,0,0.72)';
      state.ctx.fillRect(0, 0, W, H);
      state.ctx.fillStyle = '#f8f3e8';
      state.ctx.strokeStyle = '#35354f';
      state.ctx.lineWidth = 3;
      state.ctx.fillRect(panelX, panelY, panelW, panelH);
      state.ctx.strokeRect(panelX, panelY, panelW, panelH);

      state.ctx.fillStyle = '#222';
      state.ctx.textAlign = 'center';
      state.ctx.textBaseline = 'middle';
      state.ctx.font = 'bold 24px Arial';
      state.ctx.fillText('Assignment', W / 2, panelY + 36);
      state.ctx.font = 'bold 44px Arial';
      state.ctx.fillText(state.assignmentA + ' × ' + state.assignmentB + ' = ?', W / 2, panelY + 95);
      state.ctx.font = 'bold 32px Arial';
      state.ctx.fillText(state.assignmentAnswer || '_', W / 2, panelY + 145);

      var qbarX = panelX + 50, qbarY = panelY + panelH - 42, qbarW = panelW - 100, qbarH = 12;
      state.ctx.fillStyle = '#333';
      state.ctx.fillRect(qbarX, qbarY, qbarW, qbarH);
      var pct = Math.max(0, state.assignmentTimeLeft / ASSIGNMENT_CHALLENGE_DURATION);
      state.ctx.fillStyle = pct < 0.3 ? '#ff3333' : '#4caf50';
      state.ctx.fillRect(qbarX, qbarY, qbarW * pct, qbarH);
      state.ctx.strokeStyle = '#888';
      state.ctx.lineWidth = 1;
      state.ctx.strokeRect(qbarX, qbarY, qbarW, qbarH);
    }

    if (state.gameState === 'won') {
      state.ctx.fillStyle = 'rgba(0,0,0,0.75)'; state.ctx.fillRect(0, 0, W, H);
      state.ctx.textAlign = 'center'; state.ctx.textBaseline = 'middle';
      state.ctx.fillStyle = '#4caf50'; state.ctx.font = 'bold 52px Arial';
      state.ctx.fillText('🎉 YOU WIN! 🎉', W / 2, H / 2 - 30);
      state.ctx.fillStyle = '#fff'; state.ctx.font = '24px Arial';
      state.ctx.fillText('Escaped ' + state.enemyVariant.name + ' in ' + state.elapsed + ' seconds!', W / 2, H / 2 + 25);
      var rectsW = F.getEndGameButtonRects();
      var hoveredW = F.getHoveredEndGameButton();
      F.drawButtons(rectsW, hoveredW);
    }

    if (state.gameState === 'lost') {
      state.ctx.fillStyle = 'rgba(80,0,0,0.8)'; state.ctx.fillRect(0, 0, W, H);
      state.ctx.textAlign = 'center'; state.ctx.textBaseline = 'middle';
      state.ctx.fillStyle = state.enemyVariant.body; state.ctx.font = 'bold 52px Arial';
      state.ctx.fillText('💀 ' + state.enemyVariant.name.toUpperCase() + '! 💀', W / 2, H / 2 - 30);
      state.ctx.fillStyle = '#fff'; state.ctx.font = '24px Arial';
      state.ctx.fillText('Caught after ' + state.elapsed + ' seconds', W / 2, H / 2 + 25);
      var rectsL = F.getEndGameButtonRects();
      var hoveredL = F.getHoveredEndGameButton();
      F.drawButtons(rectsL, hoveredL);
    }
  };
})();
