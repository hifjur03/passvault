/**
 * All cryptography happens in the browser with the Web Crypto API.
 * The master password and the derived key never leave this device.
 */

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** PBKDF2 rounds for the master password (OWASP 2023 recommendation for SHA-256). */
export const MASTER_ITERATIONS = 600_000
/** PBKDF2 rounds for the 6-digit quick-unlock PIN. */
export const PIN_ITERATIONS = 210_000
export const PIN_LENGTH = 6

const VERIFIER_TEXT = 'passvault:v1:verifier'
const IV_BYTES = 12
const SALT_BYTES = 16

export type Bytes = Uint8Array<ArrayBuffer>

export interface CipherPayload {
  iv: string
  data: string
}

export interface PinWrap extends CipherPayload {
  salt: string
  iterations: number
}

export function randomBytes(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(length))
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function fromBase64(value: string): Bytes {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deriveAesKey(
  password: string,
  salt: Bytes,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    // Extractable so the key can be wrapped with the local PIN.
    true,
    ['encrypt', 'decrypt'],
  )
}

/** Derive the vault key from the master password and a stored salt. */
export function deriveMasterKey(
  password: string,
  salt: Bytes,
  iterations = MASTER_ITERATIONS,
): Promise<CryptoKey> {
  return deriveAesKey(password, salt, iterations)
}

export async function encryptBytes(
  key: CryptoKey,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<CipherPayload> {
  const iv = randomBytes(IV_BYTES)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) }
}

export async function decryptBytes(
  key: CryptoKey,
  payload: CipherPayload,
): Promise<Bytes> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data),
  )
  return new Uint8Array(plain)
}

export async function encryptString(
  key: CryptoKey,
  value: string,
): Promise<CipherPayload> {
  return encryptBytes(key, textEncoder.encode(value))
}

export async function decryptString(
  key: CryptoKey,
  payload: CipherPayload,
): Promise<string> {
  return textDecoder.decode(await decryptBytes(key, payload))
}

export async function encryptJson(
  key: CryptoKey,
  value: unknown,
): Promise<CipherPayload> {
  return encryptString(key, JSON.stringify(value))
}

export async function decryptJson<T>(
  key: CryptoKey,
  payload: CipherPayload,
): Promise<T> {
  return JSON.parse(await decryptString(key, payload)) as T
}

/** Encrypts a known string, used to check whether a password is correct. */
export function createVerifier(key: CryptoKey): Promise<CipherPayload> {
  return encryptString(key, VERIFIER_TEXT)
}

export async function verifyKey(
  key: CryptoKey,
  verifier: CipherPayload,
): Promise<boolean> {
  try {
    return (await decryptString(key, verifier)) === VERIFIER_TEXT
  } catch {
    return false
  }
}

export function createSalt(): Bytes {
  return randomBytes(SALT_BYTES)
}

/** Wrap the vault key with a PIN-derived key so it can be stored locally. */
export async function wrapKeyWithPin(
  key: CryptoKey,
  pin: string,
): Promise<PinWrap> {
  const salt = createSalt()
  const pinKey = await deriveAesKey(pin, salt, PIN_ITERATIONS)
  const raw = await crypto.subtle.exportKey('raw', key)
  const payload = await encryptBytes(pinKey, new Uint8Array(raw))
  return { ...payload, salt: toBase64(salt), iterations: PIN_ITERATIONS }
}

/** Recover the vault key from a PIN-wrapped blob. Throws on a wrong PIN. */
export async function unwrapKeyWithPin(
  pin: string,
  wrap: PinWrap,
): Promise<CryptoKey> {
  const pinKey = await deriveAesKey(pin, fromBase64(wrap.salt), wrap.iterations)
  const raw = await decryptBytes(pinKey, wrap)
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}
