import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, ShieldCheck, Lock, WifiOff } from 'lucide-react'
import { friendlyAuthError, supabase } from '../lib/supabase'
import { PasswordInput } from './PasswordInput'

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setNotice('')
    setPassword('')
    setConfirm('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (authError) throw authError
        if (!data.session) {
          setNotice('Account created. Check your email to confirm it, then sign in.')
          setMode('signin')
          setPassword('')
          setConfirm('')
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (authError) throw authError
      }
    } catch (caught) {
      setError(friendlyAuthError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand">
          <span className="brand-mark">
            <KeyRound size={22} />
          </span>
          <span className="brand-name">PassVault</span>
        </div>
        <h1>
          Every password.
          <br />
          One vault. <span className="gradient-text">Only you.</span>
        </h1>
        <p className="muted">
          Your websites, usernames and passwords — encrypted on your device before they are
          stored. Not even the server can read them.
        </p>
        <ul className="auth-points">
          <li>
            <ShieldCheck size={18} /> AES-256-GCM encryption, key derived from your master
            password
          </li>
          <li>
            <Lock size={18} /> Zero-knowledge: only encrypted blobs leave this device
          </li>
          <li>
            <WifiOff size={18} /> Sign in from any phone, unlock with your master password or
            PIN
          </li>
        </ul>
      </section>

      <form className="card auth-card" onSubmit={submit}>
        <div className="segmented" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'segmented-item active' : 'segmented-item'}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'segmented-item active' : 'segmented-item'}
            onClick={() => switchMode('signup')}
          >
            Create account
          </button>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>

        <label className="field">
          <span>Account password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            ariaLabel="Account password"
          />
        </label>

        {mode === 'signup' ? (
          <label className="field">
            <span>Confirm account password</span>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat the password"
              autoComplete="new-password"
              ariaLabel="Confirm account password"
            />
          </label>
        ) : null}

        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {notice ? <p className="notice-text" role="status">{notice}</p> : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <p className="muted tiny auth-hint">
          Your account password signs you in. You will set a separate master password that
          encrypts the vault.
        </p>
      </form>
    </div>
  )
}
