"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * A restrained animated background inspired by Aceternity backgrounds and
 * Style-Forge patterns. It stays pointer-transparent so wallet controls remain
 * fully interactive.
 */
export function ForgeBackdrop({ dense = false }: { dense?: boolean }) {
  return (
    <div aria-hidden="true" className="forge-backdrop">
      <div className="forge-grid" />
      <motion.div
        animate={{ opacity: [0.32, 0.58, 0.32], x: ["-8%", "5%", "-8%"] }}
        className="forge-beam forge-beam-primary"
        transition={{ duration: dense ? 9 : 15, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={{ opacity: [0.12, 0.28, 0.12], x: ["5%", "-5%", "5%"] }}
        className="forge-beam forge-beam-secondary"
        transition={{ duration: dense ? 11 : 18, ease: "easeInOut", repeat: Infinity }}
      />
      <div className="forge-noise" />
    </div>
  );
}

/**
 * Magic UI-style animated border shell for high-priority fintech surfaces.
 */
export function ForgeBorder({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`forge-border ${className}`}>
      <div className="forge-border-glow" />
      <div className="forge-border-inner">{children}</div>
    </div>
  );
}

/**
 * Aceternity-style spotlight panel with pointer-driven highlight.
 */
export function ForgeSpotlight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`forge-spotlight ${className}`}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Uiverse-inspired status marker: compact, animated, and readable.
 */
export function ForgePulse({ children }: { children: ReactNode }) {
  return (
    <span className="forge-pulse">
      <span aria-hidden="true" className="forge-pulse-dot" />
      {children}
    </span>
  );
}
