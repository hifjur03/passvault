import { useState, type FormEvent } from 'react'
import { AlertTriangle, Loader2, Lock, KeyRound } from 'lucide-react'
import { PasswordInput } from './PasswordInput'
import { PinPad } from './PinPad'

interface UnlockScreenProps {
  email: string
  hasPin: boolean
  onUnlockMaster: (password: string) => Promise<void>
  onUnlockPin: (pin: string) => Promise<void>
  onResetVault: () => Promise<void>
  onSignOut: () => Promise<void>
}

type Mode = 'pin' | 'master'

export function UnlockScreen({
  email,
  hasPin,
  onUnlockMaster,
  onUnlockPin,
  onResetVault,
  onSignOut,
}: UnlockScreenProps) {
  // Always start with the master password; the PIN is an optional fallback
  // that the user has to choose explicitly ("Use PIN instead").
  const [mode, setMode] = useState<Mode>('master')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [showForgot, setShowForgot] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)

  const effectiveMode: Mode = hasPin ? mode : 'master'

  const unlockWithMaster = async (event: FormEvent) => {
    event.preventDefault()
    if (!password) {
      setError('Enter your master password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onUnlockMaster(password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not unlock the vault.')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  const unlockWithPin = async (pin: string) => {
    setBusy(true)
    setError('')
    try {
      await onUnlockPin(pin)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wrong PIN.')
      setResetSignal((current) => current + 1)
    } finally {
      setBusy(false)
    }
  }

  const resetVault = async () => {
    setBusy(true)
    setError('')
    try {
      await onResetVault()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not erase the vault.')
    } finally {
      setBusy(false)
      setConfirmErase(false)
    }
  }

  if (effectiveMode === 'pin') {
    return (
      <div className="centered-page">
        <PinPad
          key={resetSignal}
          title="Welcome back"
          subtitle={email}
          error={error}
          busy={busy}
          onComplete={(pin) => void unlockWithPin(pin)}
          footer={
            <div className="pin-footer-actions">
              <button type="button" className="link-btn" onClick={() => { setMode('master'); setError('') }}>
                Use master password
              </button>
              <button type="button" className="link-btn muted-link" onClick={() => void onSignOut()}>
                Sign out
              </button>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="centered-page">
      <form className="card setup-card" onSubmit={unlockWithMaster}>
        <div className="setup-badge">
          <Lock size={26} />
        </div>
        <h1>Unlock your vault</h1>
        <p className="muted small">
          Signed in as <strong>{email}</strong>
        </p>

        <label className="field">
          <span>Master password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Your master password"
            autoComplete="current-password"
            autoFocus
            disabled={busy}
            ariaLabel="Master password"
          />
        </label>

        {error ? <p className="error-text" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          Unlock
        </button>

        {hasPin ? (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => { setMode('pin'); setError('') }}
            disabled={busy}
          >
            <KeyRound size={17} /> Use PIN instead
          </button>
        ) : null}

        {!showForgot ? (
          <button type="button" className="link-btn" onClick={() => setShowForgot(true)}>
            Forgot master password?
          </button>
        ) : (
          <div className="warning-box">
            <AlertTriangle size={18} />
            <div>
              <strong>It cannot be recovered.</strong>
              <p className="small">
                The vault is encrypted with your master password only. The only way forward is
                to erase the vault and start over.
              </p>
              {confirmErase ? (
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-small"
                    onClick={() => void resetVault()}
                    disabled={busy}
                  >
                    Yes, erase everything
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => setConfirmErase(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => setConfirmErase(true)}
                >
                  Erase vault and start over
                </button>
              )}
            </div>
          </div>
        )}

        <button type="button" className="link-btn muted-link" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </form>
    </div>
  )
}
