// Headless regression test for the "five flashlights fully clear darkness"
// rule.
//
// Behaviour under test (js/render-game.js): while Darkness mode is on, the
// visible radius is base * (1 + 0.25 * activeFlashlights). Once
// FLASHLIGHT_FULL_CLEAR_COUNT (5) flashlights are active at the same time the
// dark overlay is skipped, but the red player glow stays on. Dropping back to
// 4 restores the normal formula (4 active => 2.0x the base radius).
//
// Behaviour under test (js/update.js): when the active count rises from below
// 5 to 5+, every flashlight timer (including ones added during the pause) is
// frozen for FLASHLIGHT_FREEZE_DURATION (3s). Going 5 -> 6 or 6 -> 5 never
// starts or extends a freeze.
//
// This test loads the real game modules, starts a real round, and inspects
// what renderGame() draws. The dark overlay is the only code that creates a
// <canvas> during a render, so counting canvas creations tells us whether it
// ran; the red glow is the only createRadialGradient() call on the main
// context; and the overlay's arc radius lets us check the radius formula.
//
// Run with:  node test/flashlight-full-clear.test.js
//
// No dependencies; uses only Node's built-in `vm` with a tiny DOM/Canvas/Audio
// stub, mirroring test/find-exit-hud.test.js.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const JS_DIR = path.join(__dirname, '..', 'js');

// ---- Minimal browser environment ----
let clock = 0; // ms; advanced manually so timing is deterministic.
function noop() {}

// Internal canvases (the maze buffer and the darkness overlay) get a context
// that can satisfy the overlay's gradient + arc calls. arc() radii are
// recorded so we can assert the lit-radius formula.
let canvasCreateCount = 0;
const darkArcRadii = [];
function makeInternalCtx() {
  const target = {
    createRadialGradient: function () { return { addColorStop: noop }; },
    arc: function (x, y, r) { darkArcRadii.push(r); },
  };
  return new Proxy(target, { get: function (t, p) { return (p in t) ? t[p] : noop; } });
}
function makeInternalCanvas() {
  return { width: 0, height: 0, getContext: () => makeInternalCtx(), style: {}, addEventListener: noop };
}

// The main drawing context: records createRadialGradient() calls (the red
// player glow) and no-ops the rest. Gradients expose addColorStop().
const redGlowCalls = [];
function makeCapturingCtx() {
  const target = {
    createRadialGradient: function () { redGlowCalls.push(1); return { addColorStop: noop }; },
  };
  return new Proxy(target, { get: function (t, p) { return (p in t) ? t[p] : noop; } });
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
  getElementById: () => makeInternalCanvas(),
  createElement: function (tag) { if (tag === 'canvas') canvasCreateCount++; return makeInternalCanvas(); },
  addEventListener: noop,
  body: { appendChild: noop, style: {} },
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
};
vm.createContext(sandbox);

const MODULES = [
  'constants.js', 'sprites.js', 'state.js', 'rng.js', 'grid.js',
  'maze-helpers.js', 'corners.js', 'maze.js', 'pathfinding.js',
  'game-start.js', 'update.js', 'render-game.js',
];
for (const f of MODULES) {
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, f), 'utf8'), sandbox, { filename: f });
}

const F = sandbox.window.FPEM;
const state = F.state;

state.canvas.width = 900;
state.canvas.height = 600;
state.ctx = makeCapturingCtx();

// Start a real round, then force the "playing" state with Darkness on.
state.mapSize = 40;
F.startGame({ autoStart: false });
state.gameState = 'playing';
state.enemy.active = false;
state.darknessEnabled = true;
state.playerInLocker = false;
state.darknessRadiusTiles = 20; // known base so we can check the radius math

const T = F.T;                 // tile size in px
const BASE = state.darknessRadiusTiles * T; // base lit radius in px
const OUTER = 1.12;            // overlay draws out to radius * 1.12

// Render once with `n` flashlights active and report what was drawn.
function renderWith(n) {
  state.flashlightTimers.length = 0;
  for (let i = 0; i < n; i++) state.flashlightTimers.push(F.FLASHLIGHT_DURATION);
  canvasCreateCount = 0;
  redGlowCalls.length = 0;
  darkArcRadii.length = 0;
  F.renderGame();
  return {
    overlayDrawn: canvasCreateCount > 0,
    redGlowDrawn: redGlowCalls.length > 0,
    outerRadius: darkArcRadii.length ? darkArcRadii[0] : null,
  };
}

function approx(a, b) { return Math.abs(a - b) < 0.001; }

// --- 0 flashlights: normal darkness, base radius ---
let r = renderWith(0);
assert(r.overlayDrawn, '0 flashlights: dark overlay should be drawn');
assert(r.redGlowDrawn, '0 flashlights: red player glow should be drawn');
assert(approx(r.outerRadius, BASE * 1.0 * OUTER),
  '0 flashlights: expected outer radius ' + (BASE * OUTER) + ', got ' + r.outerRadius);

