import type { PinWrap } from './crypto'

const WRAP_PREFIX = 'passvault.pin.v1.'
const ATTEMPTS_PREFIX = 'passvault.pinAttempts.v1.'
export const MAX_PIN_ATTEMPTS = 5

function wrapKey(userId: string): string {
  return WRAP_PREFIX + userId
}

function attemptsKey(userId: string): string {
  return ATTEMPTS_PREFIX + userId
}

export function loadPinWrap(userId: string): PinWrap | null {
  try {
    const raw = localStorage.getItem(wrapKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PinWrap
    if (!parsed.salt || !parsed.iv || !parsed.data) return null
    return parsed
  } catch {
    return null
  }
}

export function savePinWrap(userId: string, wrap: PinWrap): void {
  localStorage.setItem(wrapKey(userId), JSON.stringify(wrap))
  resetPinAttempts(userId)
}

export function clearPinWrap(userId: string): void {
  localStorage.removeItem(wrapKey(userId))
  resetPinAttempts(userId)
}

export function getPinAttempts(userId: string): number {
  const raw = localStorage.getItem(attemptsKey(userId))
  const value = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function recordPinFailure(userId: string): number {
  const next = getPinAttempts(userId) + 1
  localStorage.setItem(attemptsKey(userId), String(next))
  return next
}

export function resetPinAttempts(userId: string): void {
  localStorage.removeItem(attemptsKey(userId))
}
