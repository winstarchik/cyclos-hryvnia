"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BigTokenLayer } from "@/components/visual/BigTokenLayer";
import { FallingTokensCanvas } from "@/components/visual/FallingTokensCanvas";
import { ParticleCanvas } from "@/components/visual/ParticleCanvas";

function useDesktopVisuals() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (prefers-reduced-motion: no-preference)",
    );

    const updateEnabled = () => setEnabled(mediaQuery.matches);
    updateEnabled();

    mediaQuery.addEventListener("change", updateEnabled);
    return () => mediaQuery.removeEventListener("change", updateEnabled);
  }, []);

  return enabled;
}

function MiniCoin({ className, delay = 0 }: { className: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      animate={
        reduceMotion
          ? undefined
          : {
              rotate: [-8, 7, -8],
              y: [0, -10, 0],
            }
      }
      className={`pointer-events-none absolute flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#80a4ff,#3155f6_52%,#101a73)] text-white ring-1 ring-white/15 ${className}`}
      style={{
        filter: "drop-shadow(0 12px 30px rgba(49, 85, 246, 0.24))",
        willChange: reduceMotion ? undefined : "transform",
      }}
      transition={{
        delay,
        duration: 6.5,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    >
      <span className="translate-y-[1px] font-black">₴</span>
    </motion.div>
  );
}

function MobileVisuals() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(65,105,225,0.26),transparent_34%),radial-gradient(circle_at_12%_72%,rgba(0,212,255,0.08),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(107,143,255,0.10),transparent_36%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(220,230,255,0.55)_0_1px,transparent_1.5px),radial-gradient(circle_at_80%_35%,rgba(120,160,255,0.45)_0_1px,transparent_1.5px)] [background-size:84px_84px,118px_118px]"
      />
      <MiniCoin className="-left-8 top-[9%] h-20 w-20 text-4xl opacity-65" delay={0.2} />
      <MiniCoin className="-right-7 top-[21%] h-16 w-16 text-3xl opacity-55" delay={1.1} />
      <MiniCoin className="bottom-[8%] left-7 h-14 w-14 text-2xl opacity-45" delay={2.2} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,7,18,0.10),rgba(5,7,18,0.72)_76%)]"
      />
    </>
  );
}

export function OptimizedLoginBackground({ disabled = false }: { disabled?: boolean }) {
  const desktopVisuals = useDesktopVisuals();

  if (disabled) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(65,105,225,0.18),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(107,143,255,0.10),transparent_36%)]"
      />
    );
  }

  if (desktopVisuals) {
    return (
      <>
        <ParticleCanvas />
        <BigTokenLayer />
        <FallingTokensCanvas />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,7,18,0.15),rgba(5,7,18,0.72)_72%)]"
        />
      </>
    );
  }

  return <MobileVisuals />;
}
