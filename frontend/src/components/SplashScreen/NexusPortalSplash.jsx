import React, { useEffect, useRef } from 'react';

/**
 * NexusPortalSplash
 * High-fidelity, cinematic ColorOS 17 Violet & Cyan Holographic Netflix-style intro engine.
 * Converted directly from netflix-intro-max.html with all optimizations:
 * - 4x Supersampled offscreen stem cache to eliminate pixel crawling
 * - 1:1 ColorOS 17 Violet & Cyan Holographic chromatic fiber spectrum
 * - Log-space camera velocity curve with zero flat spots
 * - 1-row GPU texture stretch optimization cutting pixel rendering by ~100x
 * - Web Audio API cinematic "Ta-Dum" engine with audio latency offset compensation
 */

/* =====================================================================
   1. TIMELINE (seconds)
   ===================================================================== */
const T = {
  a0: 0.30, a1: 0.72,   // left stem draws (bottom → top)
  d0: 0.64, d1: 1.08,   // diagonal draws  (top → bottom)
  b0: 1.00, b1: 1.40,   // right stem draws (bottom → top)
  s0: 1.42, s1: 2.12,   // light sweep
  e0: 2.18, e1: 2.44,   // right stem erases (top → bottom)
  f0: 2.40, f1: 2.80,   // diagonal erases  (bottom → top)
  z0: 2.78, z1: 6.30,   // dive into remaining stem → spread → close
  o0: 6.05,             // final fade to black
  end: 6.30             // black
};
const SMAX = 34;        // maximum camera zoom

