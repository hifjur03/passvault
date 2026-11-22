import { useState, useMemo } from 'react'
import { ArrowLeft, DollarSign, Plus, Search, Settings, Trash2, Pencil, Lock } from 'lucide-react'
import type { Expense } from '../lib/vault'
import { ConfirmModal } from './ConfirmModal'
import { ExpenseModal } from './ExpenseModal'
import type { ToastTone } from './Toast'

interface ExpensesScreenProps {
  expenses: Expense[]
  onSaveExpenses: (expenses: Expense[]) => Promise<void>
  onBack: () => void
  onLock: () => void
  onOpenSettings: () => void
  notify: (message: string, tone?: ToastTone) => void
}

export function ExpensesScreen({
  expenses,
  onSaveExpenses,
  onBack,
  onLock,
  onOpenSettings,
  notify,
}: ExpensesScreenProps) {
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return expenses
    return expenses.filter(
      (expense) =>
        expense.item.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query) ||
        expense.date.includes(query),
    )
  }, [expenses, search])

  const saveExpense = async (draft: { item: string; category: string; amount: number; currency: string; date: string }) => {
    const now = new Date().toISOString()
    const next = editing
      ? expenses.map((expense) =>
          expense.id === editing.id ? { ...expense, ...draft, updatedAt: now } : expense,
        )
      : [{ id: crypto.randomUUID(), ...draft, createdAt: now, updatedAt: now }, ...expenses]
    await onSaveExpenses(next)
    setEditing(undefined)
    notify(editing ? 'Expense updated.' : 'Expense added.')
  }

  const deleteExpense = async () => {
    if (!deleteTarget) return
    await onSaveExpenses(expenses.filter((expense) => expense.id !== deleteTarget.id))
    setDeleteTarget(null)
    notify('Expense deleted.')
  }

  return (
    <div className="expenses-page">
      <header className="expenses-topbar">
        <div className="expenses-left">
          <button type="button" className="back-btn" onClick={onBack} aria-label="Back to home">
            <ArrowLeft size={16} />
            <span>Home</span>
          </button>
          <span className="expenses-title">
            <DollarSign size={18} />
            Expenses
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

      <main className="expenses-main">
        <div className="expenses-summary">
          <span>
            <span className="shield-text">{filtered.length} expense</span>
            {filtered.length !== 1 && <span>s</span>}
          </span>
          <span className="muted tiny">
            {filtered.length > 0
              ? `Total ${filtered.reduce((sum, expense) => sum + (Number.isFinite(expense.amount) ? expense.amount : 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${filtered[0]?.currency ?? 'BDT'}`
              : 'No expenses yet'}
          </span>
        </div>

        <div className="expenses-toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search expenses"
              aria-label="Search expenses"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={18} /> Add
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state expenses-empty">
            <div className="empty-icon">
              <DollarSign size={30} />
            </div>
            <h2>No expenses yet</h2>
            <p className="muted">Track spending — it stays encrypted with your vault.</p>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
              <Plus size={18} /> Add your first expense
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state expenses-empty">
            <div className="empty-icon">
              <Search size={28} />
            </div>
            <h2>No matches</h2>
            <p className="muted">Nothing matches “{search}”.</p>
          </div>
        ) : (
          <div className="expense-list">
            {filtered.map((expense) => (
              <article className="expense-card" key={expense.id}>
                <div className="expense-avatar" aria-hidden="true">
                  <DollarSign size={18} />
                </div>
                <div className="expense-body">
                  <div className="expense-top">
                    <h3 className="expense-item">{expense.item}</h3>
                    <div className="expense-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditing(expense)}
                        aria-label={`Edit ${expense.item}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleteTarget(expense)}
                        aria-label={`Delete ${expense.item}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="expense-meta">
                    <span>{expense.category}</span>
                    <span>{expense.currency} {expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="expense-date">{expense.date}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="vault-foot">
          <span>
            <span className="shield-text">{filtered.length} expense</span>
            {filtered.length !== 1 && <span>s</span>}
          </span>
        </footer>
      </main>

      {editing !== undefined ? (
        <ExpenseModal expense={editing} onClose={() => setEditing(undefined)} onSave={saveExpense} />
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          title="Delete expense?"
          message={`“${deleteTarget.item}” will be deleted from your vault on every device. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteExpense}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  )
}