// --- 4 flashlights: still darkness, normal formula => 2.0x base ---
r = renderWith(4);
assert(r.overlayDrawn, '4 flashlights: dark overlay should still be drawn');
assert(r.redGlowDrawn, '4 flashlights: red player glow should still be drawn');
assert(approx(r.outerRadius, BASE * 2.0 * OUTER),
  '4 flashlights: expected outer radius ' + (BASE * 2.0 * OUTER) + ', got ' + r.outerRadius);

// --- 5 flashlights: darkness fully cleared (as if the toggle were off) ---
r = renderWith(5);
assert(!r.overlayDrawn, '5 flashlights: dark overlay must NOT be drawn');
assert(r.redGlowDrawn, '5 flashlights: red player glow should stay on');

// --- 6 flashlights: still fully cleared ---
r = renderWith(6);
assert(!r.overlayDrawn, '6 flashlights: dark overlay must NOT be drawn');
assert(r.redGlowDrawn, '6 flashlights: red player glow should stay on');

// --- back down to 4: darkness returns with the normal formula ---
r = renderWith(4);
assert(r.overlayDrawn, 'dropping back to 4: dark overlay should return');
assert(approx(r.outerRadius, BASE * 2.0 * OUTER),
  'dropping back to 4: expected outer radius ' + (BASE * 2.0 * OUTER) + ', got ' + r.outerRadius);

// --- sanity: darkness toggle off never draws the overlay regardless ---
state.darknessEnabled = false;
r = renderWith(0);
assert(!r.overlayDrawn, 'darkness off: dark overlay must never be drawn');

state.darknessEnabled = true;

// ---- Freeze behaviour (F.update) ----
const DT = 1 / 20; // 50ms ticks, below update()'s 1/15s dt clamp
function resetTimers(list) {
  state.flashlightTimers.length = 0;
  for (const t of list) state.flashlightTimers.push(t);
  state.flashlightFreezeTimer = 0;
  state.prevFlashlightCount = state.flashlightTimers.length;
  state.lastTime = clock;
}
function tick(seconds) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    state.gameState = 'playing'; state.won = false; state.lost = false;
    state.enemy.active = false; state.assignmentActive = false;
    clock += DT * 1000;
    F.update();
  }
}
function use() { state.flashlightTimers.push(F.FLASHLIGHT_DURATION); }

assert.strictEqual(F.FLASHLIGHT_FREEZE_DURATION, 3);

// 4 -> 5 freezes all timers for 3s, then they resume where they stopped.
resetTimers([4, 4, 4, 4]);
use();
tick(1);
assert(approx(state.flashlightFreezeTimer, 2), '4->5: freeze should be counting down, got ' + state.flashlightFreezeTimer);
tick(1.5);
assert.deepStrictEqual(Array.from(state.flashlightTimers), [4, 4, 4, 4, 5], '4->5: timers must not move during freeze');
tick(0.5);
assert(approx(state.flashlightFreezeTimer, 0), '4->5: freeze should end after 3s, got ' + state.flashlightFreezeTimer);
tick(1);
assert(approx(state.flashlightTimers[0], 3), '4->5: timers should resume after freeze, got ' + state.flashlightTimers[0]);

// A 6th flashlight used mid-freeze waits too, and does not extend the freeze.
resetTimers([4, 4, 4, 4]);
use();
tick(1);
use();
tick(1);
assert(approx(state.flashlightFreezeTimer, 1), '6th mid-freeze: freeze must not be extended, got ' + state.flashlightFreezeTimer);
assert.strictEqual(state.flashlightTimers[5], 5, '6th mid-freeze: its timer must wait for the freeze to end');
tick(1);
assert(approx(state.flashlightFreezeTimer, 0), '6th mid-freeze: freeze should end on time');

// 5 -> 6 after the freeze never starts a new freeze.
resetTimers([4, 4, 4, 4, 4]);
use();
tick(1);
assert.strictEqual(state.flashlightFreezeTimer, 0, '5->6: must not freeze');
assert(approx(state.flashlightTimers[0], 3), '5->6: timers keep running');

// 6 -> 5 (one runs out) never starts a freeze.
resetTimers([0.5, 4, 4, 4, 4, 4]);
tick(1);
assert.strictEqual(state.flashlightTimers.length, 5, '6->5: first flashlight should expire normally');
assert.strictEqual(state.flashlightFreezeTimer, 0, '6->5: must not freeze');

// Dropping to 4 and climbing back to 5 freezes again.
resetTimers([0.5, 4, 4, 4, 4]);
tick(1);
assert.strictEqual(state.flashlightTimers.length, 4);
use();
tick(0.5);
assert(approx(state.flashlightFreezeTimer, 2.5), '4->5 again: should freeze again, got ' + state.flashlightFreezeTimer);

// Starting a new round clears any freeze.
F.startGame({ autoStart: false });
assert.strictEqual(state.flashlightFreezeTimer, 0);
assert.strictEqual(state.prevFlashlightCount, 0);

console.log('flashlight-full-clear: OK');
