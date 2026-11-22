// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { VaultScreen } from './VaultScreen'
import type { Entry } from '../lib/vault'

afterEach(cleanup)

const entries: Entry[] = [
  {
    id: '1',
    site: 'Gmail',
    username: 'me@example.com',
    password: 'hunter2',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    site: 'GitHub',
    username: 'octocat',
    password: 's3cret!',
    notes: 'Work account',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

function renderVault(overrides: Partial<Parameters<typeof VaultScreen>[0]> = {}) {
  return render(
    <VaultScreen
      email="me@example.com"
      entries={entries}
      updatedAt="2026-01-02T00:00:00.000Z"
      hasPin
      onSaveEntries={async () => {}}
      onLock={() => {}}
      onSignOut={async () => {}}
      onChangeMaster={async () => {}}
      onSetPin={async () => {}}
      onRemovePin={() => {}}
      notify={() => {}}
      {...overrides}
    />,
  )
}

describe('VaultScreen', () => {
  it('lists saved entries and hides passwords by default', () => {
    renderVault()
    expect(screen.getByText('Gmail')).toBeTruthy()
    expect(screen.getByText('GitHub')).toBeTruthy()
    expect(screen.queryByText('hunter2')).toBeNull()
    expect(screen.getByText('2 passwords · end-to-end encrypted')).toBeTruthy()
  })

  it('filters entries with the search box', () => {
    renderVault()
    fireEvent.change(screen.getByLabelText('Search passwords'), {
      target: { value: 'git' },
    })
    expect(screen.queryByText('Gmail')).toBeNull()
    expect(screen.getByText('GitHub')).toBeTruthy()
  })

  it('reveals a password on demand', () => {
    renderVault()
    const revealButtons = screen.getAllByLabelText('Show password')
    fireEvent.click(revealButtons[0])
    expect(screen.getByText('hunter2')).toBeTruthy()
  })

  it('opens the add-password dialog', () => {
    renderVault()
    fireEvent.click(screen.getByRole('button', { name: /Add/ }))
    expect(screen.getByText('Add password')).toBeTruthy()
    expect(screen.getByLabelText('Website or app')).toBeTruthy()
  })

  it('shows an empty state when nothing is saved', () => {
    renderVault({ entries: [] })
    expect(screen.getByText('No passwords yet')).toBeTruthy()
  })
})
