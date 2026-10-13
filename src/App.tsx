import { useMemo, useState } from "react";
import { CountyRoad9 } from "./skins/CountyRoad9";
import { useTuner } from "./lib/useTuner";

/** `?demo=1` shows a slider so the skin can be tried without a mic. */
const DEMO = typeof location !== "undefined" && new URLSearchParams(location.search).has("demo");

export function App() {
  const [a4, setA4] = useState(440);
  const [demoCents, setDemoCents] = useState(-30);
  const [kills, setKills] = useState(0);
  const tuner = useTuner(a4);

  const reading = tuner.reading;
  const cents = DEMO ? demoCents : reading ? reading.cents : null;
  const note = DEMO ? "A" : reading?.name ?? "–";
  const octave = DEMO ? 2 : reading?.octave;
  const inTune = cents !== null && Math.abs(cents) <= 6;

  const hint = useMemo(() => {
    if (DEMO) return "Demo mode: slide to tune";
    switch (tuner.status) {
      case "idle":
        return "Tap start, then pluck a string";
      case "starting":
        return "Allow the microphone…";
      case "denied":
        return "Microphone blocked. Allow it in your browser settings.";
      case "unsupported":
        return "This browser can't use a microphone.";
      default:
        return reading ? (inTune ? "In tune!" : cents! < 0 ? "Too low, tune up" : "Too high, tune down") : "Pluck a string";
    }
  }, [tuner.status, reading, inTune, cents]);

  return (
    <main className="app">
      <header className="top">
        <a href="https://sourpaintstudios.com" target="_blank" rel="noreferrer" className="brand" aria-label="Sour Paint Studios">
          <img src="/sour-paint-mark.png" alt="Sour Paint Studios" />
        </a>
        <div className="title">
          <span className="title-main">SPS TUNER</span>
          <span className="title-sub">County Road 9</span>
        </div>
        <div className="score" title="UFOs tuned">
          <span className="score-n">{kills}</span>
          <span className="score-l">UFOs</span>
        </div>
      </header>

      <section className="stage">
        <CountyRoad9 cents={cents} onLock={() => setKills((k) => k + 1)} />
      </section>

      <section className={"readout" + (inTune ? " in" : "")} aria-live="polite">
        <div className="note">
          {note}
          {octave !== undefined ? <sub>{octave}</sub> : null}
        </div>
        <div className="meta">
          <span className="cents">{cents === null ? "– –" : `${cents > 0 ? "+" : ""}${Math.round(cents)}¢`}</span>
          <span className="hint">{hint}</span>
        </div>
      </section>

      <section className="controls">
        {DEMO ? (
          <input
            type="range"
            min={-50}
            max={50}
            value={demoCents}
            onChange={(e) => setDemoCents(Number(e.target.value))}
            aria-label="Demo cents"
            className="slider"
          />
        ) : tuner.status === "listening" || tuner.status === "starting" ? (
          <button className="btn" onClick={tuner.stop}>
            Stop
          </button>
        ) : (
          <button className="btn primary" onClick={tuner.start}>
            Start tuner
          </button>
        )}
        <label className="a4">
          <span>A4</span>
          <button onClick={() => setA4((v) => Math.max(415, v - 1))} aria-label="Lower reference pitch">
            −
          </button>
          <b>{a4} Hz</b>
          <button onClick={() => setA4((v) => Math.min(466, v + 1))} aria-label="Raise reference pitch">
            +
          </button>
        </label>
      </section>
    </main>
  );
}
