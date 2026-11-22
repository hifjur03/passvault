import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, Search, Settings, StickyNote, Trash2, Pencil, Lock } from 'lucide-react'
import type { Note } from '../lib/vault'
import { ConfirmModal } from './ConfirmModal'
import { NoteModal, type NoteDraft } from './NoteModal'
import type { ToastTone } from './Toast'

interface NotesScreenProps {
  notes: Note[]
  onSaveNotes: (notes: Note[]) => Promise<void>
  onBack: () => void
  onLock: () => void
  onOpenSettings: () => void
  notify: (message: string, tone?: ToastTone) => void
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotesScreen({
  notes,
  onSaveNotes,
  onBack,
  onLock,
  onOpenSettings,
  notify,
}: NotesScreenProps) {
  const [editing, setEditing] = useState<Note | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return notes
    return notes.filter(
      (note) => note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query),
    )
  }, [notes, search])

  const saveNote = async (draft: NoteDraft) => {
    const now = new Date().toISOString()
    const next = editing
      ? notes.map((note) =>
          note.id === editing.id ? { ...note, ...draft, updatedAt: now } : note,
        )
      : [{ id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }, ...notes]
    await onSaveNotes(next)
    setEditing(undefined)
    notify(editing ? 'Note updated.' : 'Note saved.')
  }

  const deleteNote = async () => {
    if (!deleteTarget) return
    await onSaveNotes(notes.filter((note) => note.id !== deleteTarget.id))
    setDeleteTarget(null)
    notify('Note deleted.')
  }

  return (
    <div className="notes-page">
      <header className="notes-topbar">
        <div className="notes-left">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Back to home">
            <ArrowLeft size={16} />
            <span>Home</span>
          </button>
          <span className="notes-title">
            <StickyNote size={18} />
            Notes
          </span>
        </div>
        <div className="topbar-right">
          <button type="button" className="icon-btn" onClick={onLock} aria-label="Lock vault" title="Lock vault">
            <Lock size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings" title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="notes-main">
        <div className="notes-toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={18} /> New
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="empty-state notes-empty">
            <div className="empty-icon">
              <StickyNote size={30} />
            </div>
            <h2>No notes yet</h2>
            <p className="muted">Add your first private note — it is encrypted like everything else.</p>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
              <Plus size={18} /> Add your first note
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state notes-empty">
            <div className="empty-icon">
              <Search size={28} />
            </div>
            <h2>No matches</h2>
            <p className="muted">Nothing matches “{search}”.</p>
          </div>
        ) : (
          <div className="note-list">
            {filtered.map((note) => (
              <article className="note-card" key={note.id}>
                <div className="note-avatar" aria-hidden="true">
                  <StickyNote size={18} />
                </div>
                <div className="note-body">
                  <div className="note-top">
                    <h3 className="note-title">{note.title}</h3>
                    <div className="note-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditing(note)}
                        aria-label={`Edit ${note.title}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleteTarget(note)}
                        aria-label={`Delete ${note.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {note.body ? (
                    <p className="note-preview">{note.body}</p>
                  ) : (
                    <p className="note-preview muted">No details yet…</p>
                  )}
                  <p className="note-meta">{timeAgo(note.updatedAt)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {editing !== undefined ? (
        <NoteModal note={editing} onClose={() => setEditing(undefined)} onSave={saveNote} />
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          title="Delete note?"
          message={`“${deleteTarget.title}” will be deleted from your vault on every device. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteNote}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
