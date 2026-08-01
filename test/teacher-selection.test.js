// Headless test for the "Teachers" game setting. It loads the real game
// modules and checks that F.chooseEnemyVariant respects the three teacher
// toggles:
//   - only toggled-on teachers are ever returned
//   - among the enabled teachers the odds are roughly equal (1 => 100%,
//     2 => ~50/50, 3 => ~1/3 each)
//   - all toggles off => null (no teacher)
// It also drives the real update loop with no teacher enabled and asserts the
// enemy never spawns and the player is never caught.
//
// Run with:  node test/teacher-selection.test.js

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');

let clock = 0;
function noop() {}
function makeCtx() { return new Proxy({}, { get: () => noop }); }
function makeCanvas() {
  return { width: 0, height: 0, getContext: () => makeCtx(), style: {}, addEventListener: noop };
}
const sandbox = {
  console,
  performance: { now: () => clock },
  Date,
  Math, JSON, Object, Array, Uint8Array, Int32Array, Float64Array,
  setTimeout: noop, setInterval: noop, requestAnimationFrame: noop, addEventListener: noop,
};
sandbox.window = sandbox;
sandbox.Image = function () { this.onload = null; };
sandbox.Audio = function () { return { loop: false, volume: 0, currentTime: 0, play: noop, pause: noop, addEventListener: noop }; };
sandbox.document = {
  getElementById: () => makeCanvas(),
  createElement: () => makeCanvas(),
  addEventListener: noop,
  body: { appendChild: noop, style: {} },
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
};
vm.createContext(sandbox);

const MODULES = [
  'constants.js', 'sprites.js', 'state.js', 'rng.js', 'grid.js',
  'maze-helpers.js', 'corners.js', 'maze.js', 'pathfinding.js',
  'game-start.js', 'update.js',
];
for (const f of MODULES) {
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, f), 'utf8'), sandbox, { filename: f });
}

const F = sandbox.window.FPEM;
const state = F.state;
const T = F.T;

let ok = true;
function check(cond, msg) {
  if (cond) { console.log('  ok   - ' + msg); }
  else { console.error('  FAIL - ' + msg); ok = false; }
}

// Sample the chooser across many master seeds and tally which teacher spawns.
function sample(bloomie, thavel, circle) {
  state.teacherBloomie = bloomie;
  state.teacherThavel = thavel;
  state.teacherCircle = circle;
  const counts = { 'Miss Bloomie': 0, 'Miss Thavel': 0, 'Miss Circle': 0, None: 0 };
  const N = 60000;
  for (let ms = 1; ms <= N; ms++) {
    const v = F.chooseEnemyVariant(ms);
    counts[v ? v.name : 'None']++;
  }
  return { counts, N };
}

// 1 enabled => that teacher every time.
(function () {
  const { counts, N } = sample(true, false, false);
  check(counts['Miss Bloomie'] === N, 'only Bloomie on => Bloomie spawns 100%');
  check(counts['Miss Thavel'] === 0 && counts['Miss Circle'] === 0, 'only Bloomie on => no other teacher');
})();
(function () {
  const { counts, N } = sample(false, true, false);
  check(counts['Miss Thavel'] === N, 'only Thavel on => Thavel spawns 100%');
})();
(function () {
  const { counts, N } = sample(false, false, true);
  check(counts['Miss Circle'] === N, 'only Circle on => Circle spawns 100%');
})();

// 2 enabled => ~50/50 between them, never the third.
(function () {
  const { counts, N } = sample(true, true, false);
  check(counts['Miss Circle'] === 0, '2 on (Bloomie+Thavel) => Circle never spawns');
  const pB = counts['Miss Bloomie'] / N, pT = counts['Miss Thavel'] / N;
  check(Math.abs(pB - 0.5) < 0.03 && Math.abs(pT - 0.5) < 0.03, '2 on => ~50/50 split (got ' + pB.toFixed(3) + '/' + pT.toFixed(3) + ')');
})();

// 3 enabled => ~1/3 each.
(function () {
  const { counts, N } = sample(true, true, true);
  check(counts.None === 0, 'all 3 on => a teacher always spawns');
  const p = [counts['Miss Bloomie'] / N, counts['Miss Thavel'] / N, counts['Miss Circle'] / N];
  check(p.every((x) => Math.abs(x - 1 / 3) < 0.03), 'all 3 on => ~1/3 each (got ' + p.map((x) => x.toFixed(3)).join('/') + ')');
})();

