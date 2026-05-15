"use client";

import { useEffect, useRef } from "react";

interface FallingToken {
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  xDrift: number;
  xDriftSpeed: number;
  xDriftPhase: number;
  opacity: number;
  blur: number; // 0 = sharp, 1 = blurred (for depth)
}

// ₴ hryvnia glyph
const HRYVNIA = "\u20b4";

function createToken(width: number, spawnAbove = false): FallingToken {
  const size = 24 + Math.random() * 28; // 24–52px
  const depthFactor = size / 52; // 1 = closest, 0.46 = farthest

  return {
    x: Math.random() * (width + size * 2) - size,
    y: spawnAbove
      ? -(size + Math.random() * 600)
      : Math.random() * 1200, // initial scatter on load
    size,
    speed: (28 + Math.random() * 48) * depthFactor, // px/s
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.6, // rad/s
    xDrift: (Math.random() - 0.5) * 28,
    xDriftSpeed: 0.3 + Math.random() * 0.5,
    xDriftPhase: Math.random() * Math.PI * 2,
    opacity: 0.18 + Math.random() * 0.42 * depthFactor,
    blur: depthFactor < 0.6 ? 2.5 : 0, // distant tokens get blur
  };
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rotation: number,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Outer dark ring
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const outerGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r);
  outerGrad.addColorStop(0, "rgba(127,166,255,1)");
  outerGrad.addColorStop(0.45, "rgba(49,93,255,1)");
  outerGrad.addColorStop(1, "rgba(17,26,115,1)");
  ctx.fillStyle = outerGrad;
  ctx.fill();

  // Inner gradient circle (slightly smaller)
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  const innerGrad = ctx.createRadialGradient(-r * 0.15, -r * 0.25, 0, 0, 0, r * 0.82);
  innerGrad.addColorStop(0, "rgba(95,143,255,1)");
  innerGrad.addColorStop(0.5, "rgba(47,84,232,1)");
  innerGrad.addColorStop(1, "rgba(23,32,130,1)");
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // Rim highlight
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // Specular highlight top-left
  const specGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, -r * 0.3, -r * 0.35, r * 0.55);
  specGrad.addColorStop(0, "rgba(255,255,255,0.22)");
  specGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();

  // ₴ symbol
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `800 ${r * 1.05}px 'Arial', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(HRYVNIA, 0, r * 0.04);

  ctx.restore();
}

const TOKEN_COUNT = 18;

export function FallingTokensCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tokensRef = useRef<FallingToken[]>([]);
  const lastTimeRef = useRef<number>(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion preference
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      dimensionsRef.current = { width: w, height: h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initTokens() {
      const { width, height } = dimensionsRef.current;
      tokensRef.current = Array.from({ length: TOKEN_COUNT }, () =>
        createToken(width, false),
      );
      // Spread vertically on init so they don't all appear at top
      tokensRef.current.forEach((t) => {
        t.y = -t.size + Math.random() * (height + t.size * 4);
      });
    }

    function tick(timestamp: number) {
      if (!ctx) return;
      const dt = Math.min((timestamp - (lastTimeRef.current || timestamp)) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      const { width, height } = dimensionsRef.current;

      ctx.clearRect(0, 0, width, height);

      for (const token of tokensRef.current) {
        // Update position
        token.y += token.speed * dt;
        token.rotation += token.rotationSpeed * dt;
        token.x +=
          Math.sin(timestamp * 0.001 * token.xDriftSpeed + token.xDriftPhase) *
          token.xDrift *
          dt;

        // Recycle when off-screen bottom
        if (token.y - token.size > height) {
          Object.assign(token, createToken(width, true));
        }

        // Draw with optional blur
        if (token.blur > 0) {
          ctx.save();
          ctx.filter = `blur(${token.blur}px)`;
          drawCoin(ctx, token.x, token.y, token.size / 2, token.rotation, token.opacity);
          ctx.restore();
        } else {
          drawCoin(ctx, token.x, token.y, token.size / 2, token.rotation, token.opacity);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    resize();
    initTokens();
    rafRef.current = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      ref={canvasRef}
    />
  );
}
