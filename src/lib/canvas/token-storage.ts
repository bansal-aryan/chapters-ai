import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const TOKEN_REFERENCE_PREFIX = "canvas-token:v1";

export type CanvasTokenPayload = {
  accessToken: string;
  canvasRegion?: string;
  expiresAt?: string;
  issuedAt: string;
  refreshToken?: string;
  tokenType: string;
  user?: {
    id: string;
    name?: string;
  };
};

export function hasCanvasTokenEncryptionKey() {
  return Boolean(process.env.CANVAS_TOKEN_ENCRYPTION_KEY);
}

export function encryptCanvasTokenPayload(payload: CanvasTokenPayload) {
  const key = getTokenEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_REFERENCE_PREFIX}:${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptCanvasTokenPayload(tokenReference: string): CanvasTokenPayload {
  const key = getTokenEncryptionKey();
  const [prefix, version, encoded] = tokenReference.split(":");

  if (`${prefix}:${version}` !== TOKEN_REFERENCE_PREFIX || !encoded) {
    throw new Error("Unsupported Canvas token reference format.");
  }

  const [ivValue, tagValue, ciphertextValue] = encoded.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid Canvas token reference.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final()
  ]).toString("utf8");

  return JSON.parse(plaintext) as CanvasTokenPayload;
}

function getTokenEncryptionKey() {
  const value = process.env.CANVAS_TOKEN_ENCRYPTION_KEY;

  if (!value) {
    throw new Error("Missing CANVAS_TOKEN_ENCRYPTION_KEY.");
  }

  const base64Key = Buffer.from(value, "base64");
  if (base64Key.length === 32) {
    return base64Key;
  }

  return createHash("sha256").update(value).digest();
}
