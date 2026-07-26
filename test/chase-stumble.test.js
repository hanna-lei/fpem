// Headless regression test for the teacher "stumble" bug (enemy briefly runs
// the opposite way mid-chase). It loads the real game modules, drives the real
// F.update() loop with a controllable clock across many generated mazes, and
// asserts that the teacher almost never reverses direction and never ends up
// deep inside a wall.
//
// Run with:  node test/chase-stumble.test.js
//
// No dependencies; uses only Node's built-in `vm` to load the browser-oriented
// game scripts with a tiny DOM/Canvas/Audio stub.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');

// ---- Minimal browser environment ----
let clock = 0; // ms; advanced manually so update()'s dt is deterministic.
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

// Load only the logic modules needed to run the update loop (not main.js, which
// wires up real DOM event listeners, nor the render modules).
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

// Same "is this point behind the enemy?" test the pathfinder uses internally.
function isBehindEnemy(x, y) {
  const dx = x - state.enemy.x, dy = y - state.enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return false;
  let fx = 0, fy = 0;
  if (state.enemy.dir === 0) fx = 1;
  else if (state.enemy.dir === 2) fx = -1;
  else if (state.enemy.dir === 1) fy = 1;
  else if (state.enemy.dir === 3) fy = -1;
  return dx * fx + dy * fy < -dist * 0.25;
}

// Deterministic PRNG for the player's flee pattern.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT_MS = 1000 / 60;
const KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
const OPP = { ArrowRight: 'ArrowLeft', ArrowLeft: 'ArrowRight', ArrowDown: 'ArrowUp', ArrowUp: 'ArrowDown' };

function setupMaze(seed) {
  F.rebuildMapGrid(60);
  const targetDE = F.getTargetDeadEnds(60);
  state.exitCorner = 'bottom-right';
  state.enemyVariant = F.ENEMY_VARIANTS[0]; // Miss Circle (speed == player speed)
  state.EW = state.enemyVariant.w;
  state.EH = state.enemyVariant.h;
  state.BASE_ENEMY_SPEED = state.enemyVariant.speed;
  state.currentEnemySpeed = state.BASE_ENEMY_SPEED;
  F.generateMaze(seed, targetDE);
  // No pickups/assignments/lockers: isolate the chase.
  state.oreos.length = state.apples.length = state.kitkats.length = 0;
  state.flashlights.length = state.assignments.length = state.lockers.length = 0;
}

function runChase(mazeSeed, playerSeed) {
  setupMaze(mazeSeed);
  const rand = mulberry32(playerSeed);

  state.gameState = 'playing';
  state.won = state.lost = false;
  state.assignmentPausedMs = 0; state.assignmentPausedAt = 0; state.assignmentActive = false;
  clock = 0; state.lastTime = 0;

  const start = F.getCornerPos('top-left');
  state.player.x = start.x * T; state.player.y = start.y * T; state.player.dir = 0;
  state.enemy.x = state.player.x; state.enemy.y = state.player.y;
  state.enemy.active = false; state.enemy.dir = 0;
  state.enemyWaypoints = []; state.enemyWpIdx = 0; state.enemyRepathTimer = 0;

  const VEC = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
  for (const k in state.keys) state.keys[k] = false;
  let dir = 'ArrowRight';
  state.keys[dir] = true;

  let reversals = 0, centerInWall = 0;
  let prevMove = null;
  const trail = []; // recent player positions, used to re-seed the chase after a catch

  // Phase 1: keep the enemy asleep (elapsed < spawn delay) while the player
  // builds a ~1-cell lead. Phase 2: wake the teacher at the start corner so it
  // trails the wandering player at close distance for the rest of the run. The
  // player wanders through the maze (turning at junctions), which is exactly
  // the situation the bug report describes.
  const LEAD = 55;
  state.startTime = Date.now(); // elapsed ~0 => enemy stays inactive during the lead

  for (let i = 0; i < 3000; i++) {
    if (i === LEAD) state.startTime = Date.now() - 10000; // wake the teacher

    const hw = F.PW / 2 - 1, hh = F.PH / 2 - 1;
    const probe = 3;
    const vec = VEC[dir];
    const blocked = !F.canMove(state.player.x + vec[0] * probe, state.player.y + vec[1] * probe, hw, hh);
    if (blocked) {
      // Pick a random open direction, preferring not to double straight back.
      const open = KEYS.filter((k) => F.canMove(state.player.x + VEC[k][0] * probe, state.player.y + VEC[k][1] * probe, hw, hh));
      const forward = open.filter((k) => k !== OPP[dir]);
      const pool = forward.length ? forward : open;
      if (pool.length) { dir = pool[Math.floor(rand() * pool.length)]; }
      for (const k in state.keys) state.keys[k] = false;
      state.keys[dir] = true;
    }

    trail.push({ x: state.player.x, y: state.player.y });
    if (trail.length > 120) trail.shift();

    const prevEX = state.enemy.x, prevEY = state.enemy.y;

    clock += DT_MS;
    F.update();

    if (state.lost) {
      // A catch means the chaser succeeded. Re-seed the teacher onto a floor
      // point ~45 ticks behind the player so the close chase continues.
      state.lost = false; state.gameState = 'playing';
      const back = trail[Math.max(0, trail.length - 45)];
      state.enemy.x = back.x; state.enemy.y = back.y; state.enemy.dir = 0;
      state.enemyWaypoints = []; state.enemyWpIdx = 0; state.enemyRepathTimer = 0;
      prevMove = null;
      continue;
    }

    const mx = state.enemy.x - prevEX, my = state.enemy.y - prevEY;
    const md = Math.sqrt(mx * mx + my * my);
    if (md > 0.5) {
      const cur = { x: mx / md, y: my / md };
      if (prevMove && cur.x * prevMove.x + cur.y * prevMove.y < -0.5) reversals++;
      prevMove = cur;
    }
    if (!F.isFloor(state.enemy.x, state.enemy.y)) centerInWall++;
  }
  return { reversals, centerInWall };
}

let totalReversals = 0, totalCenterInWall = 0;
const MAZES = 40;
for (let s = 1; s <= MAZES; s++) {
  const r = runChase(1000 + s * 7, 500 + s * 13);
  totalReversals += r.reversals;
  totalCenterInWall += r.centerInWall;
}

// Some reversals are legitimate: the player can genuinely double back into a
// dead end, forcing the teacher to turn around. Those remain after the fix.
// Empirically this deterministic scenario yields ~590 reversals with the bug
// present and ~100 after the fix, so a budget in between is a robust guard that
// fails if the "stumble" behaviour is reintroduced.
const REVERSAL_BUDGET = 250;

console.log(`chase-stumble: ${MAZES} mazes, reversals=${totalReversals}, centerInWall=${totalCenterInWall}`);

let ok = true;
if (totalReversals > REVERSAL_BUDGET) {
  console.error(`FAIL: teacher reversed direction ${totalReversals} times (budget ${REVERSAL_BUDGET}). The chase "stumble" bug appears to be present.`);
  ok = false;
}
if (totalCenterInWall > 0) {
  console.error(`FAIL: teacher center was inside a wall on ${totalCenterInWall} frames (expected 0).`);
  ok = false;
}
if (ok) {
  console.log('PASS');
  process.exit(0);
} else {
  process.exit(1);
}
