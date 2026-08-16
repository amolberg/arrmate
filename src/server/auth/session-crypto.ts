import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function encryptionKey(secret: string): Buffer {
  return createHash("sha256")
    .update("arrmate:session:v1")
    .update(secret)
    .digest();
}

export function sealSession(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function unsealSession(value: string, secret: string): unknown | null {
  const [version, ivValue, encryptedValue, tagValue] = value.split(".");
  if (version !== "v1" || !ivValue || !encryptedValue || !tagValue) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(secret),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}
