import { useEffect, useRef } from "react";

export type SkinProps = {
  /** Cents from the nearest note (negative flat, positive sharp), or null with no signal. */
  cents: number | null;
  /** Called once each time the player holds the note dead in tune. */
  onLock?: () => void;
};

const LIME = "#d8ff4a";
const IN_TUNE = 6; // cents
const HOLD_MS = 650;

type Spark = { x: number; y: number; vx: number; vy: number; life: number; hue: number };

/**
 * County Road 9: the guitarist fires a sound beam at the UFO.
 * Flat drops the UFO below the beam, sharp lifts it above. In tune: it sits in the beam,
 * the beam blazes, and after a short hold the UFO blows up and a new one arrives.
 */
export function CountyRoad9({ cents, onLock }: SkinProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const centsRef = useRef<number | null>(cents);
  centsRef.current = cents;
  const lockRef = useRef(onLock);
  lockRef.current = onLock;

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

    const stars = Array.from({ length: 70 }, (_, i) => ({
      x: ((i * 9301 + 49297) % 233280) / 233280,
      y: (((i * 7919 + 12345) % 233280) / 233280) * 0.62,
      s: 0.4 + (i % 5) * 0.35,
      p: i * 1.3,
    }));

    let ufoY = 0; // eased offset, in fractions of height (+ = up)
    let hold = 0;
    let ufoGone = 0; // ms remaining until a new UFO arrives
    let flash = 0;
    let sparks: Spark[] = [];
    let raf = 0;
    let prev = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(64, now - prev);
      prev = now;
      const t = now / 1000;
      const c = centsRef.current;
      const horizonY = h * 0.78;
      const beamY = h * 0.46;
      const ufoX = w * 0.76;

      // ---- state ----
      const target = c === null ? 0.1 * Math.sin(t * 0.8) + 0.12 : Math.max(-1, Math.min(1, c / 50)) * 0.34;
      ufoY += (target - ufoY) * Math.min(1, dt / 120);
      const inTune = c !== null && Math.abs(c) <= IN_TUNE && ufoGone <= 0;
      const quality = c === null ? 0 : Math.max(0, 1 - Math.abs(c) / 50);
      if (ufoGone > 0) {
        ufoGone -= dt;
        hold = 0;
      } else if (inTune) {
        hold += dt;
        if (hold >= HOLD_MS) {
          hold = 0;
          ufoGone = 1500;
          flash = 1;
          const ex = ufoX;
          const ey = beamY - ufoY * h;
          for (let i = 0; i < 46; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 60 + Math.random() * 260;
            sparks.push({ x: ex, y: ey, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, hue: Math.random() });
          }
          lockRef.current?.();
        }
      } else {
        hold = Math.max(0, hold - dt * 2);
      }
      flash = Math.max(0, flash - dt / 400);

      // ---- sky ----
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, "#04060a");
      sky.addColorStop(1, "#14201a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + s.p);
        ctx.fillStyle = "#fff";
        ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
      }
      ctx.globalAlpha = 1;

      // ---- ground and County Road 9 ----
      ctx.fillStyle = "#0b0f0c";
      ctx.fillRect(0, horizonY, w, h - horizonY);
      ctx.beginPath();
      ctx.moveTo(w * 0.46, horizonY);
      ctx.lineTo(w * 0.54, horizonY);
      ctx.lineTo(w * 0.9, h);
      ctx.lineTo(w * 0.1, h);
      ctx.closePath();
      ctx.fillStyle = "#171c18";
      ctx.fill();
      ctx.strokeStyle = LIME;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 16]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, horizonY);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // road sign
      ctx.fillStyle = "#1d2a1f";
      ctx.fillRect(w * 0.035, horizonY - h * 0.1, 3, h * 0.1);
      ctx.fillStyle = LIME;
      ctx.fillRect(w * 0.035 - 14, horizonY - h * 0.13, 31, 16);
      ctx.fillStyle = "#07090a";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CR 9", w * 0.035 + 1.5, horizonY - h * 0.13 + 12);

      // ---- guitarist (left) ----
      const gx = w * 0.17;
      const gy = horizonY - 2;
      const body = Math.min(w, h) * 0.2;
      const pulse = c === null ? 0 : Math.sin(t * 14) * quality * 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = LIME;
      ctx.fillStyle = LIME;
      ctx.lineWidth = Math.max(3, body * 0.045);
      // legs
      ctx.beginPath();
      ctx.moveTo(gx, gy - body * 0.5);
      ctx.lineTo(gx - body * 0.14, gy);
      ctx.moveTo(gx, gy - body * 0.5);
      ctx.lineTo(gx + body * 0.16, gy);
      ctx.stroke();
      // torso
      ctx.beginPath();
      ctx.moveTo(gx, gy - body * 0.5);
      ctx.lineTo(gx, gy - body * 0.92 + pulse);
      ctx.stroke();
      // head and hat
      ctx.beginPath();
      ctx.arc(gx, gy - body * 1.04 + pulse, body * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(gx - body * 0.14, gy - body * 1.1 + pulse, body * 0.28, body * 0.03);
      // guitar, neck raised toward the UFO
      const ang = -0.38 - (ufoY / 0.34) * 0.12;
      ctx.save();
      ctx.translate(gx + body * 0.02, gy - body * 0.66);
      ctx.rotate(ang);
      ctx.lineWidth = Math.max(3, body * 0.035);
      ctx.beginPath(); // neck
      ctx.moveTo(0, 0);
      ctx.lineTo(body * 0.78, 0);
      ctx.stroke();
      ctx.beginPath(); // body
      ctx.ellipse(-body * 0.06, body * 0.02, body * 0.2, body * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#0b0f0c";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = LIME;
      ctx.fillRect(body * 0.74, -body * 0.045, body * 0.1, body * 0.09); // headstock
      ctx.restore();
      // arms
      ctx.lineWidth = Math.max(3, body * 0.04);
      ctx.beginPath();
      ctx.moveTo(gx, gy - body * 0.86 + pulse);
      ctx.lineTo(gx + body * 0.2, gy - body * 0.66);
      ctx.moveTo(gx, gy - body * 0.86 + pulse);
      ctx.lineTo(gx + body * 0.46, gy - body * 0.8);
      ctx.stroke();

      // ---- beam ----
      const bx0 = gx + body * 0.02 + Math.cos(ang) * body * 0.78;
      const by0 = gy - body * 0.66 + Math.sin(ang) * body * 0.78;
      const bx1 = ufoX - w * 0.06;
      const bBright = c === null ? 0 : inTune ? 1 : quality * quality;
      if (bBright > 0.02 && ufoGone <= 0) {
        const lens = 3;
        for (let k = 0; k < lens; k++) {
          ctx.beginPath();
          const steps = 60;
          for (let i = 0; i <= steps; i++) {
            const f = i / steps;
            const x = bx0 + (bx1 - bx0) * f;
            const yLine = by0 + (beamY - by0) * f;
            const amp = (1 - bBright) * 16 + 3 + k;
            const y = yLine + Math.sin(f * 22 - t * 18 + k * 2) * amp * Math.sin(Math.PI * f);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = LIME;
          ctx.globalAlpha = (0.12 + 0.5 * bBright) * (k === 0 ? 1 : 0.5);
          ctx.lineWidth = inTune ? 4 + k * 3 : 1.5 + k * 2;
          ctx.shadowColor = LIME;
          ctx.shadowBlur = 6 + 22 * bBright;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // ---- UFO ----
      if (ufoGone <= 0) {
        const ux = ufoX + Math.sin(t * 2.1) * 4;
        const uy = beamY - ufoY * h + Math.sin(t * 3.3) * 3;
        const r = Math.min(w, h) * 0.085;
        const glow = inTune ? 0.4 + 0.6 * (hold / HOLD_MS) : 0.12 + 0.2 * quality;
        const g = ctx.createRadialGradient(ux, uy, r * 0.2, ux, uy, r * 2.6);
        g.addColorStop(0, `rgba(216,255,74,${glow})`);
        g.addColorStop(1, "rgba(216,255,74,0)");
        ctx.fillStyle = g;
        ctx.fillRect(ux - r * 3, uy - r * 3, r * 6, r * 6);
        // dome
        ctx.beginPath();
        ctx.ellipse(ux, uy - r * 0.15, r * 0.55, r * 0.5, 0, Math.PI, 0);
        ctx.fillStyle = "#9bd8c4";
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
        // saucer
        ctx.beginPath();
        ctx.ellipse(ux, uy, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#5c6a63";
        ctx.fill();
        ctx.strokeStyle = LIME;
        ctx.lineWidth = 2;
        ctx.stroke();
        // lights
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(ux + i * r * 0.36, uy + r * 0.04, 3, 0, Math.PI * 2);
          ctx.fillStyle = (Math.floor(t * 6) + i) % 2 === 0 ? LIME : "#2a3a22";
          ctx.fill();
        }
        // lock ring
        if (inTune) {
          ctx.beginPath();
          ctx.arc(ux, uy, r * (1.5 - 0.4 * (hold / HOLD_MS)), 0, Math.PI * 2);
          ctx.strokeStyle = LIME;
          ctx.lineWidth = 3;
          ctx.shadowColor = LIME;
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else if (ufoGone < 500) {
        // a new UFO fades in at the edge
        const a = 1 - ufoGone / 500;
        ctx.globalAlpha = a * 0.5;
        ctx.beginPath();
        ctx.ellipse(w * 0.9, h * 0.2, 14, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = LIME;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ---- explosion ----
      if (flash > 0) {
        ctx.fillStyle = `rgba(216,255,74,${flash * 0.28})`;
        ctx.fillRect(0, 0, w, h);
      }
      sparks = sparks.filter((s) => s.life > 0);
      for (const s of sparks) {
        s.x += (s.vx * dt) / 1000;
        s.y += (s.vy * dt) / 1000;
        s.vy += (240 * dt) / 1000;
        s.life -= dt / 1100;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.hue > 0.6 ? "#fff6a8" : s.hue > 0.25 ? LIME : "#ff7ad9";
        ctx.fillRect(s.x, s.y, 4, 4);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvas} className="skin-canvas" role="img" aria-label="County Road 9 tuner skin: a guitarist firing a sound beam at a UFO" />;
}
