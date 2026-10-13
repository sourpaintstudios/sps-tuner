import { useEffect, useRef, useState } from "react";

export type SkinProps = {
  /** Cents from the nearest note (negative flat, positive sharp), or null with no signal. */
  cents: number | null;
  /** Called once each time the player holds the note dead in tune. */
  onLock?: () => void;
};

export const LIME = "#d8ff4a";
export const IN_TUNE = 6; // cents
export const HOLD_MS = 650;

/** Closeness to in tune, 0 (50¢ or more off, or no signal) to 1 (dead on). */
export function quality(c: number | null): number {
  return c === null ? 0 : Math.max(0, 1 - Math.abs(c) / 50);
}

/** Tracks how long the note has been held in tune; fires onLock once per hold. */
export class Hold {
  ms = 0;
  cooldown = 0;
  update(dt: number, cents: number | null): { inTune: boolean; progress: number; locked: boolean } {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      this.ms = 0;
      return { inTune: false, progress: 0, locked: false };
    }
    const inTune = cents !== null && Math.abs(cents) <= IN_TUNE;
    if (inTune) this.ms += dt;
    else this.ms = Math.max(0, this.ms - dt * 2);
    if (this.ms >= HOLD_MS) {
      this.ms = 0;
      this.cooldown = 1500;
      return { inTune: true, progress: 1, locked: true };
    }
    return { inTune, progress: this.ms / HOLD_MS, locked: false };
  }
}

/**
 * Runs a canvas draw loop with a sized, DPR-aware context.
 * `draw` gets the context, size, time in seconds and frame delta in ms.
 */
export function useCanvasLoop(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    let raf = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - prev);
      prev = now;
      drawRef.current(ctx, w, h, now / 1000, dt);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return canvas;
}

/** Always holds the latest value, readable from inside the draw loop. */
export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

/** State created once and mutated in place by the draw loop. */
export function useOnce<T>(make: () => T): T {
  return useState(make)[0];
}
