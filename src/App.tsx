import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthScreen } from './components/AuthScreen'
import { SetupScreen } from './components/SetupScreen'
import { UnlockScreen } from './components/UnlockScreen'
import { VaultScreen } from './components/VaultScreen'
import { HomeScreen } from './components/HomeScreen'
import { NotesScreen } from './components/NotesScreen'
import { RemindersScreen } from './components/RemindersScreen'
import { ExpensesScreen } from './components/ExpensesScreen'
import { SettingsModal } from './components/SettingsModal'
import { PinSetupModal } from './components/PinSetupModal'
import { Toast, type ToastState, type ToastTone } from './components/Toast'
import { useAutoLock } from './hooks/useAutoLock'
import {
  createSalt,
  createVerifier,
  decryptJson,
  deriveMasterKey,
  encryptJson,
  fromBase64,
  MASTER_ITERATIONS,
  toBase64,
  unwrapKeyWithPin,
  verifyKey,
  wrapKeyWithPin,
} from './lib/crypto'
import {
  clearPinWrap,
  getPinAttempts,
  loadPinWrap,
  MAX_PIN_ATTEMPTS,
  recordPinFailure,
  resetPinAttempts,
  savePinWrap,
} from './lib/pin'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  createVault,
  deleteVault,
  fetchVault,
  updateVault,
  VaultConflictError,
  type Entry,
  type Note,
  type Reminder,
  type Expense,
  type VaultData,
  type VaultRow,
} from './lib/vault'
import type { Screen } from './types'

const emptyVault = (): VaultData => ({ entries: [], notes: [], reminders: [], expenses: [] })

