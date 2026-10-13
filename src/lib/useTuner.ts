import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitch, noteFromFreq, type NoteReading } from "./pitch";

export type TunerState = {
  status: "idle" | "starting" | "listening" | "denied" | "unsupported";
  reading: NoteReading | null;
};

const FFT = 4096;

/** Microphone → pitch reading, ~30 readings a second, median-smoothed. */
export function useTuner(a4: number) {
  const [state, setState] = useState<TunerState>({ status: "idle", reading: null });
  const a4Ref = useRef(a4);
  a4Ref.current = a4;
  const stopRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    stopRef.current();
    stopRef.current = () => {};
    setState({ status: "idle", reading: null });
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: "unsupported", reading: null });
      return;
    }
    setState({ status: "starting", reading: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(FFT);
      const recent: number[] = [];
      let misses = 0;
      let raf = 0;
      let last = 0;
      let alive = true;

      const tick = (now: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(tick);
        if (now - last < 33) return;
        last = now;
        analyser.getFloatTimeDomainData(buf);
        const p = detectPitch(buf, ctx.sampleRate);
        if (p) {
          misses = 0;
          recent.push(p.freq);
          if (recent.length > 5) recent.shift();
          const sorted = [...recent].sort((x, y) => x - y);
          const median = sorted[Math.floor(sorted.length / 2)];
          setState({ status: "listening", reading: noteFromFreq(median, a4Ref.current) });
        } else if (++misses > 8) {
          recent.length = 0;
          setState((s) => (s.reading ? { status: "listening", reading: null } : s));
        }
      };
      raf = requestAnimationFrame(tick);
      setState({ status: "listening", reading: null });

      stopRef.current = () => {
        alive = false;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
    } catch {
      setState({ status: "denied", reading: null });
    }
  }, []);

  useEffect(() => () => stopRef.current(), []);

  return { ...state, start, stop };
}
