"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}

/**
 * Smoothly animates numeric text whenever `value` changes.
 *
 * @example
 * ```tsx
 * <AnimatedNumber value={1234.56} />
 * <AnimatedNumber value={balance} format={(v) => v.toFixed(4)} />
 * <AnimatedNumber value={usdPrice} format={(v) => `$${v.toLocaleString()}`} />
 * ```
 */
export function AnimatedNumber({
  value,
  format = (v) => v.toFixed(2),
  duration = 0.5,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (!ref.current) return;

    const currentValue = previousValueRef.current;

    const controls = animate(currentValue, value, {
      duration,
      onUpdate(v) {
        if (ref.current) {
          ref.current.textContent = format(v);
        }
      },
    });

    previousValueRef.current = value;

    return () => controls.stop();
  }, [value, format, duration]);

  return <span ref={ref}>{format(value)}</span>;
}
