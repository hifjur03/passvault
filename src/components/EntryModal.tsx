import { useState, type FormEvent } from 'react'
import { Loader2, Save, Sparkles } from 'lucide-react'
import type { Entry } from '../lib/vault'
import { generatePassword, passwordStrength } from '../lib/password'
import { Modal } from './Modal'
import { PasswordInput } from './PasswordInput'

export interface EntryDraft {
  site: string
  username: string
  password: string
  notes: string
}

interface EntryModalProps {
  entry: Entry | null
  onClose: () => void
  onSave: (draft: EntryDraft) => Promise<void>
}

export function EntryModal({ entry, onClose, onSave }: EntryModalProps) {
  const [site, setSite] = useState(entry?.site ?? '')
  const [username, setUsername] = useState(entry?.username ?? '')
  const [password, setPassword] = useState(entry?.password ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const strength = passwordStrength(password)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!site.trim()) {
      setError('Enter the website or app name.')
      return
    }
    if (!password) {
      setError('Enter a password (or generate one).')
      return
    }

    setBusy(true)
    try {
      await onSave({
        site: site.trim(),
        username: username.trim(),
        password,
        notes: notes.trim(),
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this entry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={entry ? 'Edit password' : 'Add password'}
      subtitle="Encrypted before it leaves this device."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="entry-form" className="btn btn-primary" disabled={busy}>
            {busy ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            {entry ? 'Save changes' : 'Save password'}
          </button>
        </>
      }
    >
      <form id="entry-form" className="stack" onSubmit={submit}>
        <label className="field">
          <span>Website or app</span>
          <input
            className="input"
            value={site}
            onChange={(event) => setSite(event.target.value)}
            placeholder="e.g. Gmail"
            autoFocus
            autoCapitalize="words"
          />
        </label>

        <label className="field">
          <span>Email or username</span>
          <input
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. you@gmail.com"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>

        <div className="field">
          <span>Password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Enter or generate a password"
            autoComplete="new-password"
            ariaLabel="Password"
          />
          <div className="field-extra">
            <div className="strength">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className={
                      strength.score >= bar
                        ? `strength-bar s${strength.score}`
                        : 'strength-bar'
                    }
                  />
                ))}
              </div>
              <span className="muted tiny">{password ? strength.label : 'No password yet'}</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setPassword(generatePassword(20))}
            >
              <Sparkles size={15} /> Generate
            </button>
          </div>
        </div>

        <label className="field">
          <span>Notes <em className="muted">(optional)</em></span>
          <textarea
            className="input textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Recovery codes, security questions, anything else"
            rows={3}
          />
        </label>

        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </form>
    </Modal>
  )
}
