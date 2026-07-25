(function () {
  var F = window.FPEM;
  var state = F.state;
  var B = F.B, CELL = F.CELL, WALL_W = F.WALL_W;

  F.getSettingsLayout = function () {
    var W = state.canvas.width, H = state.canvas.height;
    var backBtn = { x: W / 2 - 140, y: 20, w: 100, h: 88 };
    var barBottom = backBtn.y + backBtn.h + 20;

    var totalH = 0;

    totalH += 60;

    totalH += 35 + 40;
    if (state.darknessEnabled) totalH += 60;

    totalH += 50 + 35;
    if (state.itemsEnabled) totalH += 70;

    totalH += 50 + 35;
    if (state.assignmentsEnabled) totalH += 70;

    totalH += 50 + 35;
    if (state.lockersEnabled) totalH += 70;

    totalH += 50 + 35 + 60;

    totalH += 50 + 50;

    var avail = H - barBottom;
    var maxScroll = Math.max(0, totalH - avail + 200);
    state.settingsScrollY = Math.max(-maxScroll, Math.min(maxScroll, state.settingsScrollY));

    var y = (totalH <= avail)
      ? barBottom + (avail - totalH) / 2 + state.settingsScrollY
      : barBottom + state.settingsScrollY;

    var titleY = y + 30;
    y += 60;

    var darknessLabelY = y;
    y += 35;
    var darknessToggle = { x: W / 2 - 30, y: y, w: 60, h: 30 };
    y += 40;
    var darknessDescY = y;

    var darknessSlider = null;
    var darknessSliderTextY = null;
    if (state.darknessEnabled) {
      y += 30;
      darknessSlider = { x: W / 2 - 100, y: y, w: 200, h: 10 };
      y += 30;
      darknessSliderTextY = y;
    }

    y += 50;
    var itemsLabelY = y;
    y += 35;
    var itemsToggle = { x: W / 2 - 30, y: y, w: 60, h: 30 };

    var itemSliders = null;
    var itemSlidersTextY = null;
    if (state.itemsEnabled) {
      y += 40;
      if (state.darknessEnabled) {
        itemSliders = [
          { x: W / 2 - 200, y: y, w: 80, h: 10 },
          { x: W / 2 - 100, y: y, w: 80, h: 10 },
          { x: W / 2 + 0, y: y, w: 80, h: 10 },
          { x: W / 2 + 100, y: y, w: 80, h: 10 }
        ];
      } else {
        itemSliders = [
          { x: W / 2 - 170, y: y, w: 100, h: 10 },
          { x: W / 2 - 50, y: y, w: 100, h: 10 },
          { x: W / 2 + 70, y: y, w: 100, h: 10 }
        ];
      }
      y += 30;
      itemSlidersTextY = y;
    }

    y += 50;
    var assignmentsLabelY = y;
    y += 35;
    var assignmentsToggle = { x: W / 2 - 30, y: y, w: 60, h: 30 };

    var assignmentSlider = null;
    var assignmentSliderTextY = null;
    if (state.assignmentsEnabled) {
      y += 40;
      assignmentSlider = { x: W / 2 - 50, y: y, w: 100, h: 10 };
      y += 30;
      assignmentSliderTextY = y;
    }

    y += 50;
    var lockersLabelY = y;
    y += 35;
    var lockersToggle = { x: W / 2 - 30, y: y, w: 60, h: 30 };

    var lockerSlider = null;
    var lockerSliderTextY = null;
    if (state.lockersEnabled) {
      y += 40;
      lockerSlider = { x: W / 2 - 50, y: y, w: 100, h: 10 };
      y += 30;
      lockerSliderTextY = y;
    }

    y += 50;
    var mapSizeLabelY = y;
    y += 35;
    var mapSlider = { x: W / 2 - 100, y: y, w: 200, h: 10 };
    y += 25;
    var mapSliderTextY = y;

    y += 50;
    var startBtn = { x: W / 2 - 140, y: y, w: 280, h: 50 };

    return {
      backBtn: backBtn,
      titleY: titleY,
      darknessLabelY: darknessLabelY, darknessToggle: darknessToggle, darknessDescY: darknessDescY, darknessSlider: darknessSlider, darknessSliderTextY: darknessSliderTextY,
      itemsLabelY: itemsLabelY, itemsToggle: itemsToggle, itemSliders: itemSliders, itemSlidersTextY: itemSlidersTextY,
      assignmentsLabelY: assignmentsLabelY, assignmentsToggle: assignmentsToggle, assignmentSlider: assignmentSlider, assignmentSliderTextY: assignmentSliderTextY,
      lockersLabelY: lockersLabelY, lockersToggle: lockersToggle, lockerSlider: lockerSlider, lockerSliderTextY: lockerSliderTextY,
      mapSizeLabelY: mapSizeLabelY, mapSlider: mapSlider, mapSliderTextY: mapSliderTextY,
      startBtn: startBtn
    };
  };

  F.renderSettings = function () {
    var W = state.canvas.width, H = state.canvas.height;
    state.ctx.fillStyle = '#1a1a2e';
    state.ctx.fillRect(0, 0, W, H);

    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'middle';

    var layout = F.getSettingsLayout();

    state.ctx.fillStyle = '#f0e6d3';
    state.ctx.font = 'bold 36px Arial';
    state.ctx.fillText('Game Settings', W / 2, layout.titleY);

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Darkness', W / 2, layout.darknessLabelY);

    var dtog = layout.darknessToggle;
    state.ctx.fillStyle = state.darknessEnabled ? '#4caf50' : '#555';
    var dtogR = dtog.h / 2;
    state.ctx.beginPath();
    state.ctx.arc(dtog.x + dtogR, dtog.y + dtogR, dtogR, Math.PI * 0.5, Math.PI * 1.5);
    state.ctx.arc(dtog.x + dtog.w - dtogR, dtog.y + dtogR, dtogR, Math.PI * 1.5, Math.PI * 0.5);
    state.ctx.closePath();
    state.ctx.fill();

    state.ctx.fillStyle = '#fff';
    var dknobX = state.darknessEnabled ? dtog.x + dtog.w - dtogR : dtog.x + dtogR;
    state.ctx.beginPath();
    state.ctx.arc(dknobX, dtog.y + dtogR, dtogR - 3, 0, Math.PI * 2);
    state.ctx.fill();

    state.ctx.fillStyle = '#aaa';
    state.ctx.font = '16px Arial';
    state.ctx.fillText(state.darknessEnabled ? 'The maze will be shrouded in darkness.' : 'Normal visibility.', W / 2, layout.darknessDescY);

    if (state.darknessEnabled && layout.darknessSlider) {
      var slr = layout.darknessSlider;
      state.ctx.fillStyle = '#333';
      state.ctx.fillRect(slr.x, slr.y, slr.w, slr.h);

      var fillPct = (state.darknessRadiusTiles - 15) / 10;
      var fillW = fillPct * slr.w;
      state.ctx.fillStyle = '#4caf50';
      state.ctx.fillRect(slr.x, slr.y, fillW, slr.h);

      var knobX = slr.x + fillW;
      state.ctx.beginPath();
      state.ctx.arc(knobX, slr.y + slr.h / 2, 8, 0, Math.PI * 2);
      state.ctx.fillStyle = '#fff';
      state.ctx.fill();

      state.ctx.fillStyle = '#aaa';
      state.ctx.font = '14px Arial';
      state.ctx.fillText('Light amount: ' + state.darknessRadiusTiles + ' tiles', W / 2, layout.darknessSliderTextY);
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Assignments', W / 2, layout.assignmentsLabelY);

    var atog = layout.assignmentsToggle;
    state.ctx.fillStyle = state.assignmentsEnabled ? '#4caf50' : '#555';
    var atogR = atog.h / 2;
    state.ctx.beginPath();
    state.ctx.arc(atog.x + atogR, atog.y + atogR, atogR, Math.PI * 0.5, Math.PI * 1.5);
    state.ctx.arc(atog.x + atog.w - atogR, atog.y + atogR, atogR, Math.PI * 1.5, Math.PI * 0.5);
    state.ctx.closePath();
    state.ctx.fill();

    state.ctx.fillStyle = '#fff';
    var aknobX = state.assignmentsEnabled ? atog.x + atog.w - atogR : atog.x + atogR;
    state.ctx.beginPath();
    state.ctx.arc(aknobX, atog.y + atogR, atogR - 3, 0, Math.PI * 2);
    state.ctx.fill();

    if (state.assignmentsEnabled && layout.assignmentSlider) {
      var aslr = layout.assignmentSlider;
      var maxAssignments = Math.ceil(F.getTargetDeadEnds(state.mapSize) / 4);
      state.assignmentCount = Math.max(0, Math.min(maxAssignments, state.assignmentCount));
      state.ctx.fillStyle = '#333';
      state.ctx.fillRect(aslr.x, aslr.y, aslr.w, aslr.h);

      var fillPctA = maxAssignments > 0 ? state.assignmentCount / maxAssignments : 0;
      var fillWA = fillPctA * aslr.w;
      state.ctx.fillStyle = '#4caf50';
      state.ctx.fillRect(aslr.x, aslr.y, fillWA, aslr.h);

      var knobXA = aslr.x + fillWA;
      state.ctx.beginPath();
      state.ctx.arc(knobXA, aslr.y + aslr.h / 2, 8, 0, Math.PI * 2);
      state.ctx.fillStyle = '#fff';
      state.ctx.fill();

      state.ctx.fillStyle = '#aaa';
      state.ctx.font = '14px Arial';
      state.ctx.fillText('Assignments: ' + state.assignmentCount + ' / ' + maxAssignments, aslr.x + aslr.w / 2, layout.assignmentSliderTextY);
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Items', W / 2, layout.itemsLabelY);

    var itog = layout.itemsToggle;
    state.ctx.fillStyle = state.itemsEnabled ? '#4caf50' : '#555';
    var itogR = itog.h / 2;
    state.ctx.beginPath();
    state.ctx.arc(itog.x + itogR, itog.y + itogR, itogR, Math.PI * 0.5, Math.PI * 1.5);
    state.ctx.arc(itog.x + itog.w - itogR, itog.y + itogR, itogR, Math.PI * 1.5, Math.PI * 0.5);
    state.ctx.closePath();
    state.ctx.fill();

    state.ctx.fillStyle = '#fff';
    var iknobX = state.itemsEnabled ? itog.x + itog.w - itogR : itog.x + itogR;
    state.ctx.beginPath();
    state.ctx.arc(iknobX, itog.y + itogR, itogR - 3, 0, Math.PI * 2);
    state.ctx.fill();

    if (state.itemsEnabled && layout.itemSliders) {
      var maxDE = F.getTargetDeadEnds(state.mapSize);
      var counts = state.darknessEnabled ? [state.oreoCount, state.kitkatCount, state.appleCount, state.flashlightCount] : [state.oreoCount, state.kitkatCount, state.appleCount];
      var labels = state.darknessEnabled ? ['Oreos', 'KitKats', 'Apples', 'Flashlights'] : ['Oreos', 'KitKats', 'Apples'];
      var numSliders = state.darknessEnabled ? 4 : 3;
      for (var i = 0; i < numSliders; i++) {
        var isl = layout.itemSliders[i];
        state.ctx.fillStyle = '#333';
        state.ctx.fillRect(isl.x, isl.y, isl.w, isl.h);

        var fillPct2 = maxDE > 0 ? counts[i] / maxDE : 0;
        var fillW2 = fillPct2 * isl.w;
        state.ctx.fillStyle = '#4caf50';
        state.ctx.fillRect(isl.x, isl.y, fillW2, isl.h);

        var knobX2 = isl.x + fillW2;
        state.ctx.beginPath();
        state.ctx.arc(knobX2, isl.y + isl.h / 2, 8, 0, Math.PI * 2);
        state.ctx.fillStyle = '#fff';
        state.ctx.fill();

        state.ctx.fillStyle = '#aaa';
        state.ctx.font = '14px Arial';
        state.ctx.fillText(labels[i] + ': ' + counts[i], isl.x + isl.w / 2, layout.itemSlidersTextY);
      }
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Lockers', W / 2, layout.lockersLabelY);

    var ltog = layout.lockersToggle;
    state.ctx.fillStyle = state.lockersEnabled ? '#4caf50' : '#555';
    var ltogR = ltog.h / 2;
    state.ctx.beginPath();
    state.ctx.arc(ltog.x + ltogR, ltog.y + ltogR, ltogR, Math.PI * 0.5, Math.PI * 1.5);
    state.ctx.arc(ltog.x + ltog.w - ltogR, ltog.y + ltogR, ltogR, Math.PI * 1.5, Math.PI * 0.5);
    state.ctx.closePath();
    state.ctx.fill();

    state.ctx.fillStyle = '#fff';
    var lknobX = state.lockersEnabled ? ltog.x + ltog.w - ltogR : ltog.x + ltogR;
    state.ctx.beginPath();
    state.ctx.arc(lknobX, ltog.y + ltogR, ltogR - 3, 0, Math.PI * 2);
    state.ctx.fill();

    if (state.lockersEnabled && layout.lockerSlider) {
      var lslr = layout.lockerSlider;
      state.ctx.fillStyle = '#333';
      state.ctx.fillRect(lslr.x, lslr.y, lslr.w, lslr.h);

      var fillPct3 = F.getTargetDeadEnds(state.mapSize) > 0 ? state.lockerCount / F.getTargetDeadEnds(state.mapSize) : 0;
      var fillW3 = fillPct3 * lslr.w;
      state.ctx.fillStyle = '#4caf50';
      state.ctx.fillRect(lslr.x, lslr.y, fillW3, lslr.h);

      var knobX3 = lslr.x + fillW3;
      state.ctx.beginPath();
      state.ctx.arc(knobX3, lslr.y + lslr.h / 2, 8, 0, Math.PI * 2);
      state.ctx.fillStyle = '#fff';
      state.ctx.fill();

      state.ctx.fillStyle = '#aaa';
      state.ctx.font = '14px Arial';
      state.ctx.fillText('Lockers: ' + state.lockerCount, lslr.x + lslr.w / 2, layout.lockerSliderTextY);
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Map Size', W / 2, layout.mapSizeLabelY);

    var mslr = layout.mapSlider;
    state.ctx.fillStyle = '#333';
    state.ctx.fillRect(mslr.x, mslr.y, mslr.w, mslr.h);

    var mapFillPct = (state.mapSize - 100) / 150;
    var mapFillW = mapFillPct * mslr.w;
    state.ctx.fillStyle = '#4caf50';
    state.ctx.fillRect(mslr.x, mslr.y, mapFillW, mslr.h);

    var mapKnobX = mslr.x + mapFillW;
    state.ctx.beginPath();
    state.ctx.arc(mapKnobX, mslr.y + mslr.h / 2, 8, 0, Math.PI * 2);
    state.ctx.fillStyle = '#fff';
    state.ctx.fill();

    var gridSz = Math.floor((state.mapSize - 2 * B - WALL_W) / CELL);
    state.ctx.fillStyle = '#aaa';
    state.ctx.font = '14px Arial';
    state.ctx.fillText(state.mapSize + ' tiles (' + gridSz + '×' + gridSz + ' grid, ' + F.getTargetDeadEnds(state.mapSize) + ' dead ends)', W / 2, layout.mapSliderTextY);

    var sr = layout.startBtn;
    var isHovered = state.mouseX >= sr.x && state.mouseX <= sr.x + sr.w && state.mouseY >= sr.y && state.mouseY <= sr.y + sr.h;
    state.ctx.fillStyle = isHovered ? '#5a5a7e' : '#3a3a5e';
    state.ctx.strokeStyle = isHovered ? '#888' : '#666';
    var br = 10;
    state.ctx.beginPath();
    state.ctx.moveTo(sr.x + br, sr.y); state.ctx.lineTo(sr.x + sr.w - br, sr.y);
    state.ctx.quadraticCurveTo(sr.x + sr.w, sr.y, sr.x + sr.w, sr.y + br);
    state.ctx.lineTo(sr.x + sr.w, sr.y + sr.h - br);
    state.ctx.quadraticCurveTo(sr.x + sr.w, sr.y + sr.h, sr.x + sr.w - br, sr.y + sr.h);
    state.ctx.lineTo(sr.x + br, sr.y + sr.h);
    state.ctx.quadraticCurveTo(sr.x, sr.y + sr.h, sr.x, sr.y + sr.h - br);
    state.ctx.lineTo(sr.x, sr.y + br);
    state.ctx.quadraticCurveTo(sr.x, sr.y, sr.x + br, sr.y);
    state.ctx.closePath();
    state.ctx.fill(); state.ctx.lineWidth = 2; state.ctx.stroke();

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Start', sr.x + sr.w / 2, sr.y + sr.h / 2);

    var bb = layout.backBtn;

    var barH = bb.y + bb.h + 20;
    state.ctx.fillStyle = '#1a1a2e';
    state.ctx.fillRect(0, 0, W, barH);
    state.ctx.strokeStyle = '#2f2f4a';
    state.ctx.lineWidth = 2;
    state.ctx.beginPath();
    state.ctx.moveTo(0, barH);
    state.ctx.lineTo(W, barH);
    state.ctx.stroke();

    var backHovered = state.mouseX >= bb.x && state.mouseX <= bb.x + bb.w && state.mouseY >= bb.y && state.mouseY <= bb.y + bb.h;
    state.ctx.fillStyle = backHovered ? '#5a5a7e' : '#3a3a5e';
    state.ctx.strokeStyle = backHovered ? '#888' : '#666';
    var bbr = 10;
    state.ctx.beginPath();
    state.ctx.moveTo(bb.x + bbr, bb.y); state.ctx.lineTo(bb.x + bb.w - bbr, bb.y);
    state.ctx.quadraticCurveTo(bb.x + bb.w, bb.y, bb.x + bb.w, bb.y + bbr);
    state.ctx.lineTo(bb.x + bb.w, bb.y + bb.h - bbr);
    state.ctx.quadraticCurveTo(bb.x + bb.w, bb.y + bb.h, bb.x + bb.w - bbr, bb.y + bb.h);
    state.ctx.lineTo(bb.x + bbr, bb.y + bb.h);
    state.ctx.quadraticCurveTo(bb.x, bb.y + bb.h, bb.x, bb.y + bb.h - bbr);
    state.ctx.lineTo(bb.x, bb.y + bbr);
    state.ctx.quadraticCurveTo(bb.x, bb.y, bb.x + bbr, bb.y);
    state.ctx.closePath();
    state.ctx.fill(); state.ctx.lineWidth = 2; state.ctx.stroke();

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 56px Arial';
    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'middle';
    state.ctx.fillText('<', bb.x + bb.w / 2, bb.y + bb.h / 2 + 1);
  };
})();
