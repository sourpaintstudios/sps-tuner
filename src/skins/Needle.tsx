import { Hold, LIME, quality, useCanvasLoop, useLatest, useOnce, type SkinProps } from "./common";

/** Clean gauge: a lime needle on an arc. Centre is in tune, left flat, right sharp. */
export function Needle({ cents, onLock }: SkinProps) {
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
    st.flash = Math.max(0, st.flash - dt / 500);
    const target = c === null ? Math.sin(t * 0.9) * 0.05 : (Math.max(-50, Math.min(50, c)) / 50) * 1.05;
    st.angle += (target - st.angle) * Math.min(1, dt / 110);

    ctx.fillStyle = "#07090a";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.8;
    const R = Math.min(w * 0.46, h * 0.68);

    // tick marks, -50..+50 cents
    for (let i = -50; i <= 50; i += 5) {
      const a = (i / 50) * 1.05 - Math.PI / 2;
      const major = i % 25 === 0;
      const r0 = R * (major ? 0.82 : 0.88);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.strokeStyle = i === 0 ? LIME : "#4a5c3a";
      ctx.lineWidth = i === 0 ? 4 : major ? 3 : 1.5;
      ctx.stroke();
    }
    // in-tune zone
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.94, -Math.PI / 2 - 0.13, -Math.PI / 2 + 0.13);
    ctx.strokeStyle = LIME;
    ctx.globalAlpha = 0.25 + 0.5 * r.progress + st.flash * 0.25;
    ctx.lineWidth = R * 0.07;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#8a9a7a";
    ctx.font = `700 ${Math.max(14, R * 0.12)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("♭", cx - R * 0.78, cy - R * 0.5);
    ctx.fillText("♯", cx + R * 0.78, cy - R * 0.5);

    // needle
    const a = st.angle - Math.PI / 2;
    ctx.save();
    ctx.shadowColor = LIME;
    ctx.shadowBlur = 8 + 26 * q;
    ctx.strokeStyle = LIME;
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = LIME;
    ctx.fill();

    if (st.flash > 0) {
      ctx.fillStyle = `rgba(216,255,74,${st.flash * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
  });

  return <canvas ref={canvas} className="skin-canvas" role="img" aria-label="Needle tuner skin" />;
}
