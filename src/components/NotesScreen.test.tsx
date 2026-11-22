// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NotesScreen } from './NotesScreen'
import type { Note } from '../lib/vault'

afterEach(cleanup)

const notes: Note[] = [
  {
    id: '1',
    title: 'Road trip Ideas',
    body: 'Goa, Lonavala, sincerely?',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

function renderNotes(overrides: Partial<Parameters<typeof NotesScreen>[0]> = {}) {
  return render(
    <NotesScreen
      notes={notes}
      onSaveNotes={async () => {}}
      onBack={() => {}}
      onLock={() => {}}
      onOpenSettings={() => {}}
      notify={() => {}}
      {...overrides}
    />,
  )
}

describe('NotesScreen', () => {
  it('lists notes', () => {
    renderNotes()
    expect(screen.getByText('Road trip Ideas')).toBeTruthy()
    expect(screen.getByText(/Goa, Lonavala/)).toBeTruthy()
  })

  it('shows the empty state when there are no notes', () => {
    renderNotes({ notes: [] })
    expect(screen.getByText('No notes yet')).toBeTruthy()
  })

  it('filters notes by search', () => {
    renderNotes()
    fireEvent.change(screen.getByLabelText('Search notes'), {
      target: { value: 'road' },
    })
    expect(screen.getByText('Road trip Ideas')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Search notes'), {
      target: { value: 'zzz' },
    })
    expect(screen.getByText('No matches')).toBeTruthy()
  })

  it('opens the note editor for a new note', () => {
    renderNotes()
    fireEvent.click(screen.getByRole('button', { name: /New/ }))
    expect(screen.getByText('New note')).toBeTruthy()
  })

  it('renders the back button', () => {
    renderNotes()
    expect(screen.getByLabelText('Back to home')).toBeTruthy()
  })
})
