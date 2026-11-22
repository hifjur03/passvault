import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import type { Expense } from '../lib/vault'
import { Modal } from './Modal'

export interface ExpenseDraft {
  item: string
  category: string
  amount: number
  currency: string
  date: string
}

interface ExpenseModalProps {
  expense: Expense | null
  onClose: () => void
  onSave: (draft: ExpenseDraft) => Promise<void>
}

export function ExpenseModal({ expense, onClose, onSave }: ExpenseModalProps) {
  const [item, setItem] = useState(expense?.item ?? '')
  const [category, setCategory] = useState(expense?.category ?? '')
  const [amount, setAmount] = useState<number>(expense?.amount ?? 0)
  const [currency, setCurrency] = useState(expense?.currency ?? 'BDT')
  const [date, setDate] = useState(() => expense?.date ?? new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!item.trim()) {
      setError('Give the expense a name.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    try {
      await onSave({ item: item.trim(), category: category.trim() || 'General', amount, currency: currency.trim() || 'BDT', date })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this expense.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={expense ? 'Edit expense' : 'New expense'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save expense
          </button>
        </>
      }
    >
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Item</span>
          <input className="input" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Grocery store" autoFocus />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Category</span>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Food" />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={amount === 0 ? '' : amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Currency</span>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="BDT" />
          </label>
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </form>
    </Modal>
  )
}
