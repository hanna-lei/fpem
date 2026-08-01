// Headless regression test for the "Find the exit!" HUD text.
//
// Bug: the top-of-screen objective text was only drawn while the level still
// had assignment pickups (`state.assignments.length > 0`). In rounds started
// with assignments disabled there were no assignments at all, so the player
// never saw the "Find the exit!" prompt. It should be visible at the top at
// all times during gameplay.
//
// This test loads the real game modules, starts a real round, swaps in a 2D
// context that records fillText() calls, and asserts what the HUD draws.
//
// Run with:  node test/find-exit-hud.test.js
//
// No dependencies; uses only Node's built-in `vm` with a tiny DOM/Canvas/Audio
// stub, mirroring test/chase-stumble.test.js.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const JS_DIR = path.join(__dirname, '..', 'js');

// ---- Minimal browser environment ----
let clock = 0; // ms; advanced manually so timing is deterministic.
function noop() {}
function makeCtx() { return new Proxy({}, { get: () => noop }); }
function makeCanvas() {
  return { width: 0, height: 0, getContext: () => makeCtx(), style: {}, addEventListener: noop };
}

// A 2D context that records every fillText() call into `sink` and no-ops
// everything else. Property assignments (fillStyle, font, ...) land on the
// backing object, which is all renderGame() needs.
function makeCapturingCtx(sink) {
  const target = {
    fillText: function (text) { sink.push(String(text)); },
  };
  return new Proxy(target, {
    get: function (t, prop) { return (prop in t) ? t[prop] : noop; },
  });
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

// Load the logic modules plus the game renderer (render-game.js defines
// F.renderGame). We keep the enemy inactive so render-enemy.js is not needed.
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

// Give the viewport a real size and route drawing through a capturing context.
const drawn = [];
state.canvas.width = 900;
state.canvas.height = 600;
state.ctx = makeCapturingCtx(drawn);

// Start a real round, then force the "playing" HUD state.
state.mapSize = 40; // smaller maze => faster, deterministic-enough setup
F.startGame({ autoStart: false });
state.gameState = 'playing';
state.enemy.active = false;
state.darknessEnabled = false;

function render() { drawn.length = 0; F.renderGame(); return drawn; }

// --- Case 1: no assignments at all -> "Find the exit!" is shown ---
state.assignments.length = 0;
let texts = render();
assert(
  texts.includes('Find the exit!'),
  'Expected "Find the exit!" to be drawn when there are no assignments, got: ' + JSON.stringify(texts)
);

// --- Case 2: outstanding assignments -> the remaining-count prompt is shown ---
state.assignments.length = 0;
state.assignments.push({ x: 0, y: 0, collected: false });
state.assignments.push({ x: 0, y: 0, collected: false });
texts = render();
assert(
  texts.includes('2 assignment(s) remaining!'),
  'Expected the assignment-count prompt with outstanding assignments, got: ' + JSON.stringify(texts)
);
assert(
  !texts.includes('Find the exit!'),
  'Did not expect "Find the exit!" while assignments are still outstanding, got: ' + JSON.stringify(texts)
);

// --- Case 3: assignments exist but are all collected -> "Find the exit!" ---
state.assignments.forEach(function (a) { a.collected = true; });
texts = render();
assert(
  texts.includes('Find the exit!'),
  'Expected "Find the exit!" once every assignment is collected, got: ' + JSON.stringify(texts)
);

// --- Case 4: not playing -> neither objective prompt is drawn ---
state.assignments.length = 0;
state.gameState = 'menu';
texts = render();
assert(
  !texts.includes('Find the exit!'),
  'Did not expect the objective prompt outside of gameplay, got: ' + JSON.stringify(texts)
);

console.log('find-exit-hud: OK (4 cases passed)');
