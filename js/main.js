(function () {
  var F = window.FPEM;
  var state = F.state;
  var FLASHLIGHT_DURATION = F.FLASHLIGHT_DURATION;
  var INVINCIBLE_DURATION = F.INVINCIBLE_DURATION;
  var KITKAT_SLOW_DURATION = F.KITKAT_SLOW_DURATION;
  var MAX_STAMINA = F.MAX_STAMINA;
  var PH = F.PH;
  var PW = F.PW;
  var T = F.T;

  // Eagerly load the Barrio web font so canvas text renders in it without a
  // fallback flash. The render loop redraws every frame, so it picks up the
  // font as soon as the download resolves.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Barrio"');
    document.fonts.load('bold 16px "Barrio"');
  }

  function resize() {
    state.canvas.width = window.innerWidth;
    state.canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Zooming is disabled everywhere (menu and gameplay). The game is a fixed,
  // full-viewport canvas, so browser zoom only ever breaks the layout. The
  // viewport meta tag and `touch-action: none` cover pinch/double-tap zoom on
  // touch devices; the listeners below cover the desktop zoom paths.
  window.addEventListener('wheel', function (e) {
    // Ctrl+wheel zooms the page, and browsers report a trackpad pinch as a
    // wheel event with ctrlKey set, so this covers both.
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    // Ctrl/Cmd with +, -, =, or 0 are the browser zoom shortcuts.
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  });

  // Safari reports pinch-zoom as gesture events rather than ctrl+wheel.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    window.addEventListener(type, function (e) { e.preventDefault(); });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      state.pausedAt = Date.now();
    } else {
      if (state.pausedAt > 0 && state.gameState === 'playing' && !state.assignmentActive) {
        state.startTime += Date.now() - state.pausedAt;
      }
      state.lastTime = performance.now();
      state.pausedAt = 0;
      for (var key in state.keys) state.keys[key] = false;
    }
  });

  state.canvas.addEventListener('mousemove', function (e) {
    var rect = state.canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;

    if (state.gameState === 'settings') {
      var layout = F.getSettingsLayout();
      var maxDE = F.getTargetDeadEnds(state.mapSize);
      if (state.isDraggingSlider && state.darknessEnabled && layout.darknessSlider) {
        var val = (state.mouseX - layout.darknessSlider.x) / layout.darknessSlider.w;
        val = Math.max(0, Math.min(1, val));
        state.darknessRadiusTiles = 15 + Math.round(val * 10);
      } else if (state.draggingItemSlider !== -1 && state.itemsEnabled && layout.itemSliders) {
        var sr = layout.itemSliders[state.draggingItemSlider];
        var val2 = (state.mouseX - sr.x) / sr.w;
        val2 = Math.max(0, Math.min(1, val2));
        var count = Math.round(val2 * maxDE);
        if (state.draggingItemSlider === 0) state.oreoCount = count;
        else if (state.draggingItemSlider === 1) state.kitkatCount = count;
        else if (state.draggingItemSlider === 2) state.appleCount = count;
        else if (state.draggingItemSlider === 3 && state.darknessEnabled) state.flashlightCount = count;
      } else if (state.draggingLockerSlider && state.lockersEnabled && layout.lockerSlider) {
        var srL = layout.lockerSlider;
        var val3 = (state.mouseX - srL.x) / srL.w;
        val3 = Math.max(0, Math.min(1, val3));
        state.lockerCount = Math.round(val3 * maxDE);
      } else if (state.draggingAssignmentSlider && state.assignmentsEnabled && layout.assignmentSlider) {
        var srA = layout.assignmentSlider;
        var valA = (state.mouseX - srA.x) / srA.w;
        valA = Math.max(0, Math.min(1, valA));
        state.assignmentCount = Math.round(valA * Math.ceil(maxDE / 4));
      } else if (state.draggingMapSlider && layout.mapSlider) {
        var srM = layout.mapSlider;
        var val4 = (state.mouseX - srM.x) / srM.w;
        val4 = Math.max(0, Math.min(1, val4));
        state.mapSize = 100 + Math.round(val4 * 150);
        var newMax = F.getTargetDeadEnds(state.mapSize);
        var half = Math.floor(newMax / 2);
        state.oreoCount = half;
        state.kitkatCount = half;
        state.appleCount = half;
        state.flashlightCount = half;
        state.lockerCount = half;
        state.assignmentCount = Math.ceil(newMax / 4);
      }
    }
  });

  state.canvas.addEventListener('mousedown', function () {
    if (state.gameState === 'settings') {
      var layout = F.getSettingsLayout();
      var maxDE2 = F.getTargetDeadEnds(state.mapSize);
      if (state.darknessEnabled && layout.darknessSlider) {
        var srD = layout.darknessSlider;
        if (state.mouseX >= srD.x - 10 && state.mouseX <= srD.x + srD.w + 10 && state.mouseY >= srD.y - 10 && state.mouseY <= srD.y + srD.h + 10) {
          state.isDraggingSlider = true;
          var vd = (state.mouseX - srD.x) / srD.w;
          vd = Math.max(0, Math.min(1, vd));
          state.darknessRadiusTiles = 15 + Math.round(vd * 10);
          return;
        }
      }
      if (state.itemsEnabled && layout.itemSliders) {
        var numSliders = state.darknessEnabled ? 4 : 3;
        for (var i = 0; i < numSliders; i++) {
          var sri = layout.itemSliders[i];
          if (state.mouseX >= sri.x - 10 && state.mouseX <= sri.x + sri.w + 10 && state.mouseY >= sri.y - 10 && state.mouseY <= sri.y + sri.h + 10) {
            state.draggingItemSlider = i;
            var vi = (state.mouseX - sri.x) / sri.w;
            vi = Math.max(0, Math.min(1, vi));
            var count2 = Math.round(vi * maxDE2);
            if (i === 0) state.oreoCount = count2;
            else if (i === 1) state.kitkatCount = count2;
            else if (i === 2) state.appleCount = count2;
            else if (i === 3 && state.darknessEnabled) state.flashlightCount = count2;
            return;
          }
        }
      }
      if (state.assignmentsEnabled && layout.assignmentSlider) {
        var srAssign = layout.assignmentSlider;
        if (state.mouseX >= srAssign.x - 10 && state.mouseX <= srAssign.x + srAssign.w + 10 && state.mouseY >= srAssign.y - 10 && state.mouseY <= srAssign.y + srAssign.h + 10) {
          state.draggingAssignmentSlider = true;
          var va = (state.mouseX - srAssign.x) / srAssign.w;
          va = Math.max(0, Math.min(1, va));
          state.assignmentCount = Math.round(va * Math.ceil(maxDE2 / 4));
          return;
        }
      }
      if (state.lockersEnabled && layout.lockerSlider) {
        var srLock = layout.lockerSlider;
        if (state.mouseX >= srLock.x - 10 && state.mouseX <= srLock.x + srLock.w + 10 && state.mouseY >= srLock.y - 10 && state.mouseY <= srLock.y + srLock.h + 10) {
          state.draggingLockerSlider = true;
          var vlock = (state.mouseX - srLock.x) / srLock.w;
          vlock = Math.max(0, Math.min(1, vlock));
          state.lockerCount = Math.round(vlock * maxDE2);
          return;
        }
      }
      if (layout.mapSlider) {
        var srMap = layout.mapSlider;
        if (state.mouseX >= srMap.x - 10 && state.mouseX <= srMap.x + srMap.w + 10 && state.mouseY >= srMap.y - 10 && state.mouseY <= srMap.y + srMap.h + 10) {
          state.draggingMapSlider = true;
          var vm = (state.mouseX - srMap.x) / srMap.w;
          vm = Math.max(0, Math.min(1, vm));
          state.mapSize = 100 + Math.round(vm * 150);
          var newMax2 = F.getTargetDeadEnds(state.mapSize);
          var half2 = Math.floor(newMax2 / 2);
          state.oreoCount = half2;
          state.kitkatCount = half2;
          state.appleCount = half2;
          state.flashlightCount = half2;
          state.lockerCount = half2;
          state.assignmentCount = Math.ceil(newMax2 / 4);
          return;
        }
      }
    }
  });

  state.canvas.addEventListener('wheel', function (e) {
    if (state.gameState === 'settings') {
      state.settingsScrollY -= e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  state.canvas.addEventListener('mouseup', function () {
    state.isDraggingSlider = false;
    state.draggingItemSlider = -1;
    state.draggingAssignmentSlider = false;
    state.draggingLockerSlider = false;
    state.draggingMapSlider = false;
  });

  state.canvas.addEventListener('click', function () {
    if (state.gameState === 'menu') {
      var btn = F.getHoveredButton();
      if (btn && btn.active) {
        if (btn.label === 'Randomize') {
          state.settingsStartLaunchesNewRound = true;
          state.gameState = 'settings';
        }
      }
    } else if (state.gameState === 'settings') {
      var layout2 = F.getSettingsLayout();
      var backBtn = layout2.backBtn;
      if (state.mouseX >= backBtn.x && state.mouseX <= backBtn.x + backBtn.w && state.mouseY >= backBtn.y && state.mouseY <= backBtn.y + backBtn.h) {
        state.gameState = 'menu';
        return;
      }
      if (state.mouseX >= layout2.darknessToggle.x && state.mouseX <= layout2.darknessToggle.x + layout2.darknessToggle.w && state.mouseY >= layout2.darknessToggle.y && state.mouseY <= layout2.darknessToggle.y + layout2.darknessToggle.h) {
        state.darknessEnabled = !state.darknessEnabled;
      }
      if (state.mouseX >= layout2.itemsToggle.x && state.mouseX <= layout2.itemsToggle.x + layout2.itemsToggle.w && state.mouseY >= layout2.itemsToggle.y && state.mouseY <= layout2.itemsToggle.y + layout2.itemsToggle.h) {
        state.itemsEnabled = !state.itemsEnabled;
      }
      if (state.mouseX >= layout2.assignmentsToggle.x && state.mouseX <= layout2.assignmentsToggle.x + layout2.assignmentsToggle.w && state.mouseY >= layout2.assignmentsToggle.y && state.mouseY <= layout2.assignmentsToggle.y + layout2.assignmentsToggle.h) {
        state.assignmentsEnabled = !state.assignmentsEnabled;
        if (state.assignmentsEnabled && state.assignmentCount === 0) state.assignmentCount = Math.ceil(F.getTargetDeadEnds(state.mapSize) / 4);
      }
      if (state.mouseX >= layout2.lockersToggle.x && state.mouseX <= layout2.lockersToggle.x + layout2.lockersToggle.w && state.mouseY >= layout2.lockersToggle.y && state.mouseY <= layout2.lockersToggle.y + layout2.lockersToggle.h) {
        state.lockersEnabled = !state.lockersEnabled;
      }
      var sbtn = layout2.startBtn;
      if (state.mouseX >= sbtn.x && state.mouseX <= sbtn.x + sbtn.w && state.mouseY >= sbtn.y && state.mouseY <= sbtn.y + sbtn.h) {
        if (state.settingsStartLaunchesNewRound) F.startGame();
        else F.beginGameplay();
      }
    } else if (state.gameState === 'won' || state.gameState === 'lost') {
      var btn2 = F.getHoveredEndGameButton();
      if (btn2 && btn2.active) {
        if (btn2.label === 'New Round') F.startGame();
        else if (btn2.label === 'Game Settings') {
          state.settingsStartLaunchesNewRound = true;
          state.gameState = 'settings';
        }
        else if (btn2.label === 'Main Menu') state.gameState = 'menu';
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    state.keys[e.key] = true;

    if (state.assignmentActive) {
      if (e.key === 'Enter') {
        e.preventDefault();
        F.finishAssignmentChallenge(parseInt(state.assignmentAnswer, 10) === state.assignmentA * state.assignmentB);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        state.assignmentAnswer = state.assignmentAnswer.slice(0, -1);
      } else if (/^[0-9]$/.test(e.key) && state.assignmentAnswer.length < 3) {
        e.preventDefault();
        state.assignmentAnswer += e.key;
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) e.preventDefault();

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (state.gameState === 'playing' && !state.won && !state.lost) {
        if (state.playerInLocker) {
          state.playerInLocker = false;
          state.lockerTimer = 0;
          state.activeLockerIndex = -1;
          F.recalcEnemyPath();
        } else {
          for (var li = 0; li < state.lockers.length; li++) {
            var locker = state.lockers[li];
            if (locker.used) continue;
            if (state.player.x + PW / 2 > locker.x - 2 * T && state.player.x - PW / 2 < locker.x + locker.w + 2 * T &&
              state.player.y + PH / 2 > locker.y - 2 * T && state.player.y - PH / 2 < locker.y + locker.h + 2 * T) {
              state.playerInLocker = true;
              state.lockerTimer = 5;
              state.activeLockerIndex = li;
              locker.used = true;
              F.recalcEnemyPath();
              break;
            }
          }
        }
      }
    }

    if ((e.key === 'i' || e.key === 'I') && (state.gameState === 'won' || state.gameState === 'lost' || state.gameState === 'playing')) {
      F.startGame();
    }

    if ((e.key === 'o' || e.key === 'O') && state.gameState === 'playing') {
      state.gameState = 'menu';
      state.won = false;
      state.lost = false;
      state.bgMusic.pause();
      state.bgMusic.currentTime = 0;
    }

    if ((e.key === 'p' || e.key === 'P') && state.gameState === 'playing' && !state.won && !state.lost) {
      e.preventDefault();
      state.gameState = 'settings';
      state.bgMusic.pause();
      state.settingsStartLaunchesNewRound = true;
    }

    if ((e.key === 'a' || e.key === 'A') && state.gameState === 'playing') {
      if (state.inventory[0] === 'oreo') { state.inventory[0] = null; state.invincibleTimers.push(INVINCIBLE_DURATION); }
      else if (state.inventory[0] === 'kitkat') { state.inventory[0] = null; state.kitkatSlowTimers.push(KITKAT_SLOW_DURATION); }
      else if (state.inventory[0] === 'apple') { state.inventory[0] = null; state.stamina = Math.min(MAX_STAMINA, state.stamina + MAX_STAMINA / 2); state.sprintExhausted = false; }
      else if (state.inventory[0] === 'flashlight') { state.inventory[0] = null; state.flashlightTimers.push(FLASHLIGHT_DURATION); }
    }
    if ((e.key === 's' || e.key === 'S') && state.gameState === 'playing') {
      if (state.inventory[1] === 'oreo') { state.inventory[1] = null; state.invincibleTimers.push(INVINCIBLE_DURATION); }
      else if (state.inventory[1] === 'kitkat') { state.inventory[1] = null; state.kitkatSlowTimers.push(KITKAT_SLOW_DURATION); }
      else if (state.inventory[1] === 'apple') { state.inventory[1] = null; state.stamina = Math.min(MAX_STAMINA, state.stamina + MAX_STAMINA / 2); state.sprintExhausted = false; }
      else if (state.inventory[1] === 'flashlight') { state.inventory[1] = null; state.flashlightTimers.push(FLASHLIGHT_DURATION); }
    }
    if ((e.key === 'd' || e.key === 'D') && state.gameState === 'playing') {
      if (state.inventory[2] === 'oreo') { state.inventory[2] = null; state.invincibleTimers.push(INVINCIBLE_DURATION); }
      else if (state.inventory[2] === 'kitkat') { state.inventory[2] = null; state.kitkatSlowTimers.push(KITKAT_SLOW_DURATION); }
      else if (state.inventory[2] === 'apple') { state.inventory[2] = null; state.stamina = Math.min(MAX_STAMINA, state.stamina + MAX_STAMINA / 2); state.sprintExhausted = false; }
      else if (state.inventory[2] === 'flashlight') { state.inventory[2] = null; state.flashlightTimers.push(FLASHLIGHT_DURATION); }
    }
  });
  document.addEventListener('keyup', function (e) { state.keys[e.key] = false; });

  function loop() {
    F.update();
    if (state.gameState === 'menu') F.renderMenu();
    else if (state.gameState === 'settings') F.renderSettings();
    else F.renderGame();
    requestAnimationFrame(loop);
  }
  loop();
})();