/* =====================================================================
   2. HELPERS & MATH
   ===================================================================== */
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const prog    = (t, a, b) => clamp01((t - a) / (b - a));
const smooth  = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp    = (a, b, k) => a + (b - a) * k;
const ease = {
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outCubic:   (k) => 1 - Math.pow(1 - k, 3),
  inCubic:    (k) => k * k * k,
  inOutSine:  (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  inOutQuart: (k) => (k < 0.5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2),
  stroke:     (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
};
const rgb  = (c, m = 1, a = 1) =>
  `rgba(${Math.min(255, c[0] * m) | 0},${Math.min(255, c[1] * m) | 0},${Math.min(255, c[2] * m) | 0},${a})`;
const mix  = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
const hex  = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =====================================================================
   3. COLOURS (Nexus OS 17 Violet & Cyan Holographic Theme)
   ===================================================================== */
const THEME_DIAG = hex("#7c3aed");
const THEME_STEM = hex("#4c1d95");
const FUR_BASE   = hex("#0c0317");
const THEME_COLORS = [
  "#3b0764", "#581c87", "#7c3aed", "#6d28d9", "#8b5cf6", "#4c1d95",
  "#701a75", "#c026d3", "#db2777", "#ec4899", "#f472b6", "#be185d",
  "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#2563eb", "#3b82f6"
].map(hex);

const LIGHTS = [
  "#38bdf8", "#c084fc", "#ec4899", "#00f0ff", "#7c3aed", "#0ea5e9",
  "#f472b6", "#a855f7", "#3b82f6", "#ffffff", "#2dd4bf", "#e879f9",
  "#60a5fa", "#db2777", "#38bdf8", "#c4b5fd", "#ec4899", "#0284c7"
].map(hex);

/* =====================================================================
   AUTHENTIC CHROMATIC FIBER SPECTRUM (Exact 1:1 match)
   ===================================================================== */
const FIBERS = [
  { x: 0.0,  w: 2.4, stops: [[0, "#1e0836"], [0.6, "#3b0764"], [1, "#2e1065"]] },
  { x: 2.4,  w: 2.8, stops: [[0, "#3b0764"], [0.35, "#581c87"], [0.65, "#6d28d9"], [1, "#4c1d95"]] },
  { x: 5.2,  w: 2.6, stops: [[0, "#4c1d95"], [0.4, "#7c3aed"], [0.7, "#8b5cf6"], [1, "#6d28d9"]] },
  { x: 7.8,  w: 2.4, stops: [[0, "#0369a1"], [0.4, "#0284c7"], [0.7, "#38bdf8"], [1, "#0ea5e9"]] },
  { x: 10.2, w: 2.6, stops: [[0, "#0284c7"], [0.3, "#38bdf8"], [0.55, "#ffffff"], [0.75, "#7dd3fc"], [1, "#0369a1"]] },
  { x: 12.8, w: 2.5, stops: [[0, "#701a75"], [0.4, "#db2777"], [0.7, "#f472b6"], [1, "#be185d"]] },
  { x: 15.3, w: 2.2, stops: [[0, "#4a044e"], [0.45, "#831843"], [0.8, "#9d174d"], [1, "#3b0764"]] },
  { x: 17.5, w: 1.5, fill: "#08020e" },
  { x: 19.0, w: 2.4, stops: [[0, "#4a044e"], [0.5, "#a21caf"], [1, "#701a75"]] },
  { x: 21.4, w: 2.6, stops: [[0, "#831843"], [0.35, "#db2777"], [0.65, "#f472b6"], [1, "#9d174d"]] },
  { x: 24.0, w: 2.4, stops: [[0, "#2e1065"], [0.5, "#581c87"], [1, "#3b0764"]] },
  { x: 26.4, w: 2.6, stops: [[0, "#4c1d95"], [0.4, "#7c3aed"], [0.65, "#c4b5fd"], [1, "#5b21b6"]] },
  { x: 29.0, w: 2.2, stops: [[0, "#1e1b4b"], [0.4, "#6366f1"], [0.7, "#818cf8"], [1, "#312e81"]] },
  { x: 31.2, w: 1.6, fill: "#020412" },
  { x: 32.8, w: 2.8, stops: [[0, "#0f172a"], [0.4, "#1d4ed8"], [0.7, "#2563eb"], [1, "#1e3a8a"]] },
  { x: 35.6, w: 3.2, stops: [[0, "#1e3a8a"], [0.35, "#3b82f6"], [0.65, "#60a5fa"], [1, "#1d4ed8"]] },
  { x: 38.8, w: 3.4, stops: [[0, "#0284c7"], [0.3, "#38bdf8"], [0.55, "#ffffff"], [0.75, "#7dd3fc"], [1, "#0369a1"]] },
  { x: 42.2, w: 2.2, stops: [[0, "#1e40af"], [0.45, "#2563eb"], [0.8, "#3b82f6"], [1, "#1d4ed8"]] },
  { x: 44.4, w: 1.6, stops: [[0, "#172554"], [0.5, "#0f172a"], [1, "#020617"]] }
];

/* =====================================================================
   7. THE DIVE & VELOCITY SETUP
   ===================================================================== */
const PF = 0.46;
const VEL_N = 400;
const VEL = (() => {
  const v = (p) =>
    p < 0.42
      ? smooth(0, 0.18, p) * 0.97 + 0.03
      : p < 0.72
      ? lerp(1, 0.16, smooth(0.42, 0.72, p))
      : 0.16 * (1 - 0.55 * smooth(0.72, 1, p));
  const cum = new Float32Array(VEL_N + 1);
  for (let i = 1; i <= VEL_N; i++) cum[i] = cum[i - 1] + v((i - 0.5) / VEL_N) / VEL_N;
  return cum;
})();
const velAt = (p) => {
  const f = clamp01(p) * VEL_N, i = Math.floor(f), k = f - i;
  return i >= VEL_N ? VEL[VEL_N] : lerp(VEL[i], VEL[i + 1], k);
};

const zr = mulberry32(0x17A5E0);
const RIBBONS = [];
FIBERS.forEach((fib) => {
  if (fib.fill) return;
  const fu0 = fib.x / 46, fu1 = (fib.x + fib.w) / 46;
  const n = Math.max(3, Math.round(fib.w * 1.8));
  for (let k = 0; k < n; k++) {
    RIBBONS.push({
      fib, fu0, fu1,
      u0: lerp(fu0, fu1, k / n), u1: lerp(fu0, fu1, (k + 1) / n),
      depth: 0.55 + zr() * 1.15,
      thin:  0.18 + zr() * 0.55,
      gone:  0.88 + zr() * 0.11,
      fr: 0.6 + zr() * 0.9, ph: zr() * 6.283,
      glow: zr() < 0.22
    });
  }
});

const FILAMENTS = [];
(() => {
  const step = 0.13;
  for (let u = 0.02; u < 0.98; u += step) {
    FILAMENTS.push({ u,               w: 0.016, col: hex("#ffffff"), base: 0.32 * 0.22, depth: 0.7 + zr() * 0.9 });
    FILAMENTS.push({ u: u + step*0.4, w: 0.018, col: hex("#f472b6"), base: 0.32 * 0.28, depth: 0.7 + zr() * 0.9 });
    FILAMENTS.push({ u: u + step*0.7, w: 0.014, col: hex("#38bdf8"), base: 0.32 * 0.25, depth: 0.7 + zr() * 0.9 });
  }
  for (let i = 0; i < 30; i++) {
    const r = zr() - 0.5;
    FILAMENTS.push({
      u: 0.5 + r * 0.9 + (zr() - 0.5) * 0.05,
      w: 0.004 + zr() * 0.012,
      col: LIGHTS[(zr() * LIGHTS.length) | 0],
      base: 0, late: 0.30 + zr() * 0.30, depth: 0.6 + zr() * 1.2
    });
  }
  FILAMENTS.forEach((f) => { f.fr = 0.5 + zr() * 1.0; f.ph = zr() * 6.283; f.gone = 0.88 + zr() * 0.11; });
})();

const NexusPortalSplash = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    let ctx = cvs.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1, G = null;
    let running = true, raf = 0, perfStart = 0, audioStart = 0, useAudioClock = false, rate = 1;
    let STEM = null, LAYER_R = null, LAYER_D = null, ROW = null, ROWCTX = null;
    let AC = null, master = null;

    const safeFinish = () => {
      if (!completedRef.current) {
        completedRef.current = true;
        running = false;
        cancelAnimationFrame(raf);
        stopSound();
        if (onComplete) onComplete();
      }
    };

    function zoomCamera(pz) {
      if (pz <= 0) return { s: 1, pan: 0 };
      const Lfill = Math.log(Math.max(W * 1.18, H * 0.4) / G.lw);
      const l = Lfill * velAt(pz) / velAt(PF);
      return { s: Math.exp(l), pan: ease.inOutCubic(clamp01(pz / (PF + 0.04))) };
    }

    function zoomState(p) {
      const c   = zoomCamera(p);
      const SW  = G.lw * c.s;
      const oxp = lerp(G.O.x, G.C.x, c.pan);
      const q   = smooth(0.20, PF + 0.22, p);
      const sp  = ease.inOutSine(smooth(PF - 0.12, 1, p));
      return { SW, q, sp, ox: oxp,
               X: (u, d) => oxp + (u - 0.5) * SW * (1 + (d - 1) * q * 0.9) * (1 + sp * 0.9 * d) };
    }

    function drawFibersStem(x, y, w, h) {
      if (h <= 0) return;
      ctx.fillStyle = "#030008";
      ctx.fillRect(x, y, w, h);

      for (let i = 0; i < FIBERS.length; i++) {
        const fib = FIBERS[i];
        const fx = x + (fib.x / 46.0) * w;
        const fw = (fib.w / 46.0) * w;
        if (fib.fill) {
          ctx.fillStyle = fib.fill;
          ctx.fillRect(fx, y, fw + 0.35, h);
        } else {
          const gr = ctx.createLinearGradient(fx, 0, fx + fw, 0);
          for (let s = 0; s < fib.stops.length; s++) {
            gr.addColorStop(fib.stops[s][0], fib.stops[s][1]);
          }
          ctx.fillStyle = gr;
          ctx.fillRect(fx, y, fw + 0.35, h);
        }
      }

      ctx.save();
      const baseA = ctx.globalAlpha * 0.32;
      const devPx = 1 / Math.max(1e-6, Math.abs(ctx.getTransform().a));
      const hair = (hx, hw, style) => {
        const dw = Math.max(hw, devPx);
        ctx.globalAlpha = baseA * (hw / dw);
        ctx.fillStyle = style;
        ctx.fillRect(hx + hw / 2 - dw / 2, y, dw, h);
      };
      const step = Math.max(3, w * 0.13);
      for (let sx = x + 1; sx < x + w - 1; sx += step) {
        hair(sx,              0.75, "rgba(255,255,255,0.22)");
        hair(sx + step * 0.4, 0.85, "rgba(244,114,182,0.28)");
        hair(sx + step * 0.7, 0.65, "rgba(56,189,248,0.25)");
      }
      ctx.restore();
    }

    function drawFibersDiagonal(x0, y0, NW, NH, lw, dTop, dVis) {
      if (dVis <= dTop) return;
      const dx = NW - lw, dy = NH;
      const len = Math.hypot(dx, dy);
      const nx = dy / len, ny = -dx / len;

      const y_top = y0 + NH * dTop;
      const y_bot = y0 + NH * dVis;
      const topLx = x0 + dx * dTop;
      const topRx = topLx + lw;
      const botLx = x0 + dx * dVis;
      const botRx = botLx + lw;

      ctx.beginPath();
      ctx.moveTo(topLx, y_top);
      ctx.lineTo(topRx, y_top);
      ctx.lineTo(botRx, y_bot);
      ctx.lineTo(botLx, y_bot);
      ctx.closePath();
      ctx.fillStyle = "#030008";
      ctx.fill();

      for (let i = 0; i < FIBERS.length; i++) {
        const fib = FIBERS[i];
        const u0 = fib.x / 46.0;
        const u1 = (fib.x + fib.w) / 46.0;

        const p1x = topLx + u0 * lw, p1y = y_top;
        const p2x = topLx + u1 * lw, p2y = y_top;
        const p3x = botLx + u1 * lw, p3y = y_bot;
        const p4x = botLx + u0 * lw, p4y = y_bot;

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x + 0.35, p2y);
        ctx.lineTo(p3x + 0.35, p3y);
        ctx.lineTo(p4x, p4y);
        ctx.closePath();

        if (fib.fill) {
          ctx.fillStyle = fib.fill;
          ctx.fill();
        } else {
          const midTopX = (p1x + p2x) / 2;
          const midTopY = (p1y + p2y) / 2;
          const fw = (u1 - u0) * lw;
          const perp_w = fw * nx;

          const gx0 = midTopX - nx * (perp_w / 2);
          const gy0 = midTopY - ny * (perp_w / 2);
          const gx1 = midTopX + nx * (perp_w / 2);
          const gy1 = midTopY + ny * (perp_w / 2);

          const gr = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
          for (let s = 0; s < fib.stops.length; s++) {
            gr.addColorStop(fib.stops[s][0], fib.stops[s][1]);
          }
          ctx.fillStyle = gr;
          ctx.fill();
        }
      }

      ctx.save();
      ctx.globalAlpha = 0.32;
      const step = Math.max(3, lw * 0.13);
      for (let offset = 1; offset < lw - 1; offset += step) {
        const u = offset / lw;
        ctx.beginPath();
        ctx.moveTo(topLx + u * lw, y_top);
        ctx.lineTo(topLx + u * lw + 0.75, y_top);
        ctx.lineTo(botLx + u * lw + 0.75, y_bot);
        ctx.lineTo(botLx + u * lw, y_bot);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fill();

        const uPink = (offset + step * 0.4) / lw;
        if (uPink < 0.98) {
          ctx.beginPath();
          ctx.moveTo(topLx + uPink * lw, y_top);
          ctx.lineTo(topLx + uPink * lw + 0.85, y_top);
          ctx.lineTo(botLx + uPink * lw + 0.85, y_bot);
          ctx.lineTo(botLx + uPink * lw, y_bot);
          ctx.closePath();
          ctx.fillStyle = "rgba(244,114,182,0.28)";
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function buildGeometry() {
      const u  = Math.min(W, H) / 100;
      const NH = 48 * u;
      const NW = NH * (150 / 250);
      const lw = NW * (46 / 150);
      const x0 = W / 2 - NW / 2;
      const y0 = H / 2 - NH / 2;
      const xr = x0 + NW - lw;

      const L = new Path2D();
      L.rect(x0, y0, lw, NH);

      const R = new Path2D();
      R.rect(xr, y0, lw, NH);

      const D = new Path2D();
      D.moveTo(x0, y0);
      D.lineTo(x0 + lw, y0);
      D.lineTo(xr + lw, y0 + NH);
      D.lineTo(xr, y0 + NH);
      D.closePath();

      const ALL = new Path2D();
      ALL.addPath(L); ALL.addPath(R); ALL.addPath(D);

      G = { u, NH, NW, lw, x0, y0, xr, L, R, D, ALL,
            O: { x: x0 + lw / 2, y: y0 + NH / 2 },
            C: { x: W / 2, y: H / 2 } };
    }

    function makeLayer(drawFn, bx, by, bw, bh) {
      const ox = Math.floor(bx * DPR), oy = Math.floor(by * DPR);
      const c = document.createElement("canvas");
      c.width  = Math.max(1, Math.ceil((bx + bw) * DPR) - ox);
      c.height = Math.max(1, Math.ceil((by + bh) * DPR) - oy);
      const main = ctx;
      ctx = c.getContext("2d");
      try { ctx.setTransform(DPR, 0, 0, DPR, -ox, -oy); drawFn(); } finally { ctx = main; }
      return { c, ox, oy };
    }

    function blitLayer(L, yTop, yBot) {
      if (!L) return;
      ctx.save();
      if (yTop !== undefined) {
        ctx.beginPath();
        ctx.rect(-1e5, yTop, 2e5, yBot - yTop);
        ctx.clip();
      }
      ctx.drawImage(L.c, L.ox / DPR, L.oy / DPR, L.c.width / DPR, L.c.height / DPR);
      ctx.restore();
    }

    function drawStemCached(revealFrac) {
      const g = G;
      if (revealFrac <= 0 || !STEM) return;
      ctx.save();
      if (revealFrac < 1) {
        ctx.beginPath();
        ctx.rect(g.x0 - 2, g.y0 + g.NH * (1 - revealFrac), g.lw + 4, g.NH * revealFrac + 2);
        ctx.clip();
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const o = STEM.pad / STEM.sc;
      ctx.drawImage(STEM.c, g.x0 - o, g.y0 - o, STEM.c.width / STEM.sc, STEM.c.height / STEM.sc);
      ctx.restore();
    }

    function buildStemCache() {
      const g = G;
      const k  = Math.max(1, Math.min(4, 4096 / (g.NH * DPR + 4)));
      const sc = DPR * k, pad = 2;
      const c = document.createElement("canvas");
      c.width  = Math.ceil(g.lw * sc) + pad * 2;
      c.height = Math.ceil(g.NH * sc) + pad * 2;
      const main = ctx;
      ctx = c.getContext("2d");
      try {
        ctx.setTransform(sc, 0, 0, sc, pad - g.x0 * sc, pad - g.y0 * sc);
        ctx.save();
        ctx.clip(g.L);
        drawFibersStem(g.x0, g.y0, g.lw, g.NH);
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(g.x0 + 0.6, g.y0 + g.NH);
        ctx.lineTo(g.x0 + 0.6, g.y0);
        ctx.stroke();
        ctx.restore();
      } finally { ctx = main; }
      STEM = { c, sc, pad };

      LAYER_R = makeLayer(() => {
        ctx.save();
        ctx.clip(g.R);
        drawFibersStem(g.xr, g.y0, g.lw, g.NH);
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(g.xr + g.lw - 0.6, g.y0 + g.NH);
        ctx.lineTo(g.xr + g.lw - 0.6, g.y0);
        ctx.stroke();
        ctx.restore();
      }, g.xr - 2, g.y0 - 2, g.lw + 4, g.NH + 4);

      LAYER_D = makeLayer(() => {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.shadowBlur  = 12 * DPR;
        ctx.shadowOffsetX = -6 * DPR;
        ctx.shadowOffsetY = 5 * DPR;
        ctx.fillStyle = "#030008";
        ctx.fill(g.D);
        ctx.shadowBlur = 4 * DPR;
        ctx.fill(g.D);
        ctx.restore();
        drawFibersDiagonal(g.x0, g.y0, g.NW, g.NH, g.lw, 0, 1);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(g.x0, g.y0);
        ctx.lineTo(g.x0 + g.NW - g.lw, g.y0 + g.NH);
        ctx.stroke();
      }, g.x0 - 40, g.y0 - 40, g.NW + 80, g.NH + 80);
    }

    function leadingEdge(x, y, w, strength, dir) {
      const h = G.NH * 0.05;
      const gr = ctx.createLinearGradient(0, y, 0, y + h * dir);
      gr.addColorStop(0, `rgba(56,189,248,${0.65 * strength})`);
      gr.addColorStop(0.3, `rgba(255,255,255,${0.50 * strength})`);
      gr.addColorStop(1, "rgba(56,189,248,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gr;
      if (dir > 0) ctx.fillRect(x - 1, y, w + 2, h);
      else         ctx.fillRect(x - 1, y - h, w + 2, h);
      ctx.restore();
    }

    function drawFloorReflection(g, t, fade, s, eA, eB, dVis, rTop, pz) {
      if (pz > 0.25) return;
      const reveal = Math.min(eA, Math.max(0, 1 - rTop), dVis);
      const reflAlpha = (1 - smooth(0, 0.25, pz)) * (1 - prog(t, T.e0, T.f1)) * fade * 0.25 * reveal;
      if (reflAlpha <= 0.005) return;

      const { x0, y0, NH, NW, xr } = g;
      const yBase = y0 + NH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 - NW * 0.3, yBase, NW * 1.6, NH * 0.35);
      ctx.clip();

      ctx.translate(0, yBase * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = reflAlpha;

      if (eA > 0) drawStemCached(eA);
      if (eB > 0 && rTop < 1) blitLayer(LAYER_R, y0 + NH * rTop, y0 + NH + 2);
      if (dVis > 0) blitLayer(LAYER_D, y0 - 2, y0 + NH * dVis);

      ctx.restore();

      const maskGrad = ctx.createLinearGradient(0, yBase, 0, yBase + NH * 0.35);
      maskGrad.addColorStop(0.00, "rgba(0,0,0,0.2)");
      maskGrad.addColorStop(0.45, "rgba(0,0,0,0.7)");
      maskGrad.addColorStop(1.00, "rgba(0,0,0,1.0)");
      ctx.fillStyle = maskGrad;
      ctx.fillRect(x0 - NW * 0.3, yBase, NW * 1.6, NH * 0.36);

      const floorGlow = ctx.createRadialGradient(x0 + NW / 2, yBase, 2, x0 + NW / 2, yBase, NW * 0.85);
      floorGlow.addColorStop(0.00, `rgba(168, 85, 247, ${0.18 * reflAlpha})`);
      floorGlow.addColorStop(0.40, `rgba(56, 189, 248, ${0.10 * reflAlpha})`);
      floorGlow.addColorStop(1.00, "rgba(0,0,0,0)");
      ctx.fillStyle = floorGlow;
      ctx.fillRect(x0 - NW * 0.5, yBase - 4, NW * 2, NH * 0.35);
    }

    function drawBrandTypography(g, t, fade, pz) {
      if (pz > 0.05) return;
      const inP = prog(t, T.b0 + 0.1, T.b1 + 0.15);
      const outP = prog(t, T.e0, T.f0);
      const textAlpha = inP * (1 - outP) * fade;
      if (textAlpha <= 0.01) return;

      const { x0, y0, NH, NW } = g;
      const cx = x0 + NW / 2;
      const cy = y0 + NH + Math.max(64, NH * 0.45);

      ctx.save();
      ctx.globalAlpha = textAlpha;

      const fontSize = Math.max(13, Math.round(g.u * 3.4));
      ctx.font = `900 ${fontSize}px 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const mainText = "NEXUS";
      const letterSpacing = fontSize * 0.42;
      let totalW = 0;
      for (let i = 0; i < mainText.length; i++) {
        totalW += ctx.measureText(mainText[i]).width + (i < mainText.length - 1 ? letterSpacing : 0);
      }

      const badgeGap = fontSize * 0.7;
      const badgeW = fontSize * 3.2;
      const badgeH = fontSize * 1.35;
      const combinedW = totalW + badgeGap + badgeW;
      let startX = cx - combinedW / 2;

      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < mainText.length; i++) {
        const char = mainText[i];
        ctx.fillText(char, startX + ctx.measureText(char).width / 2, cy);
        startX += ctx.measureText(char).width + letterSpacing;
      }

      const badgeX = startX + badgeGap - letterSpacing;
      const badgeY = cy - badgeH / 2;
      ctx.beginPath();
      const radius = badgeH / 2;
      ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius) : ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fillStyle = "rgba(139, 92, 246, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `700 ${Math.round(fontSize * 0.68)}px 'Outfit', -apple-system, sans-serif`;
      ctx.fillStyle = "#c4b5fd";
      ctx.fillText("OS 17", badgeX + badgeW / 2, cy + 0.5);

      const subY = cy + fontSize * 1.45;
      const subFontSize = Math.max(9, Math.round(fontSize * 0.68));
      ctx.font = `600 ${subFontSize}px 'Outfit', -apple-system, sans-serif`;

      const subText = "NEURAL SYNCHRONIZATION";
      const subSpacing = subFontSize * 0.24;
      let subW = 0;
      for (let i = 0; i < subText.length; i++) {
        subW += ctx.measureText(subText[i]).width + (i < subText.length - 1 ? subSpacing : 0);
      }

      const dotRadius = Math.max(2, subFontSize * 0.25);
      const dotGap = subFontSize * 0.9;
      const subTotalW = dotRadius * 2 + dotGap + subW;
      const dotX = cx - subTotalW / 2 + dotRadius;

      ctx.beginPath();
      ctx.arc(dotX, subY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#34d399";
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#94a3b8";
      let curSubX = dotX + dotRadius + dotGap;
      for (let i = 0; i < subText.length; i++) {
        const char = subText[i];
        ctx.fillText(char, curSubX + ctx.measureText(char).width / 2, subY);
        curSubX += ctx.measureText(char).width + subSpacing;
      }

      ctx.restore();
    }

    function drawZoomStem(pz, t, s, ox, oy) {
      const g = G;
      const outA = ctx.globalAlpha;
      const topS = Math.max(-2, oy - g.NH * s / 2);
      const botS = Math.min(H + 2, oy + g.NH * s / 2);
      if (botS <= topS) return;
      if (!ROW || ROW.width !== cvs.width) {
        ROW = document.createElement("canvas");
        ROW.width = cvs.width; ROW.height = 3;
        ROWCTX = ROW.getContext("2d");
      }
      const main = ctx;
      ctx = ROWCTX;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, ROW.width, ROW.height);
      const fade = 1;
      ctx.save();
      ctx.setTransform(DPR, 0, 0, 1, 0, 0);

      const now  = zoomState(pz);
      const dpz  = (1 / 60) * rate / (T.z1 - T.z0) * 1.5;
      const prev = zoomState(Math.max(0, pz - dpz));
      const X = now.X, XP = prev.X;
      const { SW, q, sp } = now;

      const top  = 0, hgt = 3;
      const cls  = smooth(0.86, 1.0, pz);

      const baseA = 1 - smooth(0.0, 0.75, q);
      if (baseA > 0) {
        ctx.globalAlpha = fade * baseA;
        ctx.fillStyle = "#030008";
        const l = Math.min(ox - SW / 2, prev.ox - prev.SW / 2);
        const r = Math.max(ox + SW / 2, prev.ox + prev.SW / 2);
        ctx.fillRect(l, top, r - l, hgt);
      }

      for (let i = 0; i < RIBBONS.length; i++) {
        const rb = RIBBONS[i];
        const xa = X(rb.u0, rb.depth), xb = X(rb.u1, rb.depth);
        const fullW = xb - xa;
        const die = smooth(rb.gone - 0.12, rb.gone, pz);
        const w = fullW * lerp(1, rb.thin, q) * (1 - 0.92 * Math.max(cls, die));
        if (w <= 0.02) continue;
        const cx  = (xa + xb) / 2;
        const cx0 = (XP(rb.u0, rb.depth) + XP(rb.u1, rb.depth)) / 2;
        const blur = Math.abs(cx - cx0);
        const span = Math.max(1, w + blur);
        const left = (cx + cx0) / 2 - span / 2;
        if (left > W + 40 || left + span < -40) continue;

        const fW = fullW / (rb.u1 - rb.u0) * (rb.fu1 - rb.fu0) * (w / fullW);
        const gx = cx - w / 2 - (rb.u0 - rb.fu0) / (rb.fu1 - rb.fu0) * fW;
        const gShift = Math.min(0, cx0 - cx);
        const gr = ctx.createLinearGradient(gx + gShift, 0, gx + gShift + fW + blur, 0);
        rb.fib.stops.forEach((st) => gr.addColorStop(st[0], st[1]));
        const breathe = 1 - 0.05 * q * (0.5 + 0.5 * Math.sin(t * rb.fr + rb.ph));
        ctx.globalAlpha = fade * breathe * (1 - die) * Math.min(1, w / span);
        ctx.fillStyle = gr;
        ctx.fillRect(left, top, span + 0.5 * (1 - q), hgt);
        if (rb.glow && q > 0.1) {
          ctx.globalCompositeOperation = "lighter";
          const hw = w * 2.6 + blur / 2;
          ctx.globalAlpha = fade * q * 0.16 * breathe * (1 - die) * (1 - cls) * Math.min(1, (w * 2.6) / hw);
          const mid = (cx + cx0) / 2;
          const hg = ctx.createLinearGradient(mid - hw, 0, mid + hw, 0);
          const c = rb.fib.stops[Math.floor(rb.fib.stops.length / 2)][1];
          hg.addColorStop(0, "rgba(0,0,0,0)"); hg.addColorStop(0.5, c); hg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = hg;
          ctx.fillRect(mid - hw, top, hw * 2, hgt);
          ctx.globalCompositeOperation = "source-over";
        }
      }

      const edgeA = 1 - smooth(0, 0.35, q);
      if (edgeA > 0) {
        const ex = X(0, 1), ex0 = XP(0, 1);
        const ew = Math.max(1.2, 1.2 * s), eb = Math.abs(ex - ex0);
        ctx.globalAlpha = fade * edgeA * 0.75 * (ew / (ew + eb));
        ctx.fillStyle = "#fff";
        ctx.fillRect(Math.min(ex, ex0), top, ew + eb, hgt);
      }

      ctx.globalCompositeOperation = "lighter";
      const ignite = smooth(PF - 0.28, PF + 0.12, pz);
      for (let i = 0; i < FILAMENTS.length; i++) {
        const fl = FILAMENTS[i];
        let a = fl.late !== undefined ? smooth(fl.late, fl.late + 0.14, pz) : lerp(fl.base, 1, ignite);
        const die = smooth(fl.gone - 0.1, fl.gone, pz);
        a *= (1 - die) * (0.95 + 0.05 * Math.sin(t * fl.fr + fl.ph) * ignite);
        if (a <= 0.004) continue;
        const x  = X(fl.u, fl.depth);
        const x0 = XP(fl.u, fl.depth);
        const blur = Math.abs(x - x0);
        const xm = (x + x0) / 2;
        const wRaw = fl.w * SW * (0.35 + 0.65 * (1 - q * 0.6)) * (1 + sp * 0.35) * (1 - 0.9 * Math.max(cls, die));
        const w = Math.max(0.75, wRaw);
        a *= Math.min(1, wRaw / 0.75);
        if (xm + w * 8 + blur < 0 || xm - w * 8 - blur > W) continue;
        if (ignite > 0.001) {
          const hw = w * 4 + blur / 2;
          const ha = 0.10 * a * ignite * Math.min(1, (w * 4) / hw);
          const hg = ctx.createLinearGradient(xm - hw, 0, xm + hw, 0);
          hg.addColorStop(0, rgb(fl.col, 1, 0));
          hg.addColorStop(0.5, rgb(fl.col, 1, ha));
          hg.addColorStop(1, rgb(fl.col, 1, 0));
          ctx.globalAlpha = fade;
          ctx.fillStyle = hg;
          ctx.fillRect(xm - hw, top, hw * 2, hgt);
        }
        const half = w + blur / 2;
        const ca = Math.min(0.9, a) * (w / (w + blur));
        const edge = clamp01(w / (2 * half));
        const col = rgb(mix(fl.col, [255, 255, 255], 0.25 * ignite), 1, ca);
        const cg = ctx.createLinearGradient(xm - half, 0, xm + half, 0);
        cg.addColorStop(0, rgb(fl.col, 1, 0));
        cg.addColorStop(Math.min(0.5, edge), col);
        cg.addColorStop(Math.max(0.5, 1 - edge), col);
        cg.addColorStop(1, rgb(fl.col, 1, 0));
        ctx.globalAlpha = fade;
        ctx.fillStyle = cg;
        ctx.fillRect(xm - half, top, half * 2, hgt);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      ctx = main;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = outA;
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(ROW, 0, 1, ROW.width, 1, 0, topS * DPR, cvs.width, (botS - topS) * DPR);
      ctx.restore();
      ctx.save();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const shade = smooth(0.15, 0.6, pz);
      if (shade > 0) {
        ctx.globalAlpha = shade;
        const vg = ctx.createLinearGradient(0, 0, 0, H);
        vg.addColorStop(0, "rgba(0,0,0,0.92)");
        vg.addColorStop(0.28, "rgba(0,0,0,0.15)");
        vg.addColorStop(0.5, "rgba(0,0,0,0)");
        vg.addColorStop(0.72, "rgba(0,0,0,0.15)");
        vg.addColorStop(1, "rgba(0,0,0,0.92)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    function render(t) {
      const g = G;
      if (!g) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      const pz   = prog(t, T.z0, T.z1);
      const cam  = zoomCamera(pz);
      const s    = cam.s;
      const pan  = cam.pan;
      const ox   = lerp(g.O.x, g.C.x, pan);
      const oy   = lerp(g.O.y, g.C.y, pan);
      ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * (ox - s * g.O.x), DPR * (oy - s * g.O.y));

      const fade = 1 - smooth(T.o0, T.end, t);
      if (fade <= 0) return;
      ctx.globalAlpha = fade;

      const eA  = ease.stroke(prog(t, T.a0, T.a1));
      const eD  = ease.stroke(prog(t, T.d0, T.d1));
      const eB  = ease.stroke(prog(t, T.b0, T.b1));
      const rB  = ease.inOutCubic(prog(t, T.e0, T.e1));
      const rD  = ease.inOutCubic(prog(t, T.f0, T.f1));

      const { x0, y0, NH, NW, lw, xr } = g;

      if (eA > 0) {
        if (pz <= 0) {
          drawStemCached(eA);
          const h = NH * eA;
          if (eA < 1) { ctx.save(); ctx.clip(g.L); leadingEdge(x0, y0 + NH - h, lw, 1 - eA, 1); ctx.restore(); }
        } else {
          const mixK = smooth(0.17, 0.24, pz);
          if (mixK < 1) drawStemCached(1);
          if (mixK > 0) {
            const ga = ctx.globalAlpha;
            ctx.globalAlpha = ga * mixK;
            drawZoomStem(pz, t, s, ox, oy);
            ctx.globalAlpha = ga;
          }
        }
      }

      const rTop = Math.max(1 - eB, rB);
      if (eB > 0 && rTop < 1) {
        const yTopStem = y0 + NH * rTop;
        blitLayer(LAYER_R, yTopStem, y0 + NH + 2);
        if (eB < 1 || (rB > 0 && rB < 1)) {
          ctx.save(); ctx.clip(g.R);
          leadingEdge(xr, yTopStem, lw, 0.5, 1);
          ctx.restore();
        }
      }

      const dVis = Math.min(eD, 1 - rD);
      if (dVis > 0) {
        ctx.save();
        blitLayer(LAYER_D, -1e5, y0 + NH * dVis);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0 - NW, y0 - 2, NW * 3, NH * dVis + 2);
        ctx.clip();

        if (dVis < 1) {
          const yy = y0 + NH * dVis;
          const xx = lerp(x0, x0 + NW - lw, dVis);
          ctx.clip(g.D);
          leadingEdge(xx - lw * 0.2, yy, lw * 1.4, 0.6, -1);
        }
        ctx.restore();
        ctx.restore();
      }

      drawFloorReflection(g, t, fade, s, eA, eB, dVis, rTop, pz);

      const ps = prog(t, T.s0, T.s1);
      if (ps > 0 && ps < 1) {
        ctx.save();
        ctx.clip(g.ALL);
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(x0 + NW / 2, y0 + NH / 2);
        ctx.rotate(0.38);
        const k  = ease.inOutSine(ps);
        const cx = lerp(-NW * 1.6, NW * 1.6, k);
        const bw = NW * 0.55;
        const gr = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
        gr.addColorStop(0, "rgba(168,85,247,0)");
        gr.addColorStop(0.35, `rgba(192,132,252,${0.28 * Math.sin(Math.PI * ps)})`);
        gr.addColorStop(0.50, `rgba(255,255,255,${0.42 * Math.sin(Math.PI * ps)})`);
        gr.addColorStop(0.65, `rgba(56,189,248,${0.32 * Math.sin(Math.PI * ps)})`);
        gr.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(-NW * 3, -NH * 2, NW * 6, NH * 4);
        ctx.restore();
      }

      drawBrandTypography(g, t, fade, pz);

      if (pz > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = smooth(0.3, 0.8, pz) * 0.55;
        const vg = ctx.createRadialGradient(cvs.width / 2, cvs.height / 2, Math.min(cvs.width, cvs.height) * 0.25,
                                            cvs.width / 2, cvs.height / 2, Math.max(cvs.width, cvs.height) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, cvs.width, cvs.height);
      }
    }

    function ensureAudio() {
      if (!AC) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        AC = new Ctx();
      }
      if (AC.state === "suspended") AC.resume();
      return AC;
    }

    function playSound(t0, playbackRate) {
      const ac = AC;
      if (!ac) return;
      const sp = 1 / playbackRate;
      if (master) { try { master.disconnect(); } catch (e) {} }
      master = ac.createGain();
      master.gain.value = 0.95;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);

      // ─── 1. FIRST IMPACT ("Ta" when N creation starts: t0 + T.a0 * sp) ───────
      const taTime = t0 + T.a0 * sp;
      const kickOsc = ac.createOscillator();
      const kickGain = ac.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(125, taTime);
      kickOsc.frequency.exponentialRampToValueAtTime(32, taTime + 0.38 * sp);
      kickGain.gain.setValueAtTime(0.001, taTime);
      kickGain.gain.setValueAtTime(0.85, taTime + 0.005);
      kickGain.gain.exponentialRampToValueAtTime(0.001, taTime + 0.40 * sp);
      kickOsc.connect(kickGain);
      kickGain.connect(master);
      kickOsc.start(taTime);
      kickOsc.stop(taTime + 0.45 * sp);

      const clickOsc = ac.createOscillator();
      const clickGain = ac.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(340, taTime);
      clickOsc.frequency.exponentialRampToValueAtTime(60, taTime + 0.18 * sp);
      clickGain.gain.setValueAtTime(0.35, taTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, taTime + 0.20 * sp);
      clickOsc.connect(clickGain);
      clickGain.connect(master);
      clickOsc.start(taTime);
      clickOsc.stop(taTime + 0.22 * sp);

      // ─── 2. SECOND IMPACT ("-DUM" at diagonal stick creation: t0 + T.d0 * sp) ─
      const dumTime = t0 + T.d0 * sp;
      const subOsc = ac.createOscillator();
      const subGain = ac.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(85, dumTime);
      subOsc.frequency.exponentialRampToValueAtTime(26, dumTime + 1.4 * sp);
      subGain.gain.setValueAtTime(0.95, dumTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, dumTime + 1.6 * sp);
      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start(dumTime);
      subOsc.stop(dumTime + 1.7 * sp);

      const chordFreqs = [73.42, 110.0, 146.83, 174.61, 220.0];
      chordFreqs.forEach((freq, idx) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const filter = ac.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq + (idx % 2 === 0 ? 0.35 : -0.35), dumTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, dumTime);
        filter.frequency.exponentialRampToValueAtTime(90, dumTime + 2.0 * sp);

        gain.gain.setValueAtTime(0.24 / chordFreqs.length, dumTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, dumTime + 2.2 * sp);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(dumTime);
        osc.stop(dumTime + 2.3 * sp);
      });

      const shimmerFreqs = [587.33, 880.0, 1174.66, 1760.0, 2349.32];
      shimmerFreqs.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, dumTime + 0.05);

        gain.gain.setValueAtTime(0.045 / (i + 1), dumTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.00001, dumTime + 2.8 * sp);

        osc.connect(gain);
        gain.connect(master);

        osc.start(dumTime + 0.05);
        osc.stop(dumTime + 2.9 * sp);
      });

      const sweepTime = t0 + (T.z0 - 0.15) * sp;
      const bufferSize = Math.max(256, Math.floor(ac.sampleRate * 0.9 * sp));
      const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ac.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const bandFilter = ac.createBiquadFilter();
      bandFilter.type = 'bandpass';
      bandFilter.Q.value = 2.5;
      bandFilter.frequency.setValueAtTime(320, sweepTime);
      bandFilter.frequency.exponentialRampToValueAtTime(2600, sweepTime + 0.8 * sp);

      const noiseGain = ac.createGain();
      noiseGain.gain.setValueAtTime(0.005, sweepTime);
      noiseGain.gain.linearRampToValueAtTime(0.16, sweepTime + 0.35 * sp);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, sweepTime + 0.9 * sp);

      whiteNoise.connect(bandFilter);
      bandFilter.connect(noiseGain);
      noiseGain.connect(master);

      whiteNoise.start(sweepTime);
      whiteNoise.stop(sweepTime + 0.95 * sp);
    }

    let soundStarted = false;

    function startAudioSync() {
      if (soundStarted) return;
      const ac = ensureAudio();
      if (!ac) return;
      if (ac.state === 'running') {
        soundStarted = true;
        const animElapsed = running ? currentTime() : 0;
        const t0 = ac.currentTime + 0.08 - (animElapsed / rate);
        playSound(t0, rate);
        useAudioClock = true;
      }
    }

    function stopSound() {
      soundStarted = false;
      if (master && AC) {
        try {
          master.gain.cancelScheduledValues(AC.currentTime);
          master.gain.setTargetAtTime(0, AC.currentTime, 0.03);
        } catch (e) {}
      }
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 3);
      W = window.innerWidth; H = window.innerHeight;
      cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
      buildGeometry();
      buildStemCache();
      if (!running) render(0);
    }

    function currentTime(now) {
      return ((now !== undefined ? now : performance.now()) - perfStart) / 1000 * rate;
    }

    function tick(now) {
      if (!running) return;
      const t = currentTime(now);
      render(Math.max(0, t));
      if (t < T.end) {
        raf = requestAnimationFrame(tick);
      } else {
        safeFinish();
      }
    }

    function play() {
      cancelAnimationFrame(raf);
      stopSound();
      rate = 1;
      useAudioClock = false;
      const ac = ensureAudio();
      if (ac) {
        if (ac.state === 'running') {
          audioStart = ac.currentTime + 0.08;
          soundStarted = true;
          playSound(audioStart, rate);
          useAudioClock = true;
        } else {
          // If suspended by browser autoplay policy, resume on first gesture/opportunity
          ac.resume().then(() => {
            startAudioSync();
          }).catch(() => {});
        }
      }
      const latency = (useAudioClock && AC) ? ((AC.outputLatency || AC.baseLatency || 0) * 1000) : 0;
      perfStart = performance.now() + 80 + latency;
      running = true;
      render(0);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize);
    resize();
    play();

    // Support user interaction (click/tap or key) to resume audio if browser policy suspended it, or to skip
    const onUserInteraction = () => {
      if (AC) {
        if (AC.state === 'suspended') {
          AC.resume().then(() => {
            startAudioSync();
          }).catch(() => {});
        } else {
          startAudioSync();
        }
      } else {
        startAudioSync();
      }
    };
    window.addEventListener("pointerdown", onUserInteraction);
    window.addEventListener("touchstart", onUserInteraction);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      stopSound();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#000000] overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full block bg-[#000000]"
        style={{ width: '100vw', height: '100vh' }}
      />
    </div>
  );
};

export { NexusPortalSplash };
export default NexusPortalSplash;
