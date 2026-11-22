import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { Reminder } from '../lib/vault'
import { Modal } from './Modal'

export interface ReminderDraft {
  title: string
  description: string
  date: string
  time: string
  repeat: Reminder['repeat']
}

interface ReminderModalProps {
  reminder: Reminder | null
  onClose: () => void
  onSave: (draft: ReminderDraft) => Promise<void>
}

export function ReminderModal({ reminder, onClose, onSave }: ReminderModalProps) {
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [description, setDescription] = useState(reminder?.description ?? '')
  const [date, setDate] = useState(() => reminder?.date ?? new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(() => reminder?.time ?? '09:00')
  const [repeat, setRepeat] = useState<Reminder['repeat']>(reminder?.repeat ?? 'none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the reminder a title.')
      return
    }
    setBusy(true)
    try {
      await onSave({ title: title.trim(), description: description.trim(), date, time, repeat })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this reminder.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={reminder ? 'Edit reminder' : 'New reminder'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save reminder
          </button>
        </>
      }
    >
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Pay electricity bill"
            autoFocus
          />
        </label>
        <label className="field">
          <span>Details</span>
          <textarea
            className="input textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional notes"
            rows={4}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Time</span>
            <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Repeat</span>
          <select className="input" value={repeat} onChange={(event) => setRepeat(event.target.value as Reminder['repeat'])}>
            <option value="none">Does not repeat</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="every2">Every 2 days</option>
            <option value="every3">Every 3 days</option>
            <option value="every4">Every 4 days</option>
            <option value="every5">Every 5 days</option>
            <option value="every6">Every 6 days</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </form>
    </Modal>
  )
}
