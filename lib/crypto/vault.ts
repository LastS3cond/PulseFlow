import { base64ToBuffer, bufferToBase64 } from "./asymmetric";

const PBKDF2_ITERATIONS = 100000;

/**
 * Derives an AES-GCM 256-bit key from Password 2 using PBKDF2 and the provided salt.
 */
async function deriveMasterKey(password: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface InitializedVault {
  public_key_spki: string;
  encrypted_private_key: string;
  salt: string;
}

/**
 * Generates an RSA-OAEP keypair and encrypts the private key using Password 2 via PBKDF2 + AES-GCM.
 */
export async function initializeVaultWithPassword2(password2: string): Promise<InitializedVault> {
  // 1. Generate RSA-OAEP key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  // 2. Export public key to SPKI
  const spkiBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const public_key_spki = bufferToBase64(spkiBuffer);

  // 3. Export private key to PKCS#8
  const pkcs8Buffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  // 4. Generate 16-byte random salt for PBKDF2
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bufferToBase64(saltBytes);

  // 5. Derive AES-GCM master key
  const masterKey = await deriveMasterKey(password2, saltBytes.buffer);

  // 6. Encrypt PKCS#8 private key
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPrivateBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    masterKey,
    pkcs8Buffer
  );

  const encrypted_private_key = `${bufferToBase64(iv)}:${bufferToBase64(encryptedPrivateBuffer)}`;

  return {
    public_key_spki,
    encrypted_private_key,
    salt,
  };
}

/**
 * Unwraps the RSA-OAEP private key in ephemeral RAM using Password 2.
 * Throws error if password is incorrect.
 */
export async function unwrapPrivateKeyWithPassword2(
  password2: string,
  saltBase64: string,
  encryptedPrivateKey: string
): Promise<CryptoKey> {
  const parts = encryptedPrivateKey.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted private key format");
  }

  const [ivB64, cipherB64] = parts;
  const iv = base64ToBuffer(ivB64);
  const ciphertext = base64ToBuffer(cipherB64);
  const salt = base64ToBuffer(saltBase64);

  // 1. Derive AES-GCM master key from Password 2
  const masterKey = await deriveMasterKey(password2, salt);

  // 2. Decrypt PKCS#8 private key buffer
  let pkcs8Buffer: ArrayBuffer;
  try {
    pkcs8Buffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      masterKey,
      ciphertext
    );
  } catch {
    throw new Error("Incorrect Password 2 or corrupted vault payload");
  }

  // 3. Import private key
  return await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt", "unwrapKey"]
  );
}
