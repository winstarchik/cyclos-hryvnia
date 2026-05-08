import type { ButtonHTMLAttributes, ReactNode } from "react";
import { tv } from "tailwind-variants";

const buttonVariants = tv({
  base: "font-semibold rounded-xl transition focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  variants: {
    variant: {
      primary:
        "bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white",
      secondary:
        "bg-dark-800 hover:bg-dark-700 text-white border border-dark-700",
      ghost: "text-accent-400 hover:bg-dark-900 border border-dark-700",
      danger: "bg-red-600 hover:bg-red-700 text-white",
      success: "bg-green-600 hover:bg-green-700 text-white",
    },
    size: {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
      xl: "px-10 py-5 text-xl",
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
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  isLoading?: boolean;
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
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, size, fullWidth, className })}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "..." : children}
    </button>
  );
}
