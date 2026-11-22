import { describe, expect, it } from 'vitest'
import {
  createSalt,
  createVerifier,
  decryptJson,
  deriveMasterKey,
  encryptJson,
  fromBase64,
  toBase64,
  unwrapKeyWithPin,
  verifyKey,
  wrapKeyWithPin,
} from './crypto'

const ITERATIONS = 2_000
const MASTER = 'correct horse battery staple'

async function makeKey(password = MASTER) {
  const salt = createSalt()
  return { key: await deriveMasterKey(password, salt, ITERATIONS), salt }
}

describe('crypto', () => {
  it('round-trips base64', () => {
    const bytes = createSalt()
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes))
  })

  it('encrypts and decrypts JSON with the derived key', async () => {
    const { key } = await makeKey()
    const value = { entries: [{ site: 'Gmail', username: 'me@example.com', password: 's3cret' }] }

    const payload = await encryptJson(key, value)
    expect(payload.data).not.toContain('Gmail')
    expect(payload.data).not.toContain('s3cret')

    const decrypted = await decryptJson<typeof value>(key, payload)
    expect(decrypted).toEqual(value)
  })

  it('produces a different ciphertext every time', async () => {
    const { key } = await makeKey()
    const first = await encryptJson(key, { a: 1 })
    const second = await encryptJson(key, { a: 1 })
    expect(first.iv).not.toBe(second.iv)
    expect(first.data).not.toBe(second.data)
  })

  it('verifies the master password and rejects a wrong one', async () => {
    const { key, salt } = await makeKey()
    const verifier = await createVerifier(key)

    expect(await verifyKey(key, verifier)).toBe(true)

    const wrongKey = await deriveMasterKey('not the password', salt, ITERATIONS)
    expect(await verifyKey(wrongKey, verifier)).toBe(false)
  })

  it('wraps the vault key with a PIN and unwraps it', async () => {
    const { key } = await makeKey()
    const wrap = await wrapKeyWithPin(key, '123456')
    const recovered = await unwrapKeyWithPin('123456', wrap)

    const verifier = await createVerifier(key)
    expect(await verifyKey(recovered, verifier)).toBe(true)
  })

  it('rejects a wrong PIN', async () => {
    const { key } = await makeKey()
    const wrap = await wrapKeyWithPin(key, '123456')
    await expect(unwrapKeyWithPin('654321', wrap)).rejects.toThrow()
  })
})
