// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}))

import App from './App'

describe('App', () => {
  it('shows the sign-in form when not signed in', async () => {
    const { container } = render(<App />)
    // Wait until the auth screen is up (segmented tab labelled "Create account")
    await waitFor(() => expect(screen.getByText('Create account')).toBeTruthy())
    expect(container.querySelector('form')).toBeTruthy()
  })
})
