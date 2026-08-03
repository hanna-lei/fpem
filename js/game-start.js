(function () {
  var F = window.FPEM;
  var state = F.state;
  var B = F.B, MAX_STAMINA = F.MAX_STAMINA, T = F.T, WALL_W = F.WALL_W;

  F.shuffleInPlace = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  };

  F.cellKey = function (r, c) { return r + ',' + c; };

  F.beginGameplay = function () {
    if (!state.roundPrepared) return;
    state.won = false;
    state.lost = false;
    state.startTime = Date.now();
    state.elapsed = '0.0';
    state.gameState = 'playing';
    state.lastTime = performance.now();
    state.bgMusic.play();
  };

  F.startGame = function (options) {
    options = options || {};
    var autoStart = options.autoStart !== undefined ? options.autoStart : true;
    state.settingsStartLaunchesNewRound = false;

    F.rebuildMapGrid(state.mapSize);
    var targetDE = F.getTargetDeadEnds(state.mapSize);

    var masterSeed = Date.now();
    state.exitCorner = F.chooseExitCorner(masterSeed);
    state.enemyVariant = F.chooseEnemyVariant(masterSeed);

    if (state.enemyVariant) {
      state.EW = state.enemyVariant.w;
      state.EH = state.enemyVariant.h;
      state.BASE_ENEMY_SPEED = state.enemyVariant.speed;
    } else {
      state.EW = 0;
      state.EH = 0;
      state.BASE_ENEMY_SPEED = 0;
    }
    state.currentEnemySpeed = state.BASE_ENEMY_SPEED;

    var chosenSeed = 0;
    var attempt;
    for (attempt = 0; attempt < 500; attempt++) {
      var trySeed = (Math.random() * 2147483647) | 0;
      F.generateMaze(trySeed, targetDE);

      var nonExitCorners = F.getNonExitCorners();
      var allReachable = true;
      for (var ci = 0; ci < nonExitCorners.length; ci++) {
        var cornerName = nonExitCorners[ci];
        var corner = F.getCornerPos(cornerName);
        if (!F.bfsReachable(state.startTX, state.startTY, corner.x, corner.y, state.exitTX, state.exitTY)) {
          allReachable = false;
          break;
        }
      }
      if (allReachable && F.findDeadEnds().length === targetDE) {
        chosenSeed = trySeed;
        break;
      }
    }

    F.preRenderMaze();

    state.player.x = state.startTX * T;
    state.player.y = state.startTY * T;
    state.player.dir = 0;

    state.exitX = state.exitTX * T;
    state.exitY = state.exitTY * T;

    state.playerSlowed = false;
    state.playerStunned = false;
    state.stunTimer = 0;
    state.thavelStunCooldown = 0;

    state.bloomieState = 'ready';
    state.bloomieBoostTimer = 0;
    state.bloomieExhaustTimer = 0;
    state.bloomieCooldown = 0;

    state.enemy.x = state.startTX * T;
    state.enemy.y = state.startTY * T;
    state.enemy.active = false;
    state.enemy.dir = 0;

    state.enemyWaypoints = [];
    state.enemyWpIdx = 0;
    state.enemyMoving = false;

    state.enemyRepathTimer = 0;

    state.spriteAnimTimer = 0;
    state.spriteAnimFrame = 0;
    state.spriteAnimDir = 1;

    state.won = false;
    state.lost = false;
    state.elapsed = '0.0';

    state.stamina = MAX_STAMINA;
    state.sprinting = false;
    state.sprintExhausted = false;

    state.invincible = false;
    state.invincibleTimers.length = 0;
    state.invincibleStacks = 0;

    state.kitkatSlowTimers.length = 0;
    state.kitkatSlowActive = false;

    state.flashlightTimers.length = 0;
    state.flashlightActive = false;
    state.assignmentActive = false;
    state.assignmentPausedAt = 0;
    state.assignmentPausedMs = 0;
    state.assignmentAnswer = '';
    state.assignmentTimeLeft = 0;
    state.activeAssignment = null;
    state.assignmentsCompleted = 0;
    state.assignmentTeacherStunTimer = 0;
    state.assignmentTeacherBoostTimer = 0;

    state.roundPrepared = true;

    state.inventory[0] = null; state.inventory[1] = null; state.inventory[2] = null;
    state.oreos.length = 0;
    state.assignments.length = 0;
    state.kitkats.length = 0;
    state.apples.length = 0;
    state.flashlights.length = 0;
    state.lockers.length = 0;
    state.playerInLocker = false;
    state.lockerTimer = 0;
    state.activeLockerIndex = -1;

    var startCell = F.pxToCell(state.startTX * T, state.startTY * T);
    var exitCell = F.pxToCell(state.exitX, state.exitY);

    var deadEnds = F.findDeadEnds().filter(function (rc) {
      return !(rc[0] === startCell.r && rc[1] === startCell.c) &&
        !(rc[0] === exitCell.r && rc[1] === exitCell.c);
    });

    F.shuffleInPlace(deadEnds);

    var numOreos = state.itemsEnabled ? state.oreoCount : 0;
    var oreoPlacements = deadEnds.slice(0, numOreos);

    for (var oi = 0; oi < oreoPlacements.length; oi++) {
      var ore = oreoPlacements[oi];
      var r = ore[0], c = ore[1];
      var center = F.cellCenterPx(r, c);
      state.oreos.push({ x: center.x, y: center.y, collected: false, r: r, c: c });
    }

    var oreoDeadEndKeys = {};
    for (var ok = 0; ok < oreoPlacements.length; ok++) {
      oreoDeadEndKeys[F.cellKey(oreoPlacements[ok][0], oreoPlacements[ok][1])] = true;
    }

    var numKitkats = state.itemsEnabled ? state.kitkatCount : 0;
    var deadEndSet = {};
    var deList = F.findDeadEnds();
    for (var di = 0; di < deList.length; di++) {
      deadEndSet[F.cellKey(deList[di][0], deList[di][1])] = true;
    }
    var blocked = {};
    blocked[F.cellKey(startCell.r, startCell.c)] = true;
    blocked[F.cellKey(exitCell.r, exitCell.c)] = true;
    for (var bi = 0; bi < oreoPlacements.length; bi++) {
      blocked[F.cellKey(oreoPlacements[bi][0], oreoPlacements[bi][1])] = true;
    }

    var kitkatCandidates = [];
    var kr, kc, k;
    for (kr = 0; kr < state.rows; kr++) for (kc = 0; kc < state.cols; kc++) {
      k = F.cellKey(kr, kc);
      if (blocked[k] || deadEndSet[k]) continue;
      if (Math.abs(kr - startCell.r) <= 1 && Math.abs(kc - startCell.c) <= 1) continue;
      if (Math.abs(kr - exitCell.r) <= 1 && Math.abs(kc - exitCell.c) <= 1) continue;
      if ((kr === 0 && kc === 0) || (kr === 0 && kc === state.cols - 1) ||
        (kr === state.rows - 1 && kc === 0) || (kr === state.rows - 1 && kc === state.cols - 1)) continue;
      kitkatCandidates.push([kr, kc]);
    }
    F.shuffleInPlace(kitkatCandidates);

    while (state.kitkats.length < numKitkats && kitkatCandidates.length > 0) {
      var kk = kitkatCandidates.pop();
      var kkr = kk[0], kkc = kk[1];
      var kcenter = F.cellCenterPx(kkr, kkc);
      state.kitkats.push({ x: kcenter.x, y: kcenter.y, collected: false, r: kkr, c: kkc });
      blocked[F.cellKey(kkr, kkc)] = true;
    }

    var numApples = state.itemsEnabled ? state.appleCount : 0;
    var appleCandidates = [];
    var ar, ac;
    for (ar = 0; ar < state.rows; ar++) for (ac = 0; ac < state.cols; ac++) {
      k = F.cellKey(ar, ac);
      if (blocked[k] || deadEndSet[k]) continue;
      if (Math.abs(ar - startCell.r) <= 1 && Math.abs(ac - startCell.c) <= 1) continue;
      if (Math.abs(ar - exitCell.r) <= 1 && Math.abs(ac - exitCell.c) <= 1) continue;
      if ((ar === 0 && ac === 0) || (ar === 0 && ac === state.cols - 1) ||
        (ar === state.rows - 1 && ac === 0) || (ar === state.rows - 1 && ac === state.cols - 1)) continue;
      appleCandidates.push([ar, ac]);
    }
    F.shuffleInPlace(appleCandidates);

    while (state.apples.length < numApples && appleCandidates.length > 0) {
      var ap = appleCandidates.pop();
      var ar_ = ap[0], ac_ = ap[1];
      var acenter = F.cellCenterPx(ar_, ac_);
      state.apples.push({ x: acenter.x, y: acenter.y, collected: false, r: ar_, c: ac_ });
      blocked[F.cellKey(ar_, ac_)] = true;
    }

    var numFlashlights = (state.itemsEnabled && state.darknessEnabled) ? state.flashlightCount : 0;
    var flashlightCandidates = [];
    var fr, fc;
    for (fr = 0; fr < state.rows; fr++) for (fc = 0; fc < state.cols; fc++) {
      k = F.cellKey(fr, fc);
      if (blocked[k] || deadEndSet[k]) continue;
      if (Math.abs(fr - startCell.r) <= 1 && Math.abs(fc - startCell.c) <= 1) continue;
      if (Math.abs(fr - exitCell.r) <= 1 && Math.abs(fc - exitCell.c) <= 1) continue;
      if ((fr === 0 && fc === 0) || (fr === 0 && fc === state.cols - 1) ||
        (fr === state.rows - 1 && fc === 0) || (fr === state.rows - 1 && fc === state.cols - 1)) continue;
      flashlightCandidates.push([fr, fc]);
    }
    F.shuffleInPlace(flashlightCandidates);

    while (state.flashlights.length < numFlashlights && flashlightCandidates.length > 0) {
      var fl = flashlightCandidates.pop();
      var fr_ = fl[0], fc_ = fl[1];
      var fcenter = F.cellCenterPx(fr_, fc_);
      state.flashlights.push({ x: fcenter.x, y: fcenter.y, collected: false, r: fr_, c: fc_ });
      blocked[F.cellKey(fr_, fc_)] = true;
    }

    var numAssignments = state.assignmentsEnabled ? Math.min(state.assignmentCount, Math.ceil(targetDE / 4)) : 0;
    var assignmentCandidates = [];
    var cr, cc;
    for (cr = 0; cr < state.rows; cr++) for (cc = 0; cc < state.cols; cc++) {
      k = F.cellKey(cr, cc);
      if (blocked[k] || deadEndSet[k]) continue;
      if (Math.abs(cr - startCell.r) <= 1 && Math.abs(cc - startCell.c) <= 1) continue;
      if (Math.abs(cr - exitCell.r) <= 1 && Math.abs(cc - exitCell.c) <= 1) continue;
      if ((cr === 0 && cc === 0) || (cr === 0 && cc === state.cols - 1) ||
        (cr === state.rows - 1 && cc === 0) || (cr === state.rows - 1 && cc === state.cols - 1)) continue;
      assignmentCandidates.push([cr, cc]);
    }
    F.shuffleInPlace(assignmentCandidates);

    while (state.assignments.length < numAssignments && assignmentCandidates.length > 0) {
      var asg = assignmentCandidates.pop();
      var asr = asg[0], asc = asg[1];
      var ascenter = F.cellCenterPx(asr, asc);
      state.assignments.push({ x: ascenter.x, y: ascenter.y, collected: false, r: asr, c: asc });
      blocked[F.cellKey(asr, asc)] = true;
    }

    function getLockerSpotsForCell(r, c) {
      var validSpots = [];
      if (r > 0 && state.hSegWall[r][c] === 1) {
        var wx = state.vLines[c] + WALL_W;
        var wy = state.hLines[r];
        var wallW = (c + 1 < state.vLines.length ? state.vLines[c + 1] : state.MAP - B) - wx;
        var lw = Math.min(5, wallW);
        var lx = wx + Math.floor((wallW - lw) / 2);
        validSpots.push({ x: lx * T, y: wy * T, w: lw * T, h: WALL_W * T, used: false });
      }
      if (r < state.rows - 1 && state.hSegWall[r + 1][c] === 1) {
        var wx2 = state.vLines[c] + WALL_W;
        var wy2 = state.hLines[r + 1];
        var wallW2 = (c + 1 < state.vLines.length ? state.vLines[c + 1] : state.MAP - B) - wx2;
        var lw2 = Math.min(5, wallW2);
        var lx2 = wx2 + Math.floor((wallW2 - lw2) / 2);
        validSpots.push({ x: lx2 * T, y: wy2 * T, w: lw2 * T, h: WALL_W * T, used: false });
      }
      if (c > 0 && state.vSegWall[r][c] === 1) {
        var wx3 = state.vLines[c];
        var wy3 = state.hLines[r] + WALL_W;
        var wallH = (r + 1 < state.hLines.length ? state.hLines[r + 1] : state.MAP - B) - wy3;
        var lh = Math.min(5, wallH);
        var ly = wy3 + Math.floor((wallH - lh) / 2);
        validSpots.push({ x: wx3 * T, y: ly * T, w: WALL_W * T, h: lh * T, used: false });
      }
      if (c < state.cols - 1 && state.vSegWall[r][c + 1] === 1) {
        var wx4 = state.vLines[c + 1];
        var wy4 = state.hLines[r] + WALL_W;
        var wallH2 = (r + 1 < state.hLines.length ? state.hLines[r + 1] : state.MAP - B) - wy4;
        var lh2 = Math.min(5, wallH2);
        var ly2 = wy4 + Math.floor((wallH2 - lh2) / 2);
        validSpots.push({ x: wx4 * T, y: ly2 * T, w: WALL_W * T, h: lh2 * T, used: false });
      }
      return validSpots;
    }

    var numLockers = state.lockersEnabled ? state.lockerCount : 0;
    var usedLockerCells = {};

    var li, lj, lr, lc, ck, spots;
    for (li = 0; li < deadEnds.length; li++) {
      if (state.lockers.length >= numLockers) break;
      lr = deadEnds[li][0]; lc = deadEnds[li][1];
      ck = F.cellKey(lr, lc);
      if (oreoDeadEndKeys[ck]) continue;
      if (usedLockerCells[ck]) continue;
      spots = getLockerSpotsForCell(lr, lc);
      if (spots.length > 0) {
        state.lockers.push(spots[F.rngInt(spots.length)]);
        usedLockerCells[ck] = true;
      }
    }

    for (lj = 0; lj < deadEnds.length; lj++) {
      if (state.lockers.length >= numLockers) break;
      lr = deadEnds[lj][0]; lc = deadEnds[lj][1];
      ck = F.cellKey(lr, lc);
      if (!oreoDeadEndKeys[ck]) continue;
      if (usedLockerCells[ck]) continue;
      spots = getLockerSpotsForCell(lr, lc);
      if (spots.length > 0) {
        state.lockers.push(spots[F.rngInt(spots.length)]);
        usedLockerCells[ck] = true;
      }
    }

    if (state.lockers.length < numLockers) {
      var fallbackCells = [];
      for (var fr2 = 1; fr2 < state.rows - 1; fr2++) for (var fc2 = 1; fc2 < state.cols - 1; fc2++) {
        ck = F.cellKey(fr2, fc2);
        if (usedLockerCells[ck]) continue;
        if (deadEndSet[ck]) continue;
        spots = getLockerSpotsForCell(fr2, fc2);
        if (spots.length > 0) fallbackCells.push({ r: fr2, c: fc2, spots: spots });
      }
      F.shuffleInPlace(fallbackCells);
      for (var fi = 0; fi < fallbackCells.length; fi++) {
        if (state.lockers.length >= numLockers) break;
        var fb = fallbackCells[fi];
        state.lockers.push(fb.spots[F.rngInt(fb.spots.length)]);
        usedLockerCells[F.cellKey(fb.r, fb.c)] = true;
      }
    }

    if (autoStart) {
      F.beginGameplay();
    } else {
      state.gameState = 'settings';
      state.bgMusic.pause();
    }

    console.log('Seed: ' + chosenSeed + ', Exit: ' + state.exitCorner + ', Enemy: ' + (state.enemyVariant ? state.enemyVariant.name : 'None'));
  };
})();
