(function () {
  var F = window.FPEM;
  var state = F.state;
  var B = F.B, CELL = F.CELL, WALL_W = F.WALL_W;

  function placeToggle(x, y, width) {
    var toggleW = 60, toggleH = 30;
    return { x: x + (width - toggleW) / 2, y: y, w: toggleW, h: toggleH };
  }

  function placeSingleSlider(x, y, width) {
    var sliderW = Math.min(200, width);
    return { x: x + (width - sliderW) / 2, y: y, w: sliderW, h: 10 };
  }

  function layoutSettingBlock(x, y, width, options) {
    var block = {
      labelY: y,
      toggle: null,
      descY: null,
      slider: null,
      sliders: null,
      sliderTextY: null,
      height: 0
    };
    var cy = y + 35;
    block.toggle = placeToggle(x, cy, width);
    cy += 40;

    if (options.hasDesc) {
      block.descY = cy;
      cy += 25;
    }

    if (options.enabled) {
      if (options.sliderCount > 0) {
        cy += 10;
        var sliderLayout = F.layoutSliders(x, cy, width, options.sliderCount, options.verticalSliders);
        block.sliders = sliderLayout.sliders;
        block.sliderTextY = sliderLayout.textY;
        cy += sliderLayout.blockH;
      } else {
        cy += 10;
        block.slider = placeSingleSlider(x, cy, width);
        cy += 30;
        block.sliderTextY = cy;
        cy += 20;
      }
    }

    block.height = cy - y + (options.bottomGap || 20);
    return block;
  }

  F.getSettingsLayout = function () {
    var W = state.canvas.width, H = state.canvas.height;
    var padding = F.getUiPadding(W);
    var contentW = W - 2 * padding;
    var cols = F.getUiColumns(W, 2);
    var colGap = 24;
    var settingsColW = cols === 1 ? contentW : Math.min(240, Math.floor((contentW - colGap) / 2));
    var settingsGridW = cols === 1 ? settingsColW : settingsColW * 2 + colGap;
    var settingsGridX = padding + (contentW - settingsGridW) / 2;
    var colW = settingsColW;
    var verticalItemSliders = cols === 1 || settingsGridW < 520;
    var itemSliderCount = state.darknessEnabled ? 4 : 3;

    var darknessOpts = {
      hasDesc: true,
      enabled: state.darknessEnabled,
      sliderCount: state.darknessEnabled ? 1 : 0,
      verticalSliders: false,
      bottomGap: 20
    };
    var assignmentsOpts = {
      enabled: state.assignmentsEnabled,
      sliderCount: 0,
      verticalSliders: false,
      bottomGap: 20
    };
    var itemsOpts = {
      enabled: state.itemsEnabled,
      sliderCount: state.itemsEnabled ? itemSliderCount : 0,
      verticalSliders: verticalItemSliders,
      bottomGap: 20
    };
    var lockersOpts = {
      enabled: state.lockersEnabled,
      sliderCount: 0,
      verticalSliders: false,
      bottomGap: 20
    };

    var darknessH = layoutSettingBlock(0, 0, colW, darknessOpts).height;
    var assignmentsH = layoutSettingBlock(0, 0, colW, assignmentsOpts).height;
    var itemsH = layoutSettingBlock(0, 0, colW, itemsOpts).height;
    var lockersH = layoutSettingBlock(0, 0, colW, lockersOpts).height;

    var row1H = cols === 1 ? darknessH + assignmentsH : Math.max(darknessH, assignmentsH);
    var row2H = cols === 1 ? itemsH + lockersH : Math.max(itemsH, lockersH);
    var mapBlockH = 35 + 35 + 25 + 50;
    var headerH = 75;
    var totalH = headerH + row1H + row2H + mapBlockH + 50;

    var topMargin = 30;
    var bottomMargin = 30;
    var contentTop, maxScroll;
    if (totalH <= H - topMargin - bottomMargin) {
      contentTop = (H - totalH) / 2;
      maxScroll = 0;
    } else {
      contentTop = topMargin;
      maxScroll = contentTop + totalH - H + bottomMargin;
    }
    state.settingsScrollY = Math.max(-maxScroll, Math.min(0, state.settingsScrollY));

    var y = contentTop + state.settingsScrollY;
    var titleY0 = contentTop + 22;
    var titleY = y + 22;
    y += headerH;

    var backBtn = {
      x: settingsGridX,
      y: titleY0 - 25,
      w: 56,
      h: 50
    };

    var darknessX = settingsGridX;
    var assignmentsX = cols === 1 ? settingsGridX : settingsGridX + settingsColW + colGap;
    var itemsX = settingsGridX;
    var lockersX = cols === 1 ? settingsGridX : settingsGridX + settingsColW + colGap;

    var darknessY = y;
    var assignmentsY = cols === 1 ? darknessY + darknessH : y;
    var row2Y = y + row1H;
    var itemsY = row2Y;
    var lockersY = cols === 1 ? itemsY + itemsH : row2Y;

    var darkness = layoutSettingBlock(darknessX, darknessY, colW, darknessOpts);
    var assignments = layoutSettingBlock(assignmentsX, assignmentsY, colW, assignmentsOpts);
    var items = layoutSettingBlock(itemsX, itemsY, colW, itemsOpts);
    var lockers = layoutSettingBlock(lockersX, lockersY, colW, lockersOpts);

    var mapY = row2Y + row2H;
    var mapSizeLabelY = mapY;
    mapY += 35;
    var mapSlider = placeSingleSlider(settingsGridX, mapY, settingsGridW);
    mapY += 25;
    var mapSliderTextY = mapY;
    mapY += 50;

    var startBtnW = Math.min(280, settingsGridW);
    var startBtn = {
      x: settingsGridX + (settingsGridW - startBtnW) / 2,
      y: mapY,
      w: startBtnW,
      h: 50
    };

    return {
      backBtn: backBtn,
      titleY: titleY,
      darknessLabelY: darkness.labelY,
      darknessToggle: darkness.toggle,
      darknessDescY: darkness.descY,
      darknessSlider: darkness.sliders ? darkness.sliders[0] : darkness.slider,
      darknessSliderTextY: darkness.sliderTextY,
      itemsLabelY: items.labelY,
      itemsToggle: items.toggle,
      itemSliders: items.sliders,
      itemSlidersTextY: items.sliderTextY,
      assignmentsLabelY: assignments.labelY,
      assignmentsToggle: assignments.toggle,
      assignmentSlider: assignments.slider,
      assignmentSliderTextY: assignments.sliderTextY,
      lockersLabelY: lockers.labelY,
      lockersToggle: lockers.toggle,
      lockerSlider: lockers.slider,
      lockerSliderTextY: lockers.sliderTextY,
      mapSizeLabelY: mapSizeLabelY,
      mapSlider: mapSlider,
      mapSliderTextY: mapSliderTextY,
      startBtn: startBtn,
      itemSlidersVertical: verticalItemSliders
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
    state.ctx.font = W < 560 ? 'bold 28px Arial' : 'bold 36px Arial';
    state.ctx.fillText('Game Settings', W / 2, layout.titleY);

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Darkness', layout.darknessToggle.x + layout.darknessToggle.w / 2, layout.darknessLabelY);

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
    state.ctx.fillText(
      state.darknessEnabled ? 'The maze will be shrouded in darkness.' : 'Normal visibility.',
      layout.darknessToggle.x + layout.darknessToggle.w / 2,
      layout.darknessDescY
    );

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
      state.ctx.fillText('Light amount: ' + state.darknessRadiusTiles + ' tiles', slr.x + slr.w / 2, layout.darknessSliderTextY);
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Assignments', layout.assignmentsToggle.x + layout.assignmentsToggle.w / 2, layout.assignmentsLabelY);

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
    state.ctx.fillText('Items', layout.itemsToggle.x + layout.itemsToggle.w / 2, layout.itemsLabelY);

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
        var labelY = layout.itemSlidersVertical ? isl.y + 30 : layout.itemSlidersTextY;
        state.ctx.fillText(labels[i] + ': ' + counts[i], isl.x + isl.w / 2, labelY);
      }
    }

    state.ctx.fillStyle = '#fff';
    state.ctx.font = 'bold 22px Arial';
    state.ctx.fillText('Lockers', layout.lockersToggle.x + layout.lockersToggle.w / 2, layout.lockersLabelY);

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
    var mapText = state.mapSize + ' tiles (' + gridSz + '×' + gridSz + ' grid, ' + F.getTargetDeadEnds(state.mapSize) + ' dead ends)';
    state.ctx.fillText(mapText, W / 2, layout.mapSliderTextY);

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
    state.ctx.font = 'bold 30px Arial';
    state.ctx.textAlign = 'center';
    state.ctx.textBaseline = 'middle';
    state.ctx.fillText('<', bb.x + bb.w / 2, bb.y + bb.h / 2 + 1);
  };
})();
