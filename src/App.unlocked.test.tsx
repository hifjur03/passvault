// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'me@example.com' } } } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}))

vi.mock('./lib/vault', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/vault')>()
  return {
    ...actual,
    fetchVault: async () => ({
      user_id: 'u1',
      salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
      verifier: 'dmVyaWZpZXI=',
      verifier_iv: 'aXY=',
      data: 'eyJlbXB0eV9lbnRyeV9kYXRlIjp7ImVudHJ5cyI6IFt7ImlkIjoxfSwic3BlIjoiaG1lbSJ9LCJwYXNzd29yZCI6IiJ9',
      data_iv: 'aXY=',
      version: 1,
      updated_at: new Date().toISOString(),
    }),
    createVault: vi.fn(),
    deleteVault: vi.fn(),
    updateVault: vi.fn(),
    VaultConflictError: class extends Error {},
  }
})

import App from './App'

describe('App unlocked flow', () => {
  it('renders the Home screen once the vault is unlocked', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy(), { timeout: 8000 })
  })
})
