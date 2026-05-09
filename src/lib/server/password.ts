import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return {
    passwordHash: derivedKey.toString("hex"),
    passwordSalt: salt,
  };
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string,
) {
  const derivedKey = (await scrypt(password, passwordSalt, KEY_LENGTH)) as Buffer;
  const stored = Buffer.from(passwordHash, "hex");

  return (
    derivedKey.length === stored.length &&
    timingSafeEqual(derivedKey, stored)
  );
}
