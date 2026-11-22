// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HomeScreen } from './HomeScreen'
import type { Entry, Note, Reminder, Expense } from '../lib/vault'
import type { Screen } from '../types'

afterEach(cleanup)

const entries: Entry[] = [
  { id: '1', site: 'Gmail', username: 'me@example.com', password: 'hunter2', notes: '', createdAt: '', updatedAt: '' },
]

const notes: Note[] = [
  { id: 'n1', title: 'Road trip Ideas', body: 'Goa, Lonavala', createdAt: '', updatedAt: '' },
]

const reminders: Reminder[] = [
  { id: 'r1', title: 'Pay electricity', description: '', date: '2026-11-22', time: '18:00', done: false, repeat: 'none', createdAt: '', updatedAt: '' },
]

const expenses: Expense[] = [
  { id: 'e1', date: '2026-11-22', category: 'Food', item: 'Groceries', amount: 12.5, currency: 'BDT', createdAt: '', updatedAt: '' },
]

function renderHome(overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  const navigations: Screen[] = []
  const props = {
    email: 'me@example.com',
    entries,
    notes,
    reminders,
    expenses,
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
  })

  it('shows saved counts per module', () => {
    renderHome()
    // Passwords(1), Notes(1), Reminders(1), Expenses(1) — all modules ready now.
    expect(screen.getAllByText('1 saved').length).toBe(4)
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

  it('navigates to the reminders module on click', () => {
    const { navigations } = renderHome()
    fireEvent.click(screen.getByText('Reminders'))
    expect(navigations).toEqual(['reminders'])
  })

  it('navigates to the expenses module on click', () => {
    const { navigations } = renderHome()
    fireEvent.click(screen.getByText('Expenses'))
    expect(navigations).toEqual(['expenses'])
  })

  it('renders the lock button', () => {
    renderHome()
    expect(screen.getByLabelText('Lock vault')).toBeTruthy()
  })
})
