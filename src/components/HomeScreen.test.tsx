// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HomeScreen } from './HomeScreen'
import type { Entry, Note } from '../lib/vault'
import type { Screen } from '../types'

afterEach(cleanup)

const entries: Entry[] = [
  { id: '1', site: 'Gmail', username: 'me@example.com', password: 'hunter2', notes: '', createdAt: '', updatedAt: '' },
  { id: '2', site: 'GitHub', username: 'octocat', password: 's3cret!', notes: '', createdAt: '', updatedAt: '' },
]

const notes: Note[] = [
  { id: 'n1', title: 'Road trip Ideas', body: 'Goa, Lonavala', createdAt: '', updatedAt: '' },
]

function renderHome(overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  const navigations: Screen[] = []
  const props = {
    email: 'me@example.com',
    entries,
    notes,
    onNavigate: (screen: Screen) => {
      navigations.push(screen)
    },
    onLock: () => {},
    onOpenSettings: () => {},
    ...overrides,
  }
  return { ...render(<HomeScreen {...props} />), navigations }
}

describe('HomeScreen', () => {
  it('shows the welcome greeting and module cards', () => {
    renderHome()
    expect(screen.getByText('Welcome back')).toBeTruthy()
    expect(screen.getByText('Passwords')).toBeTruthy()
    expect(screen.getByText('Notes')).toBeTruthy()
    expect(screen.getByText('Reminders')).toBeTruthy()
    expect(screen.getByText('Expenses')).toBeTruthy()
    expect(screen.getByText('2 saved')).toBeTruthy()
  })

  it('navigates to the password module on click', () => {
    const { navigations } = renderHome()
    fireEvent.click(screen.getByText('Passwords'))
    expect(navigations).toEqual(['passwords'])
  })

  it('navigates to the notes module on click', () => {
    const { navigations } = renderHome()
    fireEvent.click(screen.getByText('Notes'))
    expect(navigations).toEqual(['notes'])
  })

  it('does not navigate for coming-soon modules', () => {
    const { navigations } = renderHome()
    const expenses = screen.getByText('Expenses').closest('button')
    expect(expenses).toBeTruthy()
    expect(navigations).toEqual([])
  })

  it('renders the lock button', () => {
    renderHome()
    expect(screen.getByLabelText('Lock vault')).toBeTruthy()
  })
})
