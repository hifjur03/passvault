import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { Note } from '../lib/vault'
import { Modal } from './Modal'

export interface NoteDraft {
  title: string
  body: string
}

interface NoteModalProps {
  note: Note | null
  onClose: () => void
  onSave: (draft: NoteDraft) => Promise<void>
}

export function NoteModal({ note, onClose, onSave }: NoteModalProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the note a title.')
      return
    }
    setBusy(true)
    try {
      await onSave({ title: title.trim(), body: body.trim() })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this note.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={note ? 'Edit note' : 'New note'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="note-form" className="btn btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save note
          </button>
        </>
      }
    >
      <form id="note-form" className="stack" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Passwords help"
            autoFocus
          />
        </label>
        <label className="field">
          <span>Content</span>
          <textarea
            className="input textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Any details you want to keep together…"
            rows={6}
          />
        </label>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </form>
    </Modal>
  )
}
