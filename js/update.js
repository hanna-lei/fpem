(function () {
  var F = window.FPEM;
  var state = F.state;
  var BLOOMIE_BOOST_AMOUNT = F.BLOOMIE_BOOST_AMOUNT;
  var BLOOMIE_BOOST_DURATION = F.BLOOMIE_BOOST_DURATION;
  var BLOOMIE_COOLDOWN = F.BLOOMIE_COOLDOWN;
  var BLOOMIE_SLOW_AMOUNT = F.BLOOMIE_SLOW_AMOUNT;
  var BLOOMIE_SLOW_DURATION = F.BLOOMIE_SLOW_DURATION;
  var ASSIGNMENT_CHALLENGE_DURATION = F.ASSIGNMENT_CHALLENGE_DURATION;
  var ASSIGNMENT_TEACHER_BOOST_DURATION = F.ASSIGNMENT_TEACHER_BOOST_DURATION;
  var ASSIGNMENT_TEACHER_SPEED_BOOST = F.ASSIGNMENT_TEACHER_SPEED_BOOST;
  var CIRCLE_AURA_RADIUS = F.CIRCLE_AURA_RADIUS;
  var CIRCLE_SLOW_AMOUNT = F.CIRCLE_SLOW_AMOUNT;
  var ENEMY_REPATH_INTERVAL = F.ENEMY_REPATH_INTERVAL;
  var ENEMY_SPAWN_DELAY = F.ENEMY_SPAWN_DELAY;
  var KITKAT_SLOW_MULT = F.KITKAT_SLOW_MULT;
  var MAX_STAMINA = F.MAX_STAMINA;
  var OREO_SPEED_BOOST = F.OREO_SPEED_BOOST;
  var PLAYER_SPEED = F.PLAYER_SPEED;
  var PW = F.PW;
  var PH = F.PH;
  var SPRINT_BOOST = F.SPRINT_BOOST;
  var SPRINT_MIN_STAMINA = F.SPRINT_MIN_STAMINA;
  var SPRITE_ANIM_FPS = F.SPRITE_ANIM_FPS;
  var STAMINA_DRAIN = F.STAMINA_DRAIN;
  var STAMINA_REGEN = F.STAMINA_REGEN;
  var T = F.T;
  var THAVEL_STUN_COOLDOWN = F.THAVEL_STUN_COOLDOWN;
  var THAVEL_STUN_DURATION = F.THAVEL_STUN_DURATION;
  var THAVEL_STUN_RADIUS = F.THAVEL_STUN_RADIUS;

  F.getElapsedSec = function () {
    var activePauseMs = state.assignmentActive && state.assignmentPausedAt > 0 ? Date.now() - state.assignmentPausedAt : 0;
    return Math.max(0, (Date.now() - state.startTime - state.assignmentPausedMs - activePauseMs) / 1000);
  };

  F.remainingAssignments = function () {
    var remaining = 0;
    for (var i = 0; i < state.assignments.length; i++) {
      if (!state.assignments[i].collected) remaining++;
    }
    return remaining;
  };

  F.startAssignmentChallenge = function (assignment) {
    state.activeAssignment = assignment;
    state.assignmentA = Math.floor(Math.random() * 13);
    state.assignmentB = Math.floor(Math.random() * 13);
    state.assignmentAnswer = '';
    state.assignmentTimeLeft = ASSIGNMENT_CHALLENGE_DURATION;
    state.assignmentPausedAt = Date.now();
    state.assignmentActive = true;
    state.sprinting = false;
    for (var key in state.keys) state.keys[key] = false;
  };

  F.finishAssignmentChallenge = function (correct) {
    if (!state.assignmentActive) return;
    var timeLeft = Math.max(0, state.assignmentTimeLeft);
    state.assignmentActive = false;
    if (state.assignmentPausedAt > 0) {
      state.assignmentPausedMs += Date.now() - state.assignmentPausedAt;
      state.assignmentPausedAt = 0;
    }
    if (state.activeAssignment && !state.activeAssignment.collected) {
      state.activeAssignment.collected = true;
      state.assignmentsCompleted++;
    }
    state.activeAssignment = null;
    state.assignmentTimeLeft = 0;
    state.assignmentAnswer = '';
    if (correct) {
      state.assignmentTeacherStunTimer = Math.max(3, timeLeft * 1.5);
      state.assignmentTeacherBoostTimer = 0;
      state.playerSlowed = false;
      state.playerStunned = false;
      state.stunTimer = 0;
      F.recalcEnemyPath();
    } else {
      state.assignmentTeacherBoostTimer = ASSIGNMENT_TEACHER_BOOST_DURATION;
      state.assignmentTeacherStunTimer = 0;
    }
    state.lastTime = performance.now();
  };

  F.update = function () {
    var now = performance.now();
    var dt = Math.min((now - state.lastTime) / 1000, 1 / 15);
    state.lastTime = now;

    if (state.gameState !== 'playing') return;
    if (state.won || state.lost) return;

    if (state.assignmentActive) {
      state.assignmentTimeLeft -= dt;
      if (state.assignmentTimeLeft <= 0) F.finishAssignmentChallenge(false);
      return;
    }

    var elapsedSec = F.getElapsedSec();
    state.elapsed = elapsedSec.toFixed(1);

    if (state.stunTimer > 0) {
      state.stunTimer -= dt;
      if (state.stunTimer <= 0) { state.stunTimer = 0; state.playerStunned = false; }
    }
    if (state.thavelStunCooldown > 0) {
      state.thavelStunCooldown -= dt;
      if (state.thavelStunCooldown < 0) state.thavelStunCooldown = 0;
    }

    for (var ii = state.invincibleTimers.length - 1; ii >= 0; ii--) {
      state.invincibleTimers[ii] -= dt;
      if (state.invincibleTimers[ii] <= 0) state.invincibleTimers.splice(ii, 1);
    }
    state.invincibleStacks = state.invincibleTimers.length;
    state.invincible = state.invincibleStacks > 0;

    for (var ki = state.kitkatSlowTimers.length - 1; ki >= 0; ki--) {
      state.kitkatSlowTimers[ki] -= dt;
      if (state.kitkatSlowTimers[ki] <= 0) state.kitkatSlowTimers.splice(ki, 1);
    }
    state.kitkatSlowActive = state.kitkatSlowTimers.length > 0;

    for (var fi = state.flashlightTimers.length - 1; fi >= 0; fi--) {
      state.flashlightTimers[fi] -= dt;
      if (state.flashlightTimers[fi] <= 0) state.flashlightTimers.splice(fi, 1);
    }
    state.flashlightActive = state.flashlightTimers.length > 0;

    if (state.assignmentTeacherStunTimer > 0) {
      state.assignmentTeacherStunTimer -= dt;
      if (state.assignmentTeacherStunTimer < 0) state.assignmentTeacherStunTimer = 0;
    }
    if (state.assignmentTeacherBoostTimer > 0) {
      state.assignmentTeacherBoostTimer -= dt;
      if (state.assignmentTeacherBoostTimer < 0) state.assignmentTeacherBoostTimer = 0;
    }

    if (state.enemy.active && state.enemyVariant.name === 'Miss Bloomie') {
      if (state.bloomieState === 'ready') {
        state.bloomieState = 'boosted';
        state.bloomieBoostTimer = BLOOMIE_BOOST_DURATION;
      } else if (state.bloomieState === 'boosted') {
        state.bloomieBoostTimer -= dt;
        if (state.bloomieBoostTimer <= 0) {
          state.bloomieBoostTimer = 0;
          state.bloomieState = 'exhausted';
          state.bloomieExhaustTimer = BLOOMIE_SLOW_DURATION;
        }
      } else if (state.bloomieState === 'exhausted') {
        state.bloomieExhaustTimer -= dt;
        if (state.bloomieExhaustTimer <= 0) {
          state.bloomieExhaustTimer = 0;
          state.bloomieState = 'cooldown';
          state.bloomieCooldown = BLOOMIE_COOLDOWN;
        }
      } else if (state.bloomieState === 'cooldown') {
        state.bloomieCooldown -= dt;
        if (state.bloomieCooldown <= 0) { state.bloomieCooldown = 0; state.bloomieState = 'ready'; }
      }

      if (state.invincible) state.currentEnemySpeed = state.BASE_ENEMY_SPEED;
      else if (state.bloomieState === 'boosted') state.currentEnemySpeed = state.BASE_ENEMY_SPEED + BLOOMIE_BOOST_AMOUNT;
      else if (state.bloomieState === 'exhausted') state.currentEnemySpeed = state.BASE_ENEMY_SPEED - BLOOMIE_SLOW_AMOUNT;
      else state.currentEnemySpeed = state.BASE_ENEMY_SPEED;
    } else {
      state.currentEnemySpeed = state.BASE_ENEMY_SPEED;
    }

    if (state.kitkatSlowActive) state.currentEnemySpeed *= KITKAT_SLOW_MULT;
    if (state.playerInLocker) state.currentEnemySpeed *= 0.85;
    if (state.assignmentTeacherBoostTimer > 0) state.currentEnemySpeed *= ASSIGNMENT_TEACHER_SPEED_BOOST;
    if (state.assignmentTeacherStunTimer > 0) state.currentEnemySpeed = 0;

    state.playerSlowed = false;
    if (state.enemy.active && state.assignmentTeacherStunTimer <= 0 && state.enemyVariant.name === 'Miss Circle' && !state.invincible && !state.playerInLocker) {
      var adx = state.player.x - state.enemy.x, ady = state.player.y - state.enemy.y;
      if (Math.sqrt(adx * adx + ady * ady) <= CIRCLE_AURA_RADIUS) state.playerSlowed = true;
    }

    if (state.enemy.active && state.assignmentTeacherStunTimer <= 0 && state.enemyVariant.name === 'Miss Thavel' && state.thavelStunCooldown <= 0 && !state.playerStunned && !state.invincible && !state.playerInLocker) {
      var adx2 = state.player.x - state.enemy.x, ady2 = state.player.y - state.enemy.y;
      if (Math.sqrt(adx2 * adx2 + ady2 * ady2) <= THAVEL_STUN_RADIUS) {
        state.playerStunned = true;
        state.stunTimer = THAVEL_STUN_DURATION;
        state.thavelStunCooldown = THAVEL_STUN_COOLDOWN;
      }
    }

    if (state.invincible && state.playerStunned) { state.playerStunned = false; state.stunTimer = 0; }

    if (state.playerInLocker) {
      state.lockerTimer -= dt;
      if (state.lockerTimer <= 0) {
        state.playerInLocker = false;
        state.lockerTimer = 0;
        state.activeLockerIndex = -1;
        F.recalcEnemyPath();
      }
    }

    if (!state.playerStunned && !state.playerInLocker) {
      var dx = 0, dy = 0;
      if (state.keys['ArrowUp']) dy -= 1;
      if (state.keys['ArrowDown']) dy += 1;
      if (state.keys['ArrowLeft']) dx -= 1;
      if (state.keys['ArrowRight']) dx += 1;

      var isMoving = dx !== 0 || dy !== 0;
      var wantSprint = (state.keys['z'] || state.keys['Z']) && isMoving;

      if (state.sprintExhausted && state.stamina >= SPRINT_MIN_STAMINA && !(state.keys['z'] || state.keys['Z'])) {
        state.sprintExhausted = false;
      }

      var canStartSprint = !state.sprintExhausted && state.stamina >= SPRINT_MIN_STAMINA;

      var canContinueSprint = state.stamina > 0;

      state.sprinting = wantSprint && (state.sprinting ? canContinueSprint : canStartSprint);

      var currentSpeed = state.playerSlowed ? PLAYER_SPEED - CIRCLE_SLOW_AMOUNT : PLAYER_SPEED;
      if (state.sprinting) currentSpeed += SPRINT_BOOST;
      if (state.invincible) currentSpeed += OREO_SPEED_BOOST * state.invincibleStacks;

      if (dx > 0) state.player.dir = 0; else if (dx < 0) state.player.dir = 2;
      if (dy > 0) state.player.dir = 1; else if (dy < 0) state.player.dir = 3;

      if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

      var moveX = dx * currentSpeed * dt, moveY = dy * currentSpeed * dt;
      var hw = PW / 2 - 1, hh = PH / 2 - 1;

      var actuallyMoved = false;
      if (moveX !== 0 && F.canMove(state.player.x + moveX, state.player.y, hw, hh)) { state.player.x += moveX; actuallyMoved = true; }
      if (moveY !== 0 && F.canMove(state.player.x, state.player.y + moveY, hw, hh)) { state.player.y += moveY; actuallyMoved = true; }

      if (state.sprinting && !actuallyMoved) state.sprinting = false;

      if (state.sprinting) state.stamina = Math.max(0, state.stamina - STAMINA_DRAIN * dt);
      else state.stamina = Math.min(MAX_STAMINA, state.stamina + STAMINA_REGEN * dt);

      if (!state.sprinting && state.stamina < SPRINT_MIN_STAMINA) state.sprintExhausted = true;
    } else {
      state.stamina = Math.min(MAX_STAMINA, state.stamina + STAMINA_REGEN * dt);
      state.sprinting = false;
      if (state.stamina < SPRINT_MIN_STAMINA) state.sprintExhausted = true;
    }

    var oreo;
    for (var oi = 0; oi < state.oreos.length; oi++) {
      oreo = state.oreos[oi];
      if (oreo.collected) continue;
      var odx = Math.abs(state.player.x - oreo.x);
      var ody = Math.abs(state.player.y - oreo.y);
      if (odx < 4 * T && ody < 4 * T) {
        var slot = state.inventory.indexOf(null);
        if (slot !== -1) {
          state.inventory[slot] = 'oreo';
          oreo.collected = true;
        }
      }
    }

    var apple;
    for (var ai = 0; ai < state.apples.length; ai++) {
      apple = state.apples[ai];
      if (apple.collected) continue;
      var adx3 = Math.abs(state.player.x - apple.x);
      var ady3 = Math.abs(state.player.y - apple.y);
      if (adx3 < 4 * T && ady3 < 4 * T) {
        var slot2 = state.inventory.indexOf(null);
        if (slot2 !== -1) {
          state.inventory[slot2] = 'apple';
          apple.collected = true;
        }
      }
    }

    var kk;
    for (var kki = 0; kki < state.kitkats.length; kki++) {
      kk = state.kitkats[kki];
      if (kk.collected) continue;
      var kdx = Math.abs(state.player.x - kk.x);
      var kdy = Math.abs(state.player.y - kk.y);
      if (kdx < 4 * T && kdy < 4 * T) {
        var slot3 = state.inventory.indexOf(null);
        if (slot3 !== -1) {
          state.inventory[slot3] = 'kitkat';
          kk.collected = true;
        }
      }
    }

    var fl;
    for (var fli = 0; fli < state.flashlights.length; fli++) {
      fl = state.flashlights[fli];
      if (fl.collected) continue;
      var fdx = Math.abs(state.player.x - fl.x);
      var fdy = Math.abs(state.player.y - fl.y);
      if (fdx < 4 * T && fdy < 4 * T) {
        var slot4 = state.inventory.indexOf(null);
        if (slot4 !== -1) {
          state.inventory[slot4] = 'flashlight';
          fl.collected = true;
        }
      }
    }

    if (state.enemy.active) {
      var assignment;
      for (var asi = 0; asi < state.assignments.length; asi++) {
        assignment = state.assignments[asi];
        if (assignment.collected) continue;
        var asdx = Math.abs(state.player.x - assignment.x);
        var asdy = Math.abs(state.player.y - assignment.y);
        if (asdx < 4 * T && asdy < 4 * T) {
          F.startAssignmentChallenge(assignment);
          return;
        }
      }
    }

    var wx = state.player.x - state.exitX, wy = state.player.y - state.exitY;
    if (F.remainingAssignments() === 0 && Math.sqrt(wx * wx + wy * wy) < state.exitR) { state.won = true; state.gameState = 'won'; state.bgMusic.pause(); return; }

    if (elapsedSec >= ENEMY_SPAWN_DELAY) {
      if (!state.enemy.active) {
        state.enemy.active = true;
        F.recalcEnemyPath();
        state.enemyRepathTimer = ENEMY_REPATH_INTERVAL;
      }

      state.enemyRepathTimer -= dt;
      if (state.enemyRepathTimer <= 0 || (state.enemyWaypoints.length > 0 && state.enemyWpIdx >= state.enemyWaypoints.length)) {
        F.recalcEnemyPath();
        state.enemyRepathTimer = ENEMY_REPATH_INTERVAL;
      }

      var prevEX = state.enemy.x, prevEY = state.enemy.y;

      if (state.currentEnemySpeed > 0 && state.enemyWaypoints.length > 0 && state.enemyWpIdx < state.enemyWaypoints.length) {
        var remaining = state.currentEnemySpeed * dt;
        while (remaining > 0.1 && state.enemyWpIdx < state.enemyWaypoints.length) {
          var target = state.enemyWaypoints[state.enemyWpIdx];
          var tdx = target.x - state.enemy.x, tdy = target.y - state.enemy.y;
          var dist = Math.sqrt(tdx * tdx + tdy * tdy);

          if (dist < 1) { state.enemy.x = target.x; state.enemy.y = target.y; state.enemyWpIdx++; continue; }

          if (Math.abs(tdx) > Math.abs(tdy)) state.enemy.dir = tdx > 0 ? 0 : 2;
          else state.enemy.dir = tdy > 0 ? 1 : 3;

          if (dist <= remaining) {
            state.enemy.x = target.x; state.enemy.y = target.y;
            remaining -= dist;
            state.enemyWpIdx++;
          } else {
            state.enemy.x += (tdx / dist) * remaining;
            state.enemy.y += (tdy / dist) * remaining;
            remaining = 0;
          }
        }
      }

      var movedDist = Math.sqrt((state.enemy.x - prevEX) * (state.enemy.x - prevEX) + (state.enemy.y - prevEY) * (state.enemy.y - prevEY));
      state.enemyMoving = movedDist > 0.5;

      if (state.enemyVariant.sprite && state.enemyMoving) {
        state.spriteAnimTimer += dt;
        if (state.spriteAnimTimer >= 1 / SPRITE_ANIM_FPS) {
          state.spriteAnimTimer -= 1 / SPRITE_ANIM_FPS;
          var frameCount = state.enemyVariant.sprite.frames.length;
          if (state.enemyVariant.pingPongAnim) {
            // Ping-pong: walk up to the last frame, then back down, then up
            // again (0,1,2,3,2,1,0,1,2,3,... -> frames 1-2-3-4-3-2-1-2-3-4...).
            var next = state.spriteAnimFrame + state.spriteAnimDir;
            if (next >= frameCount - 1) { next = frameCount - 1; state.spriteAnimDir = -1; }
            else if (next <= 0) { next = 0; state.spriteAnimDir = 1; }
            state.spriteAnimFrame = next;
          } else {
            state.spriteAnimFrame = (state.spriteAnimFrame + 1) % frameCount;
          }
        }
      }

      var pLeft = state.player.x - PW / 2, pRight = state.player.x + PW / 2;
      var pTop = state.player.y - PH / 2, pBottom = state.player.y + PH / 2;

      var eLeft = state.enemy.x - state.EW / 2, eRight = state.enemy.x + state.EW / 2;
      var eTop = state.enemy.y - state.EH / 2, eBottom = state.enemy.y + state.EH / 2;

      if (pLeft < eRight && pRight > eLeft && pTop < eBottom && pBottom > eTop) {
        if (!state.invincible && !state.playerInLocker && state.assignmentTeacherStunTimer <= 0) { state.lost = true; state.gameState = 'lost'; state.bgMusic.pause(); }
      }
    }
  };
})();
