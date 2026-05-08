import type { MotionProps, Variants } from "framer-motion";

type MotionPreset = Pick<
  MotionProps,
  "initial" | "animate" | "exit" | "transition" | "whileHover" | "whileTap"
>;

/**
 * Parent list animation that fades in and staggers child items.
 *
 * @example
 * ```tsx
 * <motion.ul
 *   variants={containerVariants}
 *   initial="hidden"
 *   animate="visible"
 * />
 * ```
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Child list item animation for smooth vertical entrance.
 *
 * @example
 * ```tsx
 * <motion.li variants={itemVariants} />
 * ```
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

/**
 * Page or modal transition that enters from the right and exits left.
 *
 * @example
 * ```tsx
 * <motion.aside {...slideInFromRight} />
 * ```
 */
export const slideInFromRight = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 },
  transition: { duration: 0.3 },
} satisfies MotionPreset;

/**
 * Panel transition that enters from the left and exits right.
 *
 * @example
 * ```tsx
 * <motion.section {...slideInFromLeft} />
 * ```
 */
export const slideInFromLeft = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
  transition: { duration: 0.3 },
} satisfies MotionPreset;

/**
 * Simple fade-in preset for lightweight page and section reveals.
 *
 * @example
 * ```tsx
 * <motion.div {...fadeIn} />
 * ```
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4 },
} satisfies MotionPreset;

/**
 * Fade-out preset for dismissing overlays or temporary UI.
 *
 * @example
 * ```tsx
 * <motion.div {...fadeOut} />
 * ```
 */
export const fadeOut = {
  animate: { opacity: 0 },
  transition: { duration: 0.3 },
} satisfies MotionPreset;

/**
 * Card entrance animation that scales up while fading in.
 *
 * @example
 * ```tsx
 * <motion.div {...scaleIn} />
 * ```
 */
export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.3 },
} satisfies MotionPreset;

/**
 * Repeating opacity pulse for loading placeholders.
 *
 * @example
 * ```tsx
 * <motion.div {...pulse} />
 * ```
 */
export const pulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
  },
} satisfies MotionPreset;

/**
 * Button interaction preset with hover lift and tap compression.
 *
 * @example
 * ```tsx
 * <motion.button {...buttonBounce} />
 * ```
 */
export const buttonBounce = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
} satisfies MotionPreset;
