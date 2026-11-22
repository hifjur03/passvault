import { useState, type FormEvent } from 'react'
import {
  ChevronRight,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Modal } from './Modal'
import { PasswordInput } from './PasswordInput'
import { passwordStrength } from '../lib/password'
import type { ToastTone } from './Toast'

interface SettingsModalProps {
  email: string
  hasPin: boolean
  onChangeMaster: (current: string, next: string) => Promise<void>
  onOpenPinSetup: () => void
  onRemovePin: () => void
  onLock: () => void
  onSignOut: () => Promise<void>
  onClose: () => void
  notify: (message: string, tone?: ToastTone) => void
}

export function SettingsModal({
  email,
  hasPin,
  onChangeMaster,
  onOpenPinSetup,
  onRemovePin,
  onLock,
  onSignOut,
  onClose,
  notify,
}: SettingsModalProps) {
  const [showChangeMaster, setShowChangeMaster] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemovePin, setConfirmRemovePin] = useState(false)

  const strength = passwordStrength(next)

  const submitChange = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!current) {
      setError('Enter your current master password.')
      return
    }
    if (next.length < 10) {
      setError('The new master password must be at least 10 characters.')
      return
    }
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await onChangeMaster(current, next)
      notify('Master password changed. Your PIN was removed — set a new one.')
      setCurrent('')
      setNext('')
      setConfirm('')
      setShowChangeMaster(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change the password.')
    } finally {
      setBusy(false)
    }
  }

  const removePin = () => {
    onRemovePin()
    setConfirmRemovePin(false)
    notify('Quick-unlock PIN removed from this device.')
  }

  return (
    <Modal title="Settings" subtitle={email} onClose={onClose}>
      <section className="settings-section">
        <h3>Security</h3>

        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Master password</strong>
            <span className="muted tiny">Encrypts your vault. Never leaves this device.</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setShowChangeMaster((value) => !value)}
          >
            Change
            <ChevronRight size={15} className={showChangeMaster ? 'rotated' : ''} />
          </button>
        </div>

        {showChangeMaster ? (
          <form className="settings-form" onSubmit={submitChange}>
            <label className="field">
              <span>Current master password</span>
              <PasswordInput
                value={current}
                onChange={setCurrent}
                placeholder="Current password"
                autoComplete="current-password"
                autoFocus
                ariaLabel="Current master password"
              />
            </label>
            <label className="field">
              <span>New master password</span>
              <PasswordInput
                value={next}
                onChange={setNext}
                placeholder="At least 10 characters"
                autoComplete="new-password"
                ariaLabel="New master password"
              />
            </label>
            <div className="strength">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className={strength.score >= bar ? `strength-bar s${strength.score}` : 'strength-bar'}
                  />
                ))}
              </div>
              <span className="muted tiny">{next ? strength.label : 'Use a long passphrase'}</span>
            </div>
            <label className="field">
              <span>Confirm new master password</span>
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat the new password"
                autoComplete="new-password"
                ariaLabel="Confirm new master password"
              />
            </label>
            {error ? <p className="error-text" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              Update master password
            </button>
          </form>
        ) : null}

        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Quick-unlock PIN</strong>
            <span className="muted tiny">
              {hasPin ? 'Enabled on this device' : 'Not set up on this device'}
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={onOpenPinSetup}>
            <KeyRound size={15} /> {hasPin ? 'Change' : 'Set up'}
          </button>
        </div>

        {hasPin ? (
          <div className="settings-row">
            <div className="settings-row-text">
              <strong>Remove PIN</strong>
              <span className="muted tiny">You will use your master password to unlock.</span>
            </div>
            {confirmRemovePin ? (
              <div className="row-actions">
                <button type="button" className="btn btn-danger btn-small" onClick={removePin}>
                  <Trash2 size={15} /> Remove
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setConfirmRemovePin(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setConfirmRemovePin(true)}
              >
                Remove
              </button>
            )}
          </div>
        ) : null}

        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Lock now</strong>
            <span className="muted tiny">Clears the key from memory.</span>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={onLock}>
            <Lock size={15} /> Lock
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Account</h3>
        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Sign out</strong>
            <span className="muted tiny">Removes this device's PIN. Vault stays encrypted online.</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => void onSignOut()}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </section>

      <p className="muted tiny settings-foot">
        AES-256-GCM · PBKDF2-SHA256 · 600,000 rounds. Your master password is never sent to the
        server, so a lost master password cannot be reset.
      </p>
    </Modal>
  )
}
