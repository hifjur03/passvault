import { useMemo, useRef, useState } from 'react'
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react'
import type { Entry } from '../lib/vault'
import { EntryModal, type EntryDraft } from './EntryModal'
import { ConfirmModal } from './ConfirmModal'
import { PinSetupModal } from './PinSetupModal'
import { SettingsModal } from './SettingsModal'
import type { ToastTone } from './Toast'

interface VaultScreenProps {
  email: string
  entries: Entry[]
  updatedAt: string | null
  hasPin: boolean
  onSaveEntries: (entries: Entry[]) => Promise<void>
  onLock: () => void
  onSignOut: () => Promise<void>
  onChangeMaster: (current: string, next: string) => Promise<void>
  onSetPin: (pin: string) => Promise<void>
  onRemovePin: () => void
  notify: (message: string, tone?: ToastTone) => void
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
      return true
    }
    const area = document.createElement('textarea')
    area.value = value
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}

export function VaultScreen({
  email,
  entries,
  updatedAt,
  hasPin,
  onSaveEntries,
  onLock,
  onSignOut,
  onChangeMaster,
  onSetPin,
  onRemovePin,
  notify,
}: VaultScreenProps) {
  const [search, setSearch] = useState('')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Entry | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const clipboardTimer = useRef<number | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return entries
    return entries.filter(
      (entry) =>
        entry.site.toLowerCase().includes(query) ||
        entry.username.toLowerCase().includes(query),
    )
  }, [entries, search])

  const copy = async (value: string, label: string) => {
    const ok = await copyToClipboard(value)
    if (!ok) {
      notify('Could not copy to the clipboard.', 'error')
      return
    }
    notify(`${label} copied — clipboard clears in 30 seconds.`)
    if (clipboardTimer.current) window.clearTimeout(clipboardTimer.current)
    clipboardTimer.current = window.setTimeout(() => {
      if (navigator.clipboard && window.isSecureContext) {
        void navigator.clipboard.writeText('').catch(() => {})
      }
    }, 30_000)
  }

  const toggleReveal = (id: string) => {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveEntry = async (draft: EntryDraft) => {
    const now = new Date().toISOString()
    let next: Entry[]
    if (editing) {
      next = entries.map((entry) =>
        entry.id === editing.id ? { ...entry, ...draft, updatedAt: now } : entry,
      )
    } else {
      next = [
        { id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now },
        ...entries,
      ]
    }
    await onSaveEntries(next)
    setEditing(undefined)
    notify(editing ? 'Entry updated.' : 'Password saved.')
  }

  const deleteEntry = async () => {
    if (!deleteTarget) return
    await onSaveEntries(entries.filter((entry) => entry.id !== deleteTarget.id))
    setDeleteTarget(null)
    notify('Entry deleted.')
  }

  const openPinSetup = () => {
    setShowSettings(false)
    setShowPinSetup(true)
  }

  const savePin = async (pin: string) => {
    await onSetPin(pin)
    setShowPinSetup(false)
    notify('Quick-unlock PIN saved on this device.')
  }

  const savedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="vault-page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <KeyRound size={20} />
          </span>
          <span className="brand-name">PassVault</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="icon-btn" onClick={onLock} aria-label="Lock vault" title="Lock vault">
            <Lock size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="vault-main">
        <div className="vault-toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sites or usernames"
              aria-label="Search passwords"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={18} /> Add
          </button>
        </div>

        {!hasPin ? (
          <div className="banner">
            <div className="banner-text">
              <strong>Quick unlock</strong>
              <p className="small">
                Set a 6-digit PIN for this device, so you do not have to type your long master
                password every time.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-small" onClick={openPinSetup}>
              Set up PIN
            </button>
          </div>
        ) : null}

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <KeyRound size={30} />
            </div>
            <h2>No passwords yet</h2>
            <p className="muted">
              Add your first website, email and password. Everything is encrypted on this
              device before it is stored.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
              <Plus size={18} /> Add your first password
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Search size={28} />
            </div>
            <h2>No matches</h2>
            <p className="muted">Nothing matches “{search}”.</p>
          </div>
        ) : (
          <div className="entry-list">
            {filtered.map((entry) => (
              <article className="entry-card" key={entry.id}>
                <div className="entry-avatar" aria-hidden="true">
                  {entry.site.trim().charAt(0).toUpperCase() || '?'}
                </div>
                <div className="entry-main">
                  <div className="entry-top">
                    <h3>{entry.site}</h3>
                    <div className="entry-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditing(entry)}
                        aria-label={`Edit ${entry.site}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label={`Delete ${entry.site}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {entry.username ? (
                    <div className="entry-row">
                      <User size={14} />
                      <span className="entry-value">{entry.username}</span>
                      <button
                        type="button"
                        className="icon-btn small"
                        onClick={() => void copy(entry.username, 'Username')}
                        aria-label={`Copy username for ${entry.site}`}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ) : null}

                  <div className="entry-row">
                    <Lock size={14} />
                    <span className="entry-value mono">
                      {revealed.has(entry.id) ? entry.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      className="icon-btn small"
                      onClick={() => toggleReveal(entry.id)}
                      aria-label={revealed.has(entry.id) ? 'Hide password' : 'Show password'}
                    >
                      {revealed.has(entry.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="icon-btn small"
                      onClick={() => void copy(entry.password, 'Password')}
                      aria-label={`Copy password for ${entry.site}`}
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {entry.notes ? <p className="entry-notes">{entry.notes}</p> : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="vault-foot">
          <span>
            <ShieldCheck size={14} /> {entries.length} {entries.length === 1 ? 'password' : 'passwords'} · end-to-end encrypted
          </span>
          {savedLabel ? <span>Saved {savedLabel}</span> : null}
        </footer>
      </main>

      {editing !== undefined ? (
        <EntryModal entry={editing} onClose={() => setEditing(undefined)} onSave={saveEntry} />
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          title="Delete password?"
          message={`“${deleteTarget.site}” will be removed from your vault on every device. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteEntry}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {showSettings ? (
        <SettingsModal
          email={email}
          hasPin={hasPin}
          onChangeMaster={onChangeMaster}
          onOpenPinSetup={openPinSetup}
          onRemovePin={onRemovePin}
          onLock={onLock}
          onSignOut={onSignOut}
          onClose={() => setShowSettings(false)}
          notify={notify}
        />
      ) : null}

      {showPinSetup ? (
        <PinSetupModal
          isChange={hasPin}
          onSave={savePin}
          onClose={() => setShowPinSetup(false)}
        />
      ) : null}
    </div>
  )
}
