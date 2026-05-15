"use client";

import type { CSSProperties } from "react";
import { motion, type TargetAndTransition, useReducedMotion } from "framer-motion";

interface BigTokenConfig {
  id: string;
  // Position anchors – use % so it scales across breakpoints
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number; // px
  // Animation offsets (so each coin moves differently)
  floatDuration: number;
  floatY: number; // max px drift
  rotateDuration: number;
  rotateMax: number; // degrees
  glowDuration: number;
  delay: number;
  initialRotate: number;
  // Glow color stops
  glowColor: string;
  glowColorFar: string;
}

// Positions match the design screenshots (mobile ~390px viewport)
const BIG_TOKENS: BigTokenConfig[] = [
  {
    id: "tl1",
    top: "8%",
    left: "-8%",
    size: 110,
    floatDuration: 9,
    floatY: 18,
    rotateDuration: 14,
    rotateMax: 8,
    glowDuration: 5,
    delay: 0,
    initialRotate: -12,
    glowColor: "rgba(107,143,255,0.60)",
    glowColorFar: "rgba(65,105,225,0.15)",
  },
  {
    id: "tl2",
    top: "18%",
    left: "12%",
    size: 90,
    floatDuration: 11,
    floatY: 14,
    rotateDuration: 16,
    rotateMax: 6,
    glowDuration: 6,
    delay: 1.2,
    initialRotate: 15,
    glowColor: "rgba(107,143,255,0.55)",
    glowColorFar: "rgba(65,105,225,0.12)",
  },
  {
    id: "tr1",
    top: "5%",
    right: "-6%",
    size: 100,
    floatDuration: 10,
    floatY: 16,
    rotateDuration: 12,
    rotateMax: 10,
    glowDuration: 7,
    delay: 0.6,
    initialRotate: 20,
    glowColor: "rgba(107,143,255,0.50)",
    glowColorFar: "rgba(65,105,225,0.12)",
  },
  {
    id: "rm1",
    top: "42%",
    right: "-4%",
    size: 80,
    floatDuration: 13,
    floatY: 20,
    rotateDuration: 18,
    rotateMax: 7,
    glowDuration: 8,
    delay: 2,
    initialRotate: -8,
    glowColor: "rgba(107,143,255,0.45)",
    glowColorFar: "rgba(65,105,225,0.10)",
  },
  {
    id: "bl1",
    bottom: "8%",
    left: "-5%",
    size: 105,
    floatDuration: 12,
    floatY: 15,
    rotateDuration: 15,
    rotateMax: 9,
    glowDuration: 6,
    delay: 1.8,
    initialRotate: -20,
    glowColor: "rgba(107,143,255,0.55)",
    glowColorFar: "rgba(65,105,225,0.12)",
  },
  {
    id: "br1",
    bottom: "12%",
    right: "4%",
    size: 95,
    floatDuration: 8,
    floatY: 22,
    rotateDuration: 11,
    rotateMax: 11,
    glowDuration: 5,
    delay: 0.9,
    initialRotate: 25,
    glowColor: "rgba(107,143,255,0.50)",
    glowColorFar: "rgba(65,105,225,0.10)",
  },
];

function BigToken({
  config,
  reduced,
}: {
  config: BigTokenConfig;
  reduced: boolean;
}) {
  const { size, glowColor, glowColorFar } = config;

  const positionStyle: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    top: config.top,
    bottom: config.bottom,
    left: config.left,
    right: config.right,
  };

  const floatAnimate: TargetAndTransition = {
    y: [0, -config.floatY, 0, config.floatY * 0.5, 0],
    rotate: [
      config.initialRotate,
      config.initialRotate + config.rotateMax,
      config.initialRotate - config.rotateMax * 0.6,
      config.initialRotate + config.rotateMax * 0.3,
      config.initialRotate,
    ],
    transition: {
      duration: config.floatDuration,
      ease: "easeInOut",
      repeat: Infinity,
      delay: config.delay,
    },
  };

  const glowAnimate: TargetAndTransition = {
    boxShadow: [
      `0 0 30px 8px ${glowColor}, 0 0 80px 20px ${glowColorFar}`,
      `0 0 50px 16px ${glowColor}, 0 0 120px 40px ${glowColorFar}`,
      `0 0 30px 8px ${glowColor}, 0 0 80px 20px ${glowColorFar}`,
    ],
    transition: {
      duration: config.glowDuration,
      ease: "easeInOut",
      repeat: Infinity,
      delay: config.delay + 0.4,
    },
  };

  return (
    <motion.div
      aria-hidden="true"
      initial={{ rotate: config.initialRotate, opacity: 0 }}
      animate={
        reduced
          ? { opacity: 1 }
          : { opacity: 1, y: 0 }
      }
      transition={{ duration: 1.2, delay: config.delay * 0.5, ease: "easeOut" }}
      style={positionStyle}
    >
      {/* Float + rotate wrapper */}
      <motion.div
        animate={reduced ? undefined : floatAnimate}
        style={{ width: "100%", height: "100%", willChange: "transform" }}
      >
        {/* Glow ring wrapper */}
        <motion.div
          animate={reduced ? undefined : glowAnimate}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            willChange: "box-shadow",
          }}
        >
          {/* The coin itself */}
          <CoinSVG size={size} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function CoinSVG({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", borderRadius: "50%" }}
    >
      {/* Dark outer edge for 3D depth */}
      <circle cx="40" cy="40" r="40" fill="#050810" />

      {/* Main gradient body */}
      <circle cx="40" cy="40" r="34" fill="url(#bigOuter)" />
      <circle cx="40" cy="40" r="28" fill="url(#bigInner)" />

      {/* Rim highlight */}
      <circle
        cx="40"
        cy="40"
        r="27"
        stroke="white"
        strokeOpacity="0.20"
        strokeWidth="1.5"
      />

      {/* Specular highlight */}
      <ellipse
        cx="30"
        cy="26"
        rx="10"
        ry="6"
        fill="url(#specular)"
        opacity="0.5"
      />

      {/* ₴ symbol */}
      <text
        x="40"
        y="41"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="42"
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="central"
      >
        &#8372;
      </text>

      <defs>
        <linearGradient
          id="bigOuter"
          x1="16"
          x2="64"
          y1="14"
          y2="66"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8ab0ff" />
          <stop offset="0.45" stopColor="#3361ff" />
          <stop offset="1" stopColor="#0e1466" />
        </linearGradient>
        <linearGradient
          id="bigInner"
          x1="24"
          x2="56"
          y1="18"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6898ff" />
          <stop offset="0.5" stopColor="#2f54e8" />
          <stop offset="1" stopColor="#152075" />
        </linearGradient>
        <radialGradient
          id="specular"
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function BigTokenLayer() {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {BIG_TOKENS.map((config) => (
        <BigToken config={config} key={config.id} reduced={prefersReduced} />
      ))}
    </div>
  );
}
