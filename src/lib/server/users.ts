import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { query } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";

export interface AuthUser {
  id: string;
  email: string;
}

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string;
}

let usersTableReady: Promise<void> | null = null;

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidAuthEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidAuthPassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}

async function ensureUsersTable() {
  if (!usersTableReady) {
    usersTableReady = query(`
      CREATE TABLE IF NOT EXISTS cyclos_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }

  await usersTableReady;
}

export async function findUserByEmail(email: string) {
  await ensureUsersTable();

  const result = await query<UserRow>(
    "SELECT id, email, password_hash FROM cyclos_users WHERE email = $1 LIMIT 1",
    [normalizeAuthEmail(email)],
  );

  return result.rows[0] ?? null;
}

export async function createUser(email: string, password: string): Promise<AuthUser> {
  await ensureUsersTable();

  const normalizedEmail = normalizeAuthEmail(email);
  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  const result = await query<UserRow>(
    `INSERT INTO cyclos_users (id, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, password_hash`,
    [id, normalizedEmail, passwordHash],
  );

  return {
    id: result.rows[0].id,
    email: result.rows[0].email,
  };
}

export async function verifyUserLogin(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}