// 0 enabled => always null.
(function () {
  const { counts, N } = sample(false, false, false);
  check(counts.None === N, 'all off => null (no teacher) every time');
})();

// Integration: with no teacher, the enemy must never activate and the player is
// never caught even after the spawn delay elapses.
(function () {
  state.teacherBloomie = false;
  state.teacherThavel = false;
  state.teacherCircle = false;

  F.rebuildMapGrid(60);
  const targetDE = F.getTargetDeadEnds(60);
  state.exitCorner = 'bottom-right';
  state.enemyVariant = F.chooseEnemyVariant(Date.now());
  check(state.enemyVariant === null, 'startGame path: no teacher selected when all off');

  // Mirror the no-teacher branch of F.startGame.
  state.EW = 0; state.EH = 0; state.BASE_ENEMY_SPEED = 0; state.currentEnemySpeed = 0;
  F.generateMaze(12345, targetDE);
  state.oreos.length = state.apples.length = state.kitkats.length = 0;
  state.flashlights.length = state.assignments.length = state.lockers.length = 0;

  state.gameState = 'playing';
  state.won = state.lost = false;
  state.assignmentPausedMs = 0; state.assignmentPausedAt = 0; state.assignmentActive = false;
  clock = 0; state.lastTime = 0;

  const start = F.getCornerPos('top-left');
  state.player.x = start.x * T; state.player.y = start.y * T; state.player.dir = 0;
  state.enemy.x = state.player.x; state.enemy.y = state.player.y;
  state.enemy.active = false; state.enemy.dir = 0;
  state.enemyWaypoints = []; state.enemyWpIdx = 0; state.enemyRepathTimer = 0;
  for (const k in state.keys) state.keys[k] = false;

  // Sit still well past the spawn delay (player at start corner = enemy spawn).
  state.startTime = Date.now() - 60000;
  let everActive = false;
  for (let i = 0; i < 600; i++) {
    clock += 1000 / 60;
    F.update();
    if (state.enemy.active) everActive = true;
    if (state.lost) break;
  }
  check(!everActive, 'no teacher => enemy never activates');
  check(!state.lost, 'no teacher => player is never caught');
})();

// Integration: with no teacher, an assignment is live immediately (before the
// spawn delay would have elapsed) rather than waiting for a teacher that never
// comes. Standing on the assignment should start its challenge right away.
(function () {
  state.teacherBloomie = false;
  state.teacherThavel = false;
  state.teacherCircle = false;

  F.rebuildMapGrid(60);
  const targetDE = F.getTargetDeadEnds(60);
  state.exitCorner = 'bottom-right';
  state.enemyVariant = F.chooseEnemyVariant(Date.now());
  state.EW = 0; state.EH = 0; state.BASE_ENEMY_SPEED = 0; state.currentEnemySpeed = 0;
  F.generateMaze(12345, targetDE);
  state.oreos.length = state.apples.length = state.kitkats.length = 0;
  state.flashlights.length = state.lockers.length = 0;

  state.gameState = 'playing';
  state.won = state.lost = false;
  state.assignmentPausedMs = 0; state.assignmentPausedAt = 0; state.assignmentActive = false;
  clock = 0; state.lastTime = 0;

  const start = F.getCornerPos('top-left');
  state.player.x = start.x * T; state.player.y = start.y * T; state.player.dir = 0;
  state.enemy.x = state.player.x; state.enemy.y = state.player.y;
  state.enemy.active = false; state.enemy.dir = 0;
  state.enemyWaypoints = []; state.enemyWpIdx = 0; state.enemyRepathTimer = 0;
  for (const k in state.keys) state.keys[k] = false;

  // One uncollected assignment sitting right on the player.
  state.assignments = [{ x: state.player.x, y: state.player.y, collected: false }];

  // Fresh round: elapsed ~0, i.e. well before the teacher would ever spawn.
  state.startTime = Date.now();
  clock += 1000 / 60;
  F.update();

  check(state.assignmentActive === true, 'no teacher => assignment is live immediately (challenge starts at t~0)');
})();

if (ok) { console.log('\nteacher-selection: PASS'); process.exit(0); }
else { console.error('\nteacher-selection: FAIL'); process.exit(1); }
