// Headless regression test for the "five flashlights fully clear darkness"
// rule.
//
// Behaviour under test (js/render-game.js): while Darkness mode is on, the
// visible radius is base * (1 + 0.25 * activeFlashlights). Once
// FLASHLIGHT_FULL_CLEAR_COUNT (5) flashlights are active at the same time the
// maze is lit exactly as if Darkness were toggled off: both the dark overlay
// and the red player glow are skipped. Dropping back to 4 restores the normal
// formula (4 active => 2.0x the base radius).
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
assert(!r.redGlowDrawn, '5 flashlights: red player glow must NOT be drawn');

// --- 6 flashlights: still fully cleared ---
r = renderWith(6);
assert(!r.overlayDrawn, '6 flashlights: dark overlay must NOT be drawn');

// --- back down to 4: darkness returns with the normal formula ---
r = renderWith(4);
assert(r.overlayDrawn, 'dropping back to 4: dark overlay should return');
assert(approx(r.outerRadius, BASE * 2.0 * OUTER),
  'dropping back to 4: expected outer radius ' + (BASE * 2.0 * OUTER) + ', got ' + r.outerRadius);

// --- sanity: darkness toggle off never draws the overlay regardless ---
state.darknessEnabled = false;
r = renderWith(0);
assert(!r.overlayDrawn, 'darkness off: dark overlay must never be drawn');

console.log('flashlight-full-clear: OK (7 assertions passed)');
