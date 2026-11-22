import { describe, expect, it } from 'vitest'
import { generatePassword, passwordStrength } from './password'

describe('generatePassword', () => {
  it('uses the requested length', () => {
    expect(generatePassword(24)).toHaveLength(24)
  })

  it('always includes lower, upper, digit and symbol characters', () => {
    for (let index = 0; index < 25; index += 1) {
      const password = generatePassword(12)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/\d/)
      expect(password).toMatch(/[^A-Za-z0-9]/)
    }
  })

  it('does not repeat itself', () => {
    expect(generatePassword(20)).not.toBe(generatePassword(20))
  })

  it('never goes below 8 characters', () => {
    expect(generatePassword(4)).toHaveLength(8)
  })
})

describe('passwordStrength', () => {
  it('rates long mixed passwords as strong', () => {
    expect(passwordStrength('Tr0ub4dor&3-xK9!mQ2').score).toBe(4)
  })

  it('rates short passwords as weak', () => {
    expect(passwordStrength('abc').score).toBeLessThanOrEqual(1)
  })
})
