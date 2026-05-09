export interface AuthUser {
  id: string;
  email: string;
}

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidAuthEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAuthEmail(email));
}