type Status =
  | 'boot'
  | 'signedOut'
  | 'loading'
  | 'setup'
  | 'locked'
  | 'unlocked'
  | 'error'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [status, setStatus] = useState<Status>('boot')
  const [row, setRow] = useState<VaultRow | null>(null)
  const [data, setData] = useState<VaultData>(emptyVault)
  const [key, setKey] = useState<CryptoKey | null>(null)
  const [hasPin, setHasPin] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [showSettings, setShowSettings] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadNonce, setReloadNonce] = useState(0)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | null>(null)

  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const notify = useCallback((message: string, tone: ToastTone = 'ok') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, tone })
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const userId = session?.user.id ?? null
  const email = session?.user.email ?? ''

  useEffect(() => {
    let mounted = true

    void supabase.auth
      .getSession()
      .then(({ data: sessionData }) => {
        if (!mounted) return
        setSession(sessionData.session)
        setAuthReady(true)
      })
      .catch(() => {
        if (!mounted) return
        setAuthReady(true)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setKey(null)
        setData(emptyVault())
        setRow(null)
        setHasPin(false)
        setScreen('home')
        setStatus('signedOut')
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    let active = true
    setStatus('loading')
    setLoadError('')

    fetchVault(userId)
      .then((vault) => {
        if (!active) return
        setRow(vault)
        setHasPin(loadPinWrap(userId) !== null)
        setStatus(vault ? 'locked' : 'setup')
      })
      .catch((caught) => {
        if (!active) return
        setLoadError(caught instanceof Error ? caught.message : 'Could not load your vault.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [userId, reloadNonce])

  const finishUnlock = useCallback(
    async (vaultKey: CryptoKey, vaultRow: VaultRow, nextScreen: Screen = 'home') => {
      let vaultData: VaultData = emptyVault()
      if (vaultRow.data && vaultRow.data_iv) {
        vaultData = await decryptJson<VaultData>(vaultKey, {
          iv: vaultRow.data_iv,
          data: vaultRow.data,
        })
      }
      setKey(vaultKey)
      setRow(vaultRow)
      setData({
        entries: vaultData.entries ?? [],
        notes: vaultData.notes ?? [],
        reminders: (vaultData.reminders ?? []).map((reminder) => ({
          ...reminder,
          repeat: reminder.repeat ?? 'none',
        })),
        expenses: vaultData.expenses ?? [],
      })
      setScreen(nextScreen)
      setStatus('unlocked')
    },
    [],
  )

  const unlockWithMaster = async (password: string) => {
    if (!row) throw new Error('Vault is not loaded yet.')
    const derived = await deriveMasterKey(password, fromBase64(row.salt), MASTER_ITERATIONS)
    const valid = await verifyKey(derived, { iv: row.verifier_iv, data: row.verifier })
    if (!valid) throw new Error('Incorrect master password.')
    await finishUnlock(derived, row, screen)
  }

  const unlockWithPin = async (pin: string) => {
    if (!userId || !row) throw new Error('Vault is not loaded yet.')

    const wrap = loadPinWrap(userId)
    if (!wrap) {
      setHasPin(false)
      throw new Error('No PIN is set on this device. Use your master password.')
    }
    if (getPinAttempts(userId) >= MAX_PIN_ATTEMPTS) {
      clearPinWrap(userId)
      setHasPin(false)
      throw new Error('Too many wrong attempts. Use your master password.')
    }

    try {
      const derived = await unwrapKeyWithPin(pin, wrap)
      const valid = await verifyKey(derived, { iv: row.verifier_iv, data: row.verifier })
      if (!valid) throw new Error('Wrong PIN.')
      resetPinAttempts(userId)
      await finishUnlock(derived, row, screen)
    } catch {
      const attempts = recordPinFailure(userId)
      if (attempts >= MAX_PIN_ATTEMPTS) {
        clearPinWrap(userId)
        setHasPin(false)
        throw new Error(
          'Too many wrong attempts. The PIN was removed — use your master password.',
        )
      }
      const left = MAX_PIN_ATTEMPTS - attempts
      throw new Error(`Wrong PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`)
    }
  }

  const setupVault = async (masterPassword: string) => {
    if (!userId) throw new Error('You are not signed in.')
    const salt = createSalt()
    const derived = await deriveMasterKey(masterPassword, salt)
    const verifier = await createVerifier(derived)
    const initialData: VaultData = emptyVault()
    const payload = await encryptJson(derived, initialData)
    const created = await createVault(userId, toBase64(salt), verifier, payload)
    setKey(derived)
    setRow(created)
    setData(initialData)
    setScreen('home')
    setStatus('unlocked')
  }

  const saveVaultData = useCallback(
    async (next: VaultData) => {
      if (!key || !row) throw new Error('The vault is locked.')

      const payload = await encryptJson(key, next)
      try {
        const updated = await updateVault(row.user_id, row.version, { data: payload })
        setRow(updated)
        setData(next)
      } catch (caught) {
        if (caught instanceof VaultConflictError) {
          const latest = await fetchVault(row.user_id)
          if (latest) {
            const decrypted =
              latest.data && latest.data_iv
                ? await decryptJson<VaultData>(key, {
                    iv: latest.data_iv,
                    data: latest.data,
                  })
                : emptyVault()
            setRow(latest)
            setData(decrypted)
          }
          throw new Error(
            'This vault was changed on another device. The latest data is loaded — please try again.',
          )
        }
        throw caught
      }
    },
    [key, row],
  )

  const saveEntries = useCallback(
    (entries: Entry[]) => saveVaultData({ ...dataRef.current, entries }),
    [saveVaultData],
  )

  const saveNotes = useCallback(
    (notes: Note[]) => saveVaultData({ ...dataRef.current, notes }),
    [saveVaultData],
  )

  const saveReminders = useCallback(
    (reminders: Reminder[]) => saveVaultData({ ...dataRef.current, reminders }),
    [saveVaultData],
  )

  const saveExpenses = useCallback(
    (expenses: Expense[]) => saveVaultData({ ...dataRef.current, expenses }),
    [saveVaultData],
  )

  const changeMaster = async (currentPassword: string, nextPassword: string) => {
    if (!key || !row || !userId) throw new Error('The vault is locked.')

    const currentKey = await deriveMasterKey(
      currentPassword,
      fromBase64(row.salt),
      MASTER_ITERATIONS,
    )
    const valid = await verifyKey(currentKey, { iv: row.verifier_iv, data: row.verifier })
    if (!valid) throw new Error('Current master password is incorrect.')

    const salt = createSalt()
    const nextKey = await deriveMasterKey(nextPassword, salt)
    const verifier = await createVerifier(nextKey)
    const payload = await encryptJson(nextKey, dataRef.current)
    const updated = await updateVault(row.user_id, row.version, {
      salt: toBase64(salt),
      verifier,
      data: payload,
    })

    clearPinWrap(userId)
    setHasPin(false)
    setKey(nextKey)
    setRow(updated)
  }

  const setupPin = async (pin: string) => {
    if (!key || !userId) throw new Error('The vault is locked.')
    const wrap = await wrapKeyWithPin(key, pin)
    savePinWrap(userId, wrap)
    setHasPin(true)
  }

  const removePin = () => {
    if (userId) clearPinWrap(userId)
    setHasPin(false)
  }

  const resetVault = async () => {
    if (!userId) return
    await deleteVault(userId)
    clearPinWrap(userId)
    setHasPin(false)
    setKey(null)
    setRow(null)
    setData(emptyVault())
    setStatus('setup')
    setScreen('home')
  }

  const signOut = async () => {
    if (userId) clearPinWrap(userId)
    setHasPin(false)
    setKey(null)
    setData(emptyVault())
    setRow(null)
    setScreen('home')
    setStatus('signedOut')
    try {
      await supabase.auth.signOut()
    } catch {
      // The local session is cleared above either way.
    }
  }

  const lock = useCallback(() => {
    setKey(null)
    setData(emptyVault())
    setScreen('home')
    setStatus('locked')
  }, [])

  const navigate = useCallback((target: Screen) => setScreen(target), [])

  useAutoLock(status === 'unlocked', lock)

  if (!isSupabaseConfigured) return <ConfigNotice />
  if (!authReady) return <Splash />
  if (!userId || status === 'signedOut') return <AuthScreen />

  if (status === 'setup') {
    return <SetupScreen email={email} onSubmit={setupVault} onSignOut={signOut} />
  }

  if (status === 'error') {
    return (
      <div className="centered-page">
        <div className="card setup-card">
          <h1>Could not load the vault</h1>
          <p className="error-text">{loadError}</p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => setReloadNonce((value) => value + 1)}
          >
            Try again
          </button>
          <button type="button" className="link-btn muted-link" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (status === 'locked') {
    // The dashboard is browsable without a password. Only the password manager
    // asks for the master password / PIN when it is entered.
    if (screen === 'passwords') {
      return (
        <UnlockScreen
          email={email}
          hasPin={hasPin}
          onUnlockMaster={unlockWithMaster}
          onUnlockPin={unlockWithPin}
          onResetVault={resetVault}
          onSignOut={signOut}
        />
      )
    }

    if (screen === 'home') {
      return (
        <HomeScreen
          email={email}
          entries={data.entries}
          notes={data.notes}
          reminders={data.reminders}
          expenses={data.expenses}
          onNavigate={navigate}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
        />
      )
    }

    if (screen === 'notes') {
      return (
        <NotesScreen
          notes={data.notes}
          onSaveNotes={saveNotes}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          notify={notify}
        />
      )
    }

    if (screen === 'reminders') {
      return (
        <RemindersScreen
          reminders={data.reminders}
          onSaveReminders={saveReminders}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          notify={notify}
        />
      )
    }

    if (screen === 'expenses') {
      return (
        <ExpensesScreen
          expenses={data.expenses}
          onSaveExpenses={saveExpenses}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          notify={notify}
        />
      )
    }

    return (
      <HomeScreen
        email={email}
        entries={data.entries}
        notes={data.notes}
        reminders={data.reminders}
        expenses={data.expenses}
        onNavigate={navigate}
        onLock={lock}
        onOpenSettings={() => setShowSettings(true)}
      />
    )
  }

  // Unlocked
  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          email={email}
          entries={data.entries}
          notes={data.notes}
          reminders={data.reminders}
          expenses={data.expenses}
          onNavigate={navigate}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      {screen === 'passwords' && (
        <VaultScreen
          entries={data.entries}
          onSaveEntries={saveEntries}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          onOpenPinSetup={() => {
            setShowSettings(false)
            setShowPinSetup(true)
          }}
          hasPin={hasPin}
          notify={notify}
        />
      )}
      {screen === 'notes' && (
        <NotesScreen
          notes={data.notes}
          onSaveNotes={saveNotes}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          notify={notify}
        />
      )}

      {screen === 'reminders' && (
        <RemindersScreen
          reminders={data.reminders}
          onSaveReminders={saveReminders}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          notify={notify}
        />
      )}
      {screen === 'expenses' && (
        <ExpensesScreen
          expenses={data.expenses}
          onSaveExpenses={saveExpenses}
          onBack={() => setScreen('home')}
          onLock={lock}
          onOpenSettings={() => setShowSettings(true)}
          notify={notify}
        />
      )}

      {showSettings ? (
        <SettingsModal
          email={email}
          hasPin={hasPin}
          onChangeMaster={changeMaster}
          onOpenPinSetup={() => {
            setShowPinSetup(true)
          }}
          onRemovePin={removePin}
          onLock={lock}
          onSignOut={signOut}
          onClose={() => setShowSettings(false)}
          notify={notify}
        />
      ) : null}

      {showPinSetup ? (
        <PinSetupModal isChange={hasPin} onSave={setupPin} onClose={() => setShowPinSetup(false)} />
      ) : null}

      <Toast toast={toast} />
    </>
  )
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo">
        <span className="brand-mark large">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <circle cx="12" cy="9" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 13.5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17h3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      <p className="muted small">Decrypting your vault…</p>
    </div>
  )
}

function ConfigNotice() {
  return (
    <div className="centered-page">
      <div className="card setup-card">
        <h1>Connect Supabase</h1>
        <p className="muted small">
          This build has no Supabase credentials yet. Create a project at supabase.com, run{' '}
          <code>supabase/schema.sql</code> in the SQL editor, then add the values to{' '}
          <code>.env.local</code>:
        </p>
        <pre className="code-block">{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}</pre>
        <p className="muted tiny">
          Restart <code>pnpm dev</code> after saving. The anon key is safe to ship because row
          level security is enabled and the vault is encrypted client-side.
        </p>
      </div>
    </div>
  )
}
