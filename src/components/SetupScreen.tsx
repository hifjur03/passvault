import { useState, type FormEvent } from 'react'
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { passwordStrength } from '../lib/password'
import { PasswordInput } from './PasswordInput'

interface SetupScreenProps {
  email: string
  onSubmit: (masterPassword: string) => Promise<void>
  onSignOut: () => Promise<void>
}

const STRENGTH_CLASSES = ['', 's1', 's2', 's3', 's4']

export function SetupScreen({ email, onSubmit, onSignOut }: SetupScreenProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const strength = passwordStrength(password)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 10) {
      setError('Use at least 10 characters for your master password.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    if (!acknowledged) {
      setError('Please confirm that you understand the recovery warning.')
      return
    }

    setBusy(true)
    try {
      await onSubmit(password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the vault.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="centered-page">
      <form className="card setup-card" onSubmit={submit}>
        <div className="setup-badge">
          <ShieldCheck size={26} />
        </div>
        <h1>Create your master password</h1>
        <p className="muted small">
          Signed in as <strong>{email}</strong>. This password encrypts your vault on this
          device. It is never sent to the server.
        </p>

        <label className="field">
          <span>Master password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="At least 10 characters"
            autoComplete="new-password"
            autoFocus
            ariaLabel="Master password"
          />
        </label>

        <div className="strength">
          <div className="strength-bars">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={
                  strength.score >= bar ? `strength-bar ${STRENGTH_CLASSES[strength.score]}` : 'strength-bar'
                }
              />
            ))}
          </div>
          <span className="muted tiny">{password ? strength.label : 'Use a long, unique passphrase'}</span>
        </div>

        <label className="field">
          <span>Confirm master password</span>
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat the master password"
            autoComplete="new-password"
            ariaLabel="Confirm master password"
          />
        </label>

        <div className="warning-box">
          <AlertTriangle size={18} />
          <div>
            <strong>There is no password reset.</strong>
            <p className="small">
              Because the vault is encrypted end-to-end, nobody — including us — can recover
              your data if you forget this password.
            </p>
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>I understand that a lost master password means lost data.</span>
        </label>

        {error ? <p className="error-text" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          Create vault
        </button>

        <button type="button" className="link-btn" onClick={() => void onSignOut()} disabled={busy}>
          Sign out
        </button>
      </form>
    </div>
  )
}
