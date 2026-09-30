/**
 * Web Crypto utility functions for Base64 encoding/decoding
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Imports an RSA-OAEP public key from its SPKI base64 representation.
 */
export async function importPublicKeyFromSpki(spkiBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToBuffer(spkiBase64);
  return await crypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt", "wrapKey"]
  );
}

/**
 * Encrypts narrative JSON using an ephemeral AES-GCM DEK wrapped by an RSA-OAEP public key.
 * Result format: base64(wrapped_dek):base64(iv):base64(ciphertext)
 */
export async function encryptNarrativeWithPublicKey(
  narrativeJson: string,
  publicKey: CryptoKey
): Promise<string> {
  // 1. Generate ephemeral AES-GCM 256-bit DEK
  const dek = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt narrative JSON with DEK and random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(narrativeJson);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    dek,
    encodedData
  );

  // 3. Wrap ephemeral DEK with RSA-OAEP Public Key
  const wrappedDekBuffer = await crypto.subtle.wrapKey(
    "raw",
    dek,
    publicKey,
    {
      name: "RSA-OAEP",
    }
  );

  // 4. Return combined envelope string
  const wrappedDekB64 = bufferToBase64(wrappedDekBuffer);
  const ivB64 = bufferToBase64(iv);
  const ciphertextB64 = bufferToBase64(ciphertextBuffer);

  return `${wrappedDekB64}:${ivB64}:${ciphertextB64}`;
}

/**
 * Decrypts an encrypted narrative string using the unwrapped RSA-OAEP private key.
 */
export async function decryptNarrativeWithPrivateKey(
  encryptedNarrative: string,
  privateKey: CryptoKey
): Promise<string> {
  const parts = encryptedNarrative.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted narrative format");
  }

  const [wrappedDekB64, ivB64, ciphertextB64] = parts;
  const wrappedDekBuffer = base64ToBuffer(wrappedDekB64);
  const ivBuffer = base64ToBuffer(ivB64);
  const ciphertextBuffer = base64ToBuffer(ciphertextB64);

  // 1. Unwrap ephemeral DEK using RSA Private Key
  const dek = await crypto.subtle.unwrapKey(
    "raw",
    wrappedDekBuffer,
    privateKey,
    {
      name: "RSA-OAEP",
    },
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );

  // 2. Decrypt ciphertext using unwrapped DEK
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(ivBuffer),
    },
    dek,
    ciphertextBuffer
  );

  return new TextDecoder().decode(plaintextBuffer);
}
