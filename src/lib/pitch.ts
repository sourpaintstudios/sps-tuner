/** Pitch detection (YIN) and note math. Pure functions, no browser APIs. */

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

export type Pitch = { freq: number; clarity: number };

const MIN_HZ = 50;
const MAX_HZ = 1400;

/**
 * YIN pitch detector. `buf` should hold at least ~3000 samples at 44.1/48 kHz.
 * Returns null when the signal is too quiet or not clearly pitched.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, threshold = 0.12): Pitch | null {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  if (Math.sqrt(sum / buf.length) < 0.008) return null;

  const tauMax = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(buf.length / 2));
  const tauMin = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const w = buf.length - tauMax;
  if (w < 256) return null;

  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let acc = 0;
    for (let j = 0; j < w; j++) {
      const diff = buf[j] - buf[j + tau];
      acc += diff * diff;
    }
    d[tau] = acc;
  }

  // Cumulative mean normalised difference.
  const cm = new Float32Array(tauMax + 1);
  cm[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cm[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  let tau = -1;
  for (let t = tauMin; t < tauMax; t++) {
    if (cm[t] < threshold) {
      while (t + 1 < tauMax && cm[t + 1] < cm[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;

  // Parabolic interpolation around the dip for sub-sample accuracy.
  const a = cm[tau - 1];
  const b = cm[tau];
  const c = cm[tau + 1] ?? b;
  const denom = a + c - 2 * b;
  const shift = denom === 0 ? 0 : (a - c) / (2 * denom);
  const refined = tau + Math.max(-1, Math.min(1, shift));
  return { freq: sampleRate / refined, clarity: 1 - b };
}

export type NoteReading = {
  name: string;
  octave: number;
  /** Cents from the nearest note: negative = flat, positive = sharp. */
  cents: number;
  freq: number;
  target: number;
};

export function noteFromFreq(freq: number, a4 = 440): NoteReading {
  const midi = 69 + 12 * Math.log2(freq / a4);
  const nearest = Math.round(midi);
  const cents = (midi - nearest) * 100;
  const name = NOTE_NAMES[((nearest % 12) + 12) % 12];
  return {
    name,
    octave: Math.floor(nearest / 12) - 1,
    cents,
    freq,
    target: a4 * Math.pow(2, (nearest - 69) / 12),
  };
}
