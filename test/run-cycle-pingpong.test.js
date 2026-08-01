// Headless regression test for the teacher run-cycle "ping-pong" animation.
// Bloomie and Thavel should play their 4 frames as a triangle wave
// (1-2-3-4-3-2-1-2-3-4..., i.e. frame indices 0-1-2-3-2-1-0...) instead of the
// old wrap-around loop (1-2-3-4-1-2-3-4...). Miss Circle should keep looping.
//
// It loads the real game modules, drives the real F.update() loop with a
// controllable clock across a close chase, and records the sprite frame index
// emitted each tick, then asserts the shape of the resulting sequence.
//
// Run with:  node test/run-cycle-pingpong.test.js
//
// No dependencies; uses only Node's built-in `vm` with a tiny DOM/Canvas/Audio
// stub, mirroring test/chase-stumble.test.js.

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

function variantByName(name) {
  return F.ENEMY_VARIANTS.filter(function (v) { return v.name === name; })[0];
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
const VEC = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };

function setupMaze(seed, variant) {
  F.rebuildMapGrid(60);
  const targetDE = F.getTargetDeadEnds(60);
  state.exitCorner = 'bottom-right';
  state.enemyVariant = variant;
  state.EW = variant.w;
  state.EH = variant.h;
  state.BASE_ENEMY_SPEED = variant.speed;
  state.currentEnemySpeed = state.BASE_ENEMY_SPEED;
  F.generateMaze(seed, targetDE);
  // No pickups/assignments/lockers: isolate the chase (and thus the run cycle).
  state.oreos.length = state.apples.length = state.kitkats.length = 0;
  state.flashlights.length = state.assignments.length = state.lockers.length = 0;
}

// Drive a close chase for `ticks` frames and return the sprite frame index the
// game showed on every tick the enemy was active and moving.
function collectFrames(variantName, mazeSeed, playerSeed, ticks) {
  const variant = variantByName(variantName);
  setupMaze(mazeSeed, variant);
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

  // Start the run cycle from a known point so the sequence is reproducible.
  state.spriteAnimFrame = 0; state.spriteAnimDir = 1; state.spriteAnimTimer = 0;

  for (const k in state.keys) state.keys[k] = false;
  let dir = 'ArrowRight';
  state.keys[dir] = true;

  const LEAD = 40;
  state.startTime = Date.now(); // elapsed ~0 => enemy stays inactive during the lead

  const frames = [];
  const trail = [];

  for (let i = 0; i < ticks; i++) {
    if (i === LEAD) state.startTime = Date.now() - 10000; // wake the teacher

    const hw = F.PW / 2 - 1, hh = F.PH / 2 - 1;
    const probe = 3;
    const vec = VEC[dir];
    const blocked = !F.canMove(state.player.x + vec[0] * probe, state.player.y + vec[1] * probe, hw, hh);
    if (blocked) {
      const open = KEYS.filter((k) => F.canMove(state.player.x + VEC[k][0] * probe, state.player.y + VEC[k][1] * probe, hw, hh));
      const forward = open.filter((k) => k !== OPP[dir]);
      const pool = forward.length ? forward : open;
      if (pool.length) { dir = pool[Math.floor(rand() * pool.length)]; }
      for (const k in state.keys) state.keys[k] = false;
      state.keys[dir] = true;
    }

    trail.push({ x: state.player.x, y: state.player.y });
    if (trail.length > 120) trail.shift();

    clock += DT_MS;
    F.update();

    // Record before any re-seed: the frame the enemy showed this tick is valid
    // whether or not this was the tick it caught the player.
    if (state.enemy.active) {
      frames.push(state.spriteAnimFrame);
    }

    if (state.lost) {
      // A catch ends the round; re-seed the teacher a little behind the player
      // so the close chase (and the animation) keeps running.
      state.lost = false; state.gameState = 'playing';
      const back = trail[Math.max(0, trail.length - 45)];
      state.enemy.x = back.x; state.enemy.y = back.y; state.enemy.dir = 0;
      state.enemyWaypoints = []; state.enemyWpIdx = 0; state.enemyRepathTimer = 0;
    }
  }
  return frames;
}

// Collapse runs of the same frame (frames only advance every 1/8s, so most
// ticks repeat the previous frame) into the underlying transition sequence.
function transitions(frames) {
  const seq = [];
  for (const f of frames) if (seq.length === 0 || seq[seq.length - 1] !== f) seq.push(f);
  return seq;
}

// Indices where the walk reverses direction (a local peak or valley).
function turningPoints(seq) {
  const tp = [];
  for (let i = 1; i < seq.length - 1; i++) {
    const a = seq[i] - seq[i - 1], b = seq[i + 1] - seq[i];
    if ((a > 0 && b < 0) || (a < 0 && b > 0)) tp.push(i);
  }
  return tp;
}

let failures = 0;
function check(name, cond) {
  if (cond) { console.log('  ok   - ' + name); }
  else { console.error('  FAIL - ' + name); failures++; }
}

// ---- Ping-pong teachers: Bloomie and Thavel ----
['Miss Bloomie', 'Miss Thavel'].forEach(function (name, idx) {
  console.log(name + ':');
  const seq = transitions(collectFrames(name, 1000 + idx * 7, 500 + idx * 13, 2400));
  const tps = turningPoints(seq);
  const singleSteps = seq.every((f, i) => i === 0 || Math.abs(f - seq[i - 1]) === 1);
  const min = Math.min.apply(null, seq), max = Math.max.apply(null, seq);
  const reversesOnlyAtEnds = tps.every((i) => seq[i] === 0 || seq[i] === 3);

  check('produced a long enough sequence to judge', seq.length > 20);
  check('every step advances by exactly one frame (never wraps 4->1)', singleSteps);
  check('walks the full 4-frame range (0..3)', min === 0 && max === 3);
  check('reverses only at the first/last frame', reversesOnlyAtEnds);
  check('bounces back and forth several times', tps.length >= 4);
});

// ---- Control: Miss Circle should still loop with a 4->1 wrap ----
(function () {
  console.log('Miss Circle (control):');
  const seq = transitions(collectFrames('Miss Circle', 2000, 900, 2400));
  const wraps = seq.some((f, i) => i > 0 && seq[i - 1] === 3 && f === 0);
  check('still loops with a 4->1 wrap (unchanged behavior)', wraps);
})();

if (failures === 0) {
  console.log('\nrun-cycle-pingpong: PASS');
  process.exit(0);
} else {
  console.error('\nrun-cycle-pingpong: ' + failures + ' assertion(s) FAILED');
  process.exit(1);
}
