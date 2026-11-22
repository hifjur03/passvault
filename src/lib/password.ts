const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}:,.?'
const ALL = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS

/** Uniform random integer in [0, max) without modulo bias. */
function randomInt(max: number): number {
  const buffer = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / max) * max
  let value = 0
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return value % max
}

export function generatePassword(length = 20): string {
  const size = Math.max(length, 8)
  const chars: string[] = [
    LOWERCASE[randomInt(LOWERCASE.length)],
    UPPERCASE[randomInt(UPPERCASE.length)],
    DIGITS[randomInt(DIGITS.length)],
    SYMBOLS[randomInt(SYMBOLS.length)],
  ]
  while (chars.length < size) chars.push(ALL[randomInt(ALL.length)])

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: 'Empty' }

  let points = 0
  if (password.length >= 8) points += 1
  if (password.length >= 12) points += 1
  if (password.length >= 16) points += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1
  if (/\d/.test(password)) points += 1
  if (/[^A-Za-z0-9]/.test(password)) points += 1

  const score = Math.min(4, Math.floor((points * 5) / 6)) as Strength['score']
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
  return { score, label: labels[score] }
}
