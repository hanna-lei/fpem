(function () {
  var F = window.FPEM;
  var state = F.state;
  var CIRCLE_AURA_RADIUS = F.CIRCLE_AURA_RADIUS;
  var CIRCLE_MAX_NAT_H = F.CIRCLE_MAX_NAT_H;
  var CIRCLE_MAX_NAT_W = F.CIRCLE_MAX_NAT_W;

  F.drawEnemySprite = function (enX, enY) {
    var sp = state.enemyVariant.sprite;
    var frame = sp.frames[state.spriteAnimFrame];
    if (!frame || !frame.complete || frame.naturalWidth === 0) return;

    var natW = frame.naturalWidth, natH = frame.naturalHeight;
    var drawW, drawH;

    if (state.enemyVariant.name === 'Miss Circle') {
      var visW = state.enemyVariant.drawW, visH = state.enemyVariant.drawH;
      var baseScale = Math.min(visW / CIRCLE_MAX_NAT_W, visH / CIRCLE_MAX_NAT_H);
      drawW = natW * baseScale; drawH = natH * baseScale;
    } else {
      var visW2 = state.enemyVariant.drawW || state.EW, visH2 = state.enemyVariant.drawH || state.EH;
      var scale = Math.min(visW2 / natW, visH2 / natH);
      drawW = natW * scale; drawH = natH * scale;
    }

    var flipLeft = (state.enemyVariant.name === 'Miss Circle') ? (state.enemy.dir === 0) : (state.enemy.dir === 2);

    state.ctx.save();
    if (state.enemyVariant.name === 'Miss Bloomie' && state.bloomieState === 'boosted' && !state.invincible) {
      state.ctx.shadowColor = '#4287f5'; state.ctx.shadowBlur = 20;
    }
    if (state.kitkatSlowActive) {
      state.ctx.shadowColor = '#d94b4b';
      state.ctx.shadowBlur = 12;
    }

    if (flipLeft) {
      state.ctx.translate(enX, enY);
      state.ctx.scale(-1, 1);
      state.ctx.drawImage(frame, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      state.ctx.drawImage(frame, enX - drawW / 2, enY - drawH / 2, drawW, drawH);
    }
    state.ctx.restore();
  };

  F.drawEnemy = function (enX, enY) {
    if (state.enemyVariant.name === 'Miss Circle' && state.enemy.active) {
      var auraPulse = Math.sin(Date.now() / 400) * 0.03 + 0.08;
      state.ctx.fillStyle = 'rgba(204, 34, 34, ' + auraPulse + ')';
      state.ctx.beginPath(); state.ctx.arc(enX, enY, CIRCLE_AURA_RADIUS, 0, Math.PI * 2); state.ctx.fill();

      state.ctx.strokeStyle = 'rgba(204, 34, 34, ' + (auraPulse + 0.1) + ')';
      state.ctx.lineWidth = 2;
      state.ctx.setLineDash([8, 6]);
      state.ctx.beginPath(); state.ctx.arc(enX, enY, CIRCLE_AURA_RADIUS, 0, Math.PI * 2); state.ctx.stroke();
      state.ctx.setLineDash([]);
    }
    F.drawEnemySprite(enX, enY);
  };
})();
