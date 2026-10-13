import { Hold, LIME, quality, useCanvasLoop, useLatest, useOnce, type SkinProps } from "./common";

/**
 * S P S set as a pyramid, the P tallest in the middle.
 * The needle sweeps over the letters and points at the centre of the P when you are in tune.
 */
export function Sps({ cents, onLock }: SkinProps) {
  const st = useOnce(() => ({ hold: new Hold(), angle: 0, flash: 0 }));
  const centsRef = useLatest(cents);
  const lockRef = useLatest(onLock);

  const canvas = useCanvasLoop((ctx, w, h, t, dt) => {
    const c = centsRef.current;
    const q = quality(c);
    const r = st.hold.update(dt, c);
    if (r.locked) {
      st.flash = 1;
      lockRef.current?.();
    }
    st.flash = Math.max(0, st.flash - dt / 600);
    const target = c === null ? Math.sin(t) * 0.04 : (Math.max(-50, Math.min(50, c)) / 50) * 0.95;
    st.angle += (target - st.angle) * Math.min(1, dt / 110);

    ctx.fillStyle = "#07090a";
    ctx.fillRect(0, 0, w, h);

    const base = h * 0.7;
    const cx = w / 2;
    ctx.font = `900 100px "Arial Black", Impact, system-ui, sans-serif`;
    const pW100 = ctx.measureText("P").width;
    const sW100 = ctx.measureText("S").width;
    // fit the whole pyramid inside the width: P + two S (0.58 of P) + two gaps (0.08 of P)
    const fit = (w * 0.9) / ((pW100 + 2 * 0.58 * sW100) / 100 + 2 * 0.08);
    const pH = Math.min(h * 0.5, fit);
    const sH = pH * 0.58;
    const gap = pH * 0.08;
    const lit = r.progress + st.flash;

    const letter = (ch: string, x: number, size: number, glow: number) => {
      ctx.font = `900 ${size}px "Arial Black", Impact, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = LIME;
      ctx.shadowBlur = 6 + 34 * glow;
      ctx.fillStyle = glow > 0.05 ? LIME : "#3c4a2e";
      ctx.strokeStyle = LIME;
      ctx.lineWidth = 3;
      ctx.strokeText(ch, x, base);
      ctx.globalAlpha = 0.15 + 0.85 * Math.min(1, glow);
      ctx.fillText(ch, x, base);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };
    ctx.font = `900 ${pH}px "Arial Black", Impact, system-ui, sans-serif`;
    const pW = ctx.measureText("P").width;
    ctx.font = `900 ${sH}px "Arial Black", Impact, system-ui, sans-serif`;
    const sW = ctx.measureText("S").width;
    letter("S", cx - pW / 2 - gap - sW / 2, sH, 0.15 + 0.5 * lit);
    letter("S", cx + pW / 2 + gap + sW / 2, sH, 0.15 + 0.5 * lit);
    letter("P", cx, pH, 0.2 + q * 0.5 + lit);

    // needle pivots under the P and sweeps from the left S, over the P, to the right S
    const px = cx;
    const py = base + pH * 0.32;
    const len = pH * 0.32 + pH * 0.42;
    const a = st.angle - Math.PI / 2;
    ctx.save();
    ctx.shadowColor = LIME;
    ctx.shadowBlur = 8 + 24 * q;
    ctx.strokeStyle = LIME;
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fillStyle = LIME;
    ctx.fill();
    // target dot in the bowl of the P
    ctx.beginPath();
    ctx.arc(px, base - pH * 0.5, 6, 0, Math.PI * 2);
    ctx.strokeStyle = LIME;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (st.flash > 0) {
      ctx.fillStyle = `rgba(216,255,74,${st.flash * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    }
  });

  return <canvas ref={canvas} className="skin-canvas" role="img" aria-label="SPS tuner skin: the needle points at the centre of the P when you are in tune" />;
}
