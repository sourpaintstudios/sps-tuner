import { Hold, LIME, quality, useCanvasLoop, useLatest, useOnce, type SkinProps } from "./common";

/** A cat that grimaces when you're off and breaks into a big smile when you're in tune. */
export function Cat({ cents, onLock }: SkinProps) {
  const st = useOnce(() => ({ hold: new Hold(), q: 0, hearts: [] as { x: number; y: number; v: number; life: number }[], blink: 0 }));
  const centsRef = useLatest(cents);
  const lockRef = useLatest(onLock);

  const canvas = useCanvasLoop((ctx, w, h, t, dt) => {
    const c = centsRef.current;
    const r = st.hold.update(dt, c);
    st.q += (quality(c) - st.q) * Math.min(1, dt / 160);
    const q = st.q;
    const happy = Math.max(r.progress, q > 0.88 ? (q - 0.88) / 0.12 : 0);
    const cx = w / 2;
    const cy = h * 0.5;
    const S = Math.min(w, h) * 0.34;
    const sway = c === null ? 0 : Math.max(-1, Math.min(1, c / 50)) * 0.12;

    ctx.fillStyle = "#07090a";
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(cx, cy, S * 0.4, cx, cy, S * 2.2);
    glow.addColorStop(0, `rgba(216,255,74,${0.05 + 0.2 * happy})`);
    glow.addColorStop(1, "rgba(216,255,74,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy + S * 0.1);
    ctx.rotate(sway + Math.sin(t * 1.4) * 0.015);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = LIME;
    ctx.fillStyle = "#0e130f";
    ctx.lineWidth = Math.max(4, S * 0.045);

    // ears fold back when off, perk up when in tune
    const earLift = (1 - q) * -0.18 + happy * 0.1;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * S * 0.62, -S * 0.62);
      ctx.rotate(side * earLift);
      ctx.beginPath();
      ctx.moveTo(-side * S * 0.3, S * 0.12);
      ctx.lineTo(side * S * 0.02, -S * 0.5);
      ctx.lineTo(side * S * 0.22, S * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // head
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.95, S * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // eyes: wide when off, happy arcs when in tune
    t % 4 < 0.12 ? (st.blink = 1) : (st.blink = 0);
    for (const side of [-1, 1]) {
      const ex = side * S * 0.38;
      const ey = -S * 0.12;
      if (happy > 0.55) {
        ctx.beginPath();
        ctx.arc(ex, ey + S * 0.06, S * 0.16, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (st.blink) {
        ctx.beginPath();
        ctx.moveTo(ex - S * 0.14, ey);
        ctx.lineTo(ex + S * 0.14, ey);
        ctx.stroke();
      } else {
        const wide = 0.12 + (1 - q) * 0.1;
        ctx.beginPath();
        ctx.ellipse(ex, ey, S * wide, S * (wide + 0.06), 0, 0, Math.PI * 2);
        ctx.fillStyle = LIME;
        ctx.fill();
        ctx.fillStyle = "#07090a";
        ctx.beginPath();
        ctx.ellipse(ex + (c ?? 0) * 0.002 * S, ey, S * 0.035, S * (0.1 + (1 - q) * 0.06), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0e130f";
      }
    }
    // nose
    ctx.fillStyle = LIME;
    ctx.beginPath();
    ctx.moveTo(-S * 0.07, S * 0.1);
    ctx.lineTo(S * 0.07, S * 0.1);
    ctx.lineTo(0, S * 0.19);
    ctx.closePath();
    ctx.fill();
    // mouth: frown to grin
    const m = happy * 2 - 1 + (q < 0.4 ? -0.4 : 0); // -1 frown .. +1 grin
    ctx.beginPath();
    const my = S * 0.3;
    ctx.moveTo(-S * 0.3, my + m * -S * 0.06);
    ctx.quadraticCurveTo(-S * 0.15, my + m * S * 0.22, 0, my + S * 0.02);
    ctx.quadraticCurveTo(S * 0.15, my + m * S * 0.22, S * 0.3, my + m * -S * 0.06);
    ctx.stroke();
    if (happy > 0.8) {
      ctx.beginPath();
      ctx.moveTo(-S * 0.26, my + S * 0.06);
      ctx.quadraticCurveTo(0, my + S * 0.5, S * 0.26, my + S * 0.06);
      ctx.closePath();
      ctx.fillStyle = "#ff7ad9";
      ctx.fill();
      ctx.stroke();
    }
    // whiskers
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(side * S * 0.5, S * 0.22 + i * S * 0.07);
        ctx.lineTo(side * S * 1.15, S * 0.12 + i * S * 0.16 + (1 - q) * side * S * 0.05);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (r.locked) {
      lockRef.current?.();
      for (let i = 0; i < 14; i++) st.hearts.push({ x: cx + (Math.random() - 0.5) * S * 2, y: cy - S * 0.4, v: 40 + Math.random() * 90, life: 1 });
    }
    st.hearts = st.hearts.filter((p) => p.life > 0);
    for (const p of st.hearts) {
      p.y -= (p.v * dt) / 1000;
      p.life -= dt / 1300;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = LIME;
      ctx.font = `${S * 0.22}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("♥", p.x, p.y);
    }
    ctx.globalAlpha = 1;
  });

  return <canvas ref={canvas} className="skin-canvas" role="img" aria-label="Cat tuner skin: the cat smiles when you are in tune" />;
}
