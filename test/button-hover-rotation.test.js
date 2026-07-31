// Headless test for the button hover-rotation animation. It loads the real UI
// modules with a tiny DOM/Canvas stub, drives F.drawButtons() across frames with
// a controllable clock, and asserts the tilt:
//   * ramps up to ~12 degrees counterclockwise over ~1 second while hovered,
//   * eases in and out (slow-fast-slow) rather than moving linearly,
//   * rewinds smoothly back to 0 once the pointer leaves,
//   * applies to inactive ("coming soon") buttons too,
//   * never overshoots the 12 degree peak.
//
// Run with:  node test/button-hover-rotation.test.js
//
// No dependencies; uses only Node's built-in `vm`.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');

// ---- Minimal browser environment ----
let clock = 0; // ms; advanced manually so drawButtons' dt is deterministic.
function noop() {}

// A 2D context that records the angle of the most recent rotate() call so the
// test can inspect the transform drawButtons actually applies. Everything else
// is a no-op.
let lastRotate = 0;
let rotateCount = 0;
function makeCtx() {
  return new Proxy(
    { rotate: function (a) { lastRotate = a; rotateCount++; } },
    { get: function (target, prop) { return prop in target ? target[prop] : noop; } }
  );
}
function makeCanvas() {
  return { width: 800, height: 600, getContext: () => makeCtx(), style: {}, addEventListener: noop };
}

const sandbox = {
  console,
  performance: { now: () => clock },
  Date, Math, JSON, Object, Array,
  setTimeout: noop, requestAnimationFrame: noop, addEventListener: noop,
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

const MODULES = ['constants.js', 'state.js', 'ui-layout.js', 'ui-buttons.js'];
for (const f of MODULES) {
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, f), 'utf8'), sandbox, { filename: f });
}

const F = sandbox.window.FPEM;
const state = F.state;

const DEG = Math.PI / 180;
const PEAK = 12 * DEG;
const DT_MS = 1000 / 60; // 60 fps

let failures = 0;
function check(name, cond) {
  if (cond) { console.log('  ok   - ' + name); }
  else { console.error('  FAIL - ' + name); failures++; }
}

// Render one frame: advance the clock, draw a single button, and return the
// angle drawButtons handed to ctx.rotate (0 when it skipped the rotation).
function frame(rects, hovered) {
  clock += DT_MS;
  lastRotate = 0;
  rotateCount = 0;
  F.drawButtons(rects, hovered ? rects[0] : null);
  return rotateCount > 0 ? lastRotate : 0;
}

function reset() {
  state.buttonHoverAnim = {};
  state.buttonAnimLastTime = 0;
  clock = 0;
  // First call establishes the animation clock with dt = 0.
  F.drawButtons([], null);
}

// ---- 1. Ramp up while hovered ----
(function () {
  reset();
  const rects = [{ x: 100, y: 100, w: 200, h: 50, label: 'Play', active: true }];
  let angle = 0;
  const angles = [];
  for (let i = 0; i < 70; i++) { angle = frame(rects, true); angles.push(angle); }

  check('progress reaches 1 after ~1s of hover', Math.abs((state.buttonHoverAnim.Play || 0) - 1) < 1e-6);
  check('peak tilt is ~12 degrees', Math.abs(Math.abs(angle) - PEAK) < 1e-6);
  check('rotation is counterclockwise (negative canvas angle)', angle < 0);
  check('every frame stays within the 12 degree peak', angles.every((a) => Math.abs(a) <= PEAK + 1e-9));
  check('tilt grows monotonically toward the peak', angles.every((a, i) => i === 0 || Math.abs(a) >= Math.abs(angles[i - 1]) - 1e-9));
})();

// ---- 2. Ease in / ease out (slow-fast-slow) ----
(function () {
  // Compare the angle change per unit of progress near the ends vs the middle.
  const near0 = Math.abs(F.getButtonHoverAngle(0.05) - F.getButtonHoverAngle(0.0));
  const mid = Math.abs(F.getButtonHoverAngle(0.55) - F.getButtonHoverAngle(0.45));
  const near1 = Math.abs(F.getButtonHoverAngle(1.0) - F.getButtonHoverAngle(0.95));
  check('endpoints map to 0 and the full peak', Math.abs(F.getButtonHoverAngle(0)) < 1e-9 && Math.abs(Math.abs(F.getButtonHoverAngle(1)) - PEAK) < 1e-9);
  check('mid-motion is faster than the start (ease-in)', mid > near0 * 1.5);
  check('mid-motion is faster than the end (ease-out)', mid > near1 * 1.5);
})();

// ---- 3. Reverse smoothly back to flat after the pointer leaves ----
(function () {
  reset();
  const rects = [{ x: 100, y: 100, w: 200, h: 50, label: 'Play', active: true }];
  for (let i = 0; i < 70; i++) frame(rects, true); // hold at full tilt

  const startAngle = F.getButtonHoverAngle(state.buttonHoverAnim.Play || 0);
  let prevMag = Math.abs(startAngle);
  let firstStepDrop = null;
  let angle = startAngle;
  for (let i = 0; i < 70; i++) {
    angle = frame(rects, false);
    const mag = Math.abs(angle);
    if (firstStepDrop === null) firstStepDrop = Math.abs(PEAK) - mag;
    check('unwind never increases the tilt (frame ' + i + ')', mag <= prevMag + 1e-9);
    prevMag = mag;
  }
  check('progress returns to 0 after ~1s', Math.abs(state.buttonHoverAnim.Play || 0) < 1e-6);
  check('final tilt is flat', Math.abs(angle) < 1e-9);
  // A smooth ease-out starts slowly: the first reverse step barely moves.
  check('reversal starts gently (no jump)', firstStepDrop !== null && firstStepDrop < PEAK * 0.05);
})();

// ---- 4. Inactive ("coming soon") buttons animate too ----
(function () {
  reset();
  const rects = [{ x: 100, y: 100, w: 200, h: 50, label: 'Tutorial', active: false }];
  let angle = 0;
  for (let i = 0; i < 30; i++) angle = frame(rects, true);
  check('inactive button gains a counterclockwise tilt when hovered', angle < 0 && (state.buttonHoverAnim.Tutorial || 0) > 0);
})();

// ---- 5. Mid-hover reversal is continuous (no snap) ----
(function () {
  reset();
  const rects = [{ x: 100, y: 100, w: 200, h: 50, label: 'Play', active: true }];
  for (let i = 0; i < 30; i++) frame(rects, true); // partway up (~0.5)
  const before = state.buttonHoverAnim.Play || 0;
  const a1 = F.getButtonHoverAngle(before);
  const a2 = frame(rects, false); // first unhover frame
  check('progress was mid-way when the pointer left', before > 0.3 && before < 0.7);
  check('mid-hover reversal moves by at most one frame step', Math.abs(Math.abs(a2) - Math.abs(a1)) < PEAK * 0.05);
})();

if (failures === 0) {
  console.log('\nbutton-hover-rotation: PASS');
  process.exit(0);
} else {
  console.error('\nbutton-hover-rotation: ' + failures + ' assertion(s) FAILED');
  process.exit(1);
}
