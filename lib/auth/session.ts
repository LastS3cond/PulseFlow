const SESSION_COOKIE_NAME = "trajectory_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Derives an HMAC key from the session secret string.
 */
async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a signed 30-day session token: timestamp.signatureHex
 */
export async function createSessionToken(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(timestamp));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${timestamp}.${sigHex}`;
}

/**
 * Verifies a session token. Checks signature and ensures it has not expired (> 30 days).
 */
export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [timestampStr, sigHex] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Check expiration (30 days)
    const now = Date.now();
    if (now - timestamp > THIRTY_DAYS_MS || timestamp > now + 60000) {
      return false;
    }

    const key = await getHmacKey(secret);
    const enc = new TextEncoder();

    // Convert sigHex to buffer
    const match = sigHex.match(/.{1,2}/g);
    if (!match) return false;
    const sigBytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));

    return await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(timestampStr));
  } catch {
    return false;
  }
}

/**
 * Computes SHA-256 hash in hex for Password 1 verification.
 */
export async function hashPasswordSha256(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(password));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export { SESSION_COOKIE_NAME };
