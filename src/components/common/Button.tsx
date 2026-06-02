"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { tv } from "tailwind-variants";
import { LoadingSpinner } from "./LoadingSpinner";

const buttonVariants = tv({
  base: "forge-button inline-flex items-center justify-center gap-2 overflow-hidden font-semibold transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
  variants: {
    variant: {
      primary:
        "bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white",
      secondary:
        "bg-dark-800 hover:bg-dark-700 text-white border border-dark-700",
      ghost: "text-accent-400 hover:bg-dark-900 border border-dark-700",
      phantom: "bg-purple-600 text-white hover:bg-purple-500",
      danger: "bg-red-600 hover:bg-red-700 text-white",
      success: "bg-green-600 hover:bg-green-700 text-white",
    },
    size: {
      sm: "min-h-11 px-4 py-2 text-sm",
      md: "min-h-12 px-6 py-3 text-base",
      lg: "min-h-14 px-8 py-4 text-lg",
      xl: "min-h-16 px-10 py-5 text-xl",
    },
    fullWidth: {
      true: "w-full",
      false: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
    fullWidth: false,
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "phantom" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * Reusable app button with visual variants, sizes, disabled, and loading state.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" fullWidth>Click me</Button>
 * <Button variant="ghost" size="sm">Cancel</Button>
 * <Button variant="danger">Delete</Button>
 * ```
 */
export function Button({
  children,
  variant,
  size,
  fullWidth,
  isLoading,
  loadingText = "Loading...",
  disabled,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, size, fullWidth, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      type={type}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
