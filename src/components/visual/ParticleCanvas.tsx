"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface LightStreak {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  width: number;
  color: string;
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let streaks: LightStreak[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      // Use devicePixelRatio capped at 2 for performance
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initScene();
    }

    function initScene() {
      // Stars: denser on mobile, sparse on desktop
      const starCount = Math.floor((width * height) / 4000);
      stars = Array.from({ length: Math.min(starCount, 100) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.6 + 0.1,
        twinkleSpeed: Math.random() * 0.008 + 0.003,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));

      // Volumetric light streaks
      streaks = [
        {
          x1: width * 0.0,  y1: height * 0.15,
          x2: width * 0.35, y2: height * 0.45,
          opacity: 0.07, width: 60,
          color: "65,105,225",
        },
        {
          x1: width * 0.6, y1: height * 0.0,
          x2: width * 1.0, y2: height * 0.4,
          opacity: 0.05, width: 80,
          color: "107,143,255",
        },
        {
          x1: width * 0.1, y1: height * 0.7,
          x2: width * 0.5, y2: height * 1.0,
          opacity: 0.06, width: 50,
          color: "65,105,225",
        },
      ];
    }

    function drawStars(t: number) {
      if (!ctx) return;
      for (const star of stars) {
        const twinkle = Math.sin(t * star.twinkleSpeed + star.twinkleOffset);
        const opacity = star.opacity * (0.7 + 0.3 * twinkle);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 215, 255, ${opacity})`;
        ctx.fill();
      }
    }

    function drawStreaks() {
      if (!ctx) return;
      for (const streak of streaks) {
        const dx = streak.x2 - streak.x1;
        const dy = streak.y2 - streak.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        const grad = ctx.createLinearGradient(
          streak.x1 + nx * streak.width,
          streak.y1 + ny * streak.width,
          streak.x1 - nx * streak.width,
          streak.y1 - ny * streak.width,
        );
        grad.addColorStop(0, `rgba(${streak.color},0)`);
        grad.addColorStop(0.5, `rgba(${streak.color},${streak.opacity})`);
        grad.addColorStop(1, `rgba(${streak.color},0)`);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(streak.x1 + nx * streak.width, streak.y1 + ny * streak.width);
        ctx.lineTo(streak.x2 + nx * streak.width, streak.y2 + ny * streak.width);
        ctx.lineTo(streak.x2 - nx * streak.width, streak.y2 - ny * streak.width);
        ctx.lineTo(streak.x1 - nx * streak.width, streak.y1 - ny * streak.width);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
    }

    // Subtle ambient radial glows
    function drawAmbientGlows() {
      if (!ctx) return;
      const glow1 = ctx.createRadialGradient(
        width * 0.5, height * 0.08, 0,
        width * 0.5, height * 0.08, width * 0.7,
      );
      glow1.addColorStop(0, "rgba(65,105,225,0.10)");
      glow1.addColorStop(1, "rgba(65,105,225,0)");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      const glow2 = ctx.createRadialGradient(
        width * 0.15, height * 0.65, 0,
        width * 0.15, height * 0.65, width * 0.4,
      );
      glow2.addColorStop(0, "rgba(107,143,255,0.07)");
      glow2.addColorStop(1, "rgba(107,143,255,0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);
    }

    function draw(timestamp: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      drawAmbientGlows();
      drawStreaks();
      drawStars(timestamp);
      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
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
      style={{ mixBlendMode: "screen" }}
    />
  );
}
