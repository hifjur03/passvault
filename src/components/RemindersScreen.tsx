import { useState, useMemo } from 'react'
import { ArrowLeft, CheckCircle, Plus, Search, Settings, Trash2, Pencil, Lock } from 'lucide-react'
import type { Reminder } from '../lib/vault'
import { ConfirmModal } from './ConfirmModal'
import { ReminderModal } from './ReminderModal'
import type { ToastTone } from './Toast'

interface RemindersScreenProps {
  reminders: Reminder[]
  onSaveReminders: (reminders: Reminder[]) => Promise<void>
  onBack: () => void
  onLock: () => void
  onOpenSettings: () => void
  notify: (message: string, tone?: ToastTone) => void
}

function formatDateTime(reminder: Reminder): string {
  const base = `${reminder.date} ${reminder.time}`
  const label = repeatLabel(reminder.repeat)
  return label ? `${base} · ${label}` : base
}

function repeatLabel(repeat: Reminder['repeat']): string {
  switch (repeat) {
    case 'hourly':
      return 'Hourly'
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'every2':
      return 'Every 2 days'
    case 'every3':
      return 'Every 3 days'
    case 'every4':
      return 'Every 4 days'
    case 'every5':
      return 'Every 5 days'
    case 'every6':
      return 'Every 6 days'
    case 'monthly':
      return 'Monthly'
    case 'yearly':
      return 'Yearly'
    default:
      return ''
  }
}

export function RemindersScreen({
  reminders,
  onSaveReminders,
  onBack,
  onLock,
  onOpenSettings,
  notify,
}: RemindersScreenProps) {
  const [editing, setEditing] = useState<Reminder | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return reminders
    return reminders.filter(
      (reminder) =>
        reminder.title.toLowerCase().includes(query) ||
        reminder.description.toLowerCase().includes(query) ||
        reminder.date.includes(query),
    )
  }, [reminders, search])

  const doneList = filtered.filter((r) => r.done).length

  const saveReminder = async (draft: { title: string; description: string; date: string; time: string; repeat: Reminder['repeat'] }) => {
    const now = new Date().toISOString()
    const next = editing
      ? reminders.map((reminder) =>
          reminder.id === editing.id ? { ...reminder, ...draft, updatedAt: now } : reminder,
        )
      : [
          {
            id: crypto.randomUUID(),
            ...draft,
            done: false,
            createdAt: now,
            updatedAt: now,
          },
          ...reminders,
        ]
    try {
      await onSaveReminders(next)
      setEditing(undefined)
      notify(editing ? 'Reminder updated.' : 'Reminder added.')
    } catch {
      notify('Unlock your vault first to save reminders.', 'error')
    }
  }

  const toggleDone = async (id: string, current: boolean) => {
    const next = reminders.map((reminder) =>
      reminder.id === id ? { ...reminder, done: !current, updatedAt: new Date().toISOString() } : reminder,
    )
    await onSaveReminders(next)
  }

  const deleteReminder = async () => {
    if (!deleteTarget) return
    await onSaveReminders(reminders.filter((reminder) => reminder.id !== deleteTarget.id))
    setDeleteTarget(null)
    notify('Reminder deleted.')
  }

  return (
    <div className="reminders-page">
      <header className="reminders-topbar">
        <div className="reminders-left">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Back to home">
            <ArrowLeft size={16} />
            <span>Home</span>
          </button>
          <span className="reminders-title">
            <CheckCircle size={18} />
            Reminders
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

      <main className="reminders-main">
        <div className="reminders-summary">
          <span>
            {doneList} of {filtered.length} done
          </span>
          <span className="muted tiny">{filtered.length === 0 ? 'Create your first reminder' : ''}</span>
        </div>

        <div className="reminders-toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reminders"
              aria-label="Search reminders"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={18} /> Add
          </button>
        </div>

        {reminders.length === 0 ? (
          <div className="empty-state reminders-empty">
            <div className="empty-icon">
              <CheckCircle size={30} />
            </div>
            <h2>No reminders yet</h2>
            <p className="muted">Set a date & time, or repeat it — your reminder stays encrypted with your vault.</p>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
              <Plus size={18} /> Add your first reminder
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state reminders-empty">
            <div className="empty-icon">
              <Search size={28} />
            </div>
            <h2>No matches</h2>
            <p className="muted">Nothing matches “{search}”.</p>
          </div>
        ) : (
          <div className="reminder-list">
            {filtered.map((reminder) => (
              <article className="reminder-card" key={reminder.id}>
                <div className="reminder-body">
                  <div className="reminder-header">
                    <h3 className="reminder-title">{reminder.title}</h3>
                    <div className="reminder-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditing(reminder)}
                        aria-label={`Edit ${reminder.title}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleteTarget(reminder)}
                        aria-label={`Delete ${reminder.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {reminder.description ? (
                    <p className="reminder-desc">{reminder.description}</p>
                  ) : (
                    <p className="reminder-desc muted">No details yet…</p>
                  )}
                  <div className="reminder-meta">
                    <span>{formatDateTime(reminder)}</span>
                    <button
                      type="button"
                      className={`done-btn ${reminder.done ? 'done' : ''}`}
                      onClick={() => void toggleDone(reminder.id, reminder.done)}
                      aria-label={reminder.done ? 'Mark as undone' : 'Mark as done'}
                    >
                      {reminder.done ? <CheckCircle size={16} fill="currentColor" /> : <Circle size={16} stroke="currentColor" strokeWidth={2} />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="vault-foot">
          <span>
            <span className="shield-text">{filtered.length} reminder</span>
            {filtered.length !== 1 && <span>s</span>} · end-to-end encrypted
          </span>
        </footer>
      </main>

      {editing !== undefined ? (
        <ReminderModal reminder={editing} onClose={() => setEditing(undefined)} onSave={saveReminder} />
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          title="Delete reminder?"
          message={`“${deleteTarget.title}” will be deleted from your vault on every device. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteReminder}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}

function Circle(props: { size?: number; fill?: string; stroke?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={props.size}
      height={props.size}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
