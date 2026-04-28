import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const TOKEN_VERSION = "v1";
const KEY_ENV = "CALENDAR_TOKEN_ENCRYPTION_KEY";
const LEGACY_KEY_ENV = "OAUTH_TOKEN_ENCRYPTION_KEY";

function tokenKey(): Buffer | null {
  const raw =
    process.env[KEY_ENV]?.trim() ?? process.env[LEGACY_KEY_ENV]?.trim();
  if (!raw) return null;

  const base64 = Buffer.from(raw, "base64");
  if (base64.byteLength === 32) return base64;

  return createHash("sha256").update(raw).digest();
}

export function hasCalendarTokenKey(): boolean {
  return Boolean(tokenKey());
}

export function encryptCalendarToken(value: string | null | undefined): string | null {
  if (!value) return null;

  const key = tokenKey();
  if (!key) {
    throw new Error(`${KEY_ENV} is required to store calendar tokens`);
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptCalendarToken(value: string | null | undefined): string | null {
  if (!value) return null;

  const key = tokenKey();
  if (!key) return null;

  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (
    version !== TOKEN_VERSION ||
    !ivRaw ||
    !tagRaw ||
    !encryptedRaw
  ) {
    return null;
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivRaw, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
