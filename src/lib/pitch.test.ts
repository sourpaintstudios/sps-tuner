import test from "node:test";
import assert from "node:assert/strict";
import { detectPitch, noteFromFreq } from "./pitch.ts";

function tone(freq: number, sr = 44100, n = 4096) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    b[i] = 0.5 * Math.sin(2 * Math.PI * freq * t) + 0.2 * Math.sin(4 * Math.PI * freq * t);
  }
  return b;
}

test("detects guitar low E, A, high E", () => {
  for (const f of [82.41, 110, 329.63]) {
    const p = detectPitch(tone(f), 44100);
    assert.ok(p, `no pitch for ${f}`);
    assert.ok(Math.abs(p.freq - f) < f * 0.005, `${f} read as ${p.freq}`);
  }
});

test("silence gives null", () => {
  assert.equal(detectPitch(new Float32Array(4096), 44100), null);
});

test("note math", () => {
  const a = noteFromFreq(440);
  assert.equal(a.name, "A");
  assert.ok(Math.abs(a.cents) < 0.01);
  const flat = noteFromFreq(440 * Math.pow(2, -20 / 1200));
  assert.ok(Math.abs(flat.cents + 20) < 0.01);
  assert.equal(noteFromFreq(82.41).name, "E");
});
