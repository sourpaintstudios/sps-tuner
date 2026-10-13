import { Hold, LIME, quality, useCanvasLoop, useLatest, useOnce, type SkinProps } from "./common";

type Drop = { x: number; y: number; vy: number; r: number; color: string; life: number };

/** Flat runs cold and blue, sharp runs hot and pink, in tune runs lime. Paint drips and pools. */
export function PaintDrip({ cents, onLock }: SkinProps) {
  const st = useOnce(() => ({ hold: new Hold(), drops: [] as Drop[], clear: true, acc: 0 }));
  const centsRef = useLatest(cents);
  const lockRef = useLatest(onLock);

  const canvas = useCanvasLoop((ctx, w, h, t, dt) => {
    if (st.clear) {
      ctx.fillStyle = "#07090a";
      ctx.fillRect(0, 0, w, h);
      st.clear = false;
    }
    // paint stays on the canvas and slowly dims
    ctx.fillStyle = "rgba(7,9,10,0.06)";
    ctx.fillRect(0, 0, w, h);

    const c = centsRef.current;
    const q = quality(c);
    const r = st.hold.update(dt, c);

    let color = "#3a4630";
    if (c !== null) {
      if (Math.abs(c) <= 6) color = LIME;
      else {
        const k = Math.min(1, Math.abs(c) / 50);
        color = c < 0 ? `hsl(${215 + 40 * k} 85% ${58 - 12 * k}%)` : `hsl(${20 - 25 * k} 95% ${58}%)`;
      }
    }

    // spawn rate rises as you get closer to in tune
    if (c !== null) {
      st.acc += dt * (1.5 + 6 * q);
      while (st.acc > 100) {
        st.acc -= 100;
        st.drops.push({
          x: w * (0.1 + 0.8 * Math.random()),
          y: -6,
          vy: 90 + Math.random() * 140,
          r: 2.5 + Math.random() * 5 + q * 3,
          color,
          life: 1,
        });
      }
    }
    if (r.locked) {
      lockRef.current?.();
      ctx.save();
      for (let i = 0; i < 26; i++) {
        const x = w * Math.random();
        const y = h * (0.15 + 0.7 * Math.random());
        const rad = 8 + Math.random() * 38;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.3 ? LIME : "#fff6a8";
        ctx.shadowColor = LIME;
        ctx.shadowBlur = 16;
        ctx.fill();
      }
      ctx.restore();
    }

    st.drops = st.drops.filter((d) => d.y < h + 20);
    for (const d of st.drops) {
      d.y += (d.vy * dt) / 1000;
      d.vy += (60 * dt) / 1000;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
      // drip trail
      ctx.globalAlpha = 0.6;
      ctx.fillRect(d.x - d.r * 0.3, d.y - d.r * 3.5, d.r * 0.6, d.r * 3.5);
      ctx.globalAlpha = 1;
    }

    // pool along the bottom edge
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, h - 4 - 6 * q, w, 10);
    ctx.globalAlpha = 1;
    void t;
  });

  return <canvas ref={canvas} className="skin-canvas" role="img" aria-label="Paint drip tuner skin: cold blue when flat, hot pink when sharp, lime when in tune" />;
}
