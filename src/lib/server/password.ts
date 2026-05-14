import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const CURRENT_SCRYPT_PARAMS = {
  N: 32768,
  p: 1,
  r: 8,
} as const;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function encodePasswordHash(hash: Buffer) {
  const { N, r, p } = CURRENT_SCRYPT_PARAMS;
  return `scrypt$v=1$n=${N}$r=${r}$p=${p}$${hash.toString("hex")}`;
}

function runScrypt(
  password: string,
  salt: string,
  keyLength: number,
  options?: ScryptOptions,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const callback = (error: Error | null, derivedKey: Buffer) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    };

    if (options) {
      scryptCallback(password, salt, keyLength, options, callback);
      return;
    }

    scryptCallback(password, salt, keyLength, callback);
  });
}

function parsePasswordHash(passwordHash: string) {
  if (!passwordHash.startsWith("scrypt$")) {
    return {
      hashHex: passwordHash,
      params: null,
    };
  }

  const [, version, nPart, rPart, pPart, hashHex] = passwordHash.split("$");
  const N = Number(nPart?.replace("n=", ""));
  const r = Number(rPart?.replace("r=", ""));
  const p = Number(pPart?.replace("p=", ""));

  if (
    version !== "v=1" ||
    !Number.isSafeInteger(N) ||
    !Number.isSafeInteger(r) ||
    !Number.isSafeInteger(p) ||
    !hashHex
  ) {
    throw new Error("Invalid stored password hash.");
  }

  return {
    hashHex,
    params: { N, r, p },
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await runScrypt(password, salt, KEY_LENGTH, {
    ...CURRENT_SCRYPT_PARAMS,
    maxmem: SCRYPT_MAXMEM,
  });

  return {
    passwordHash: encodePasswordHash(derivedKey),
    passwordSalt: salt,
  };
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string,
) {
  const { hashHex, params } = parsePasswordHash(passwordHash);
  const derivedKey = params
    ? await runScrypt(password, passwordSalt, KEY_LENGTH, {
        ...params,
        maxmem: SCRYPT_MAXMEM,
      })
    : await runScrypt(password, passwordSalt, KEY_LENGTH);
  const stored = Buffer.from(hashHex, "hex");

  return (
    derivedKey.length === stored.length &&
    timingSafeEqual(derivedKey, stored)
  );
}
