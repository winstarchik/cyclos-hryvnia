import { create } from "zustand";

/**
 * UI store state (global loading + flash messages).
 */
export interface UIStoreState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

/**
 * UI store actions.
 */
export interface UIStoreActions {
  /**
   * Set global loading state.
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Set error message (auto-clears after 5 seconds).
   */
  setError: (message: string | null) => void;

  /**
   * Set success message (auto-clears after 5 seconds).
   */
  setSuccess: (message: string | null) => void;

  /**
   * Clear error and success messages immediately.
   */
  clearMessages: () => void;
}

export type UIStore = UIStoreState & UIStoreActions;

const AUTO_CLEAR_MS = 5_000;

let errorTimer: ReturnType<typeof setTimeout> | null = null;
let successTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer) {
    clearTimeout(timer);
  }
}

export const useUIStore = create<UIStore>()((set) => ({
  isLoading: false,
  error: null,
  successMessage: null,

  setLoading: (isLoading) => set({ isLoading }),

  setError: (message) => {
    clearTimer(errorTimer);
    set({ error: message });
    if (message) {
      errorTimer = setTimeout(() => {
        set({ error: null });
        errorTimer = null;
      }, AUTO_CLEAR_MS);
    } else {
      errorTimer = null;
    }
  },

  setSuccess: (message) => {
    clearTimer(successTimer);
    set({ successMessage: message });
    if (message) {
      successTimer = setTimeout(() => {
        set({ successMessage: null });
        successTimer = null;
      }, AUTO_CLEAR_MS);
    } else {
      successTimer = null;
    }
  },

  clearMessages: () => {
    clearTimer(errorTimer);
    clearTimer(successTimer);
    errorTimer = null;
    successTimer = null;
    set({ error: null, successMessage: null });
  },
}));

