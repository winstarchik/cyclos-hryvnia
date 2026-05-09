export interface AuthUser {
  id: string;
  email: string;
}

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidAuthEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAuthEmail(email));
}

export function isValidAuthPassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
