import {
  Bell,
  Lock,
  Settings,
  StickyNote,
  Wallet,
  KeyRound,
} from 'lucide-react'
import type { Entry, Note, Reminder, Expense } from '../lib/vault'
import type { Screen } from '../types'

type HomeModuleId = 'passwords' | 'notes' | 'reminders' | 'expenses'

interface HomeScreenProps {
  email: string
  entries: Entry[]
  notes: Note[]
  reminders: Reminder[]
  expenses: Expense[]
  onNavigate: (screen: Screen) => void
  onLock: () => void
  onOpenSettings: () => void
}

interface Module {
  id: HomeModuleId
  title: string
  description: string
  icon: typeof KeyRound
  count: number
  ready: boolean
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.length <= 2 ? local : local.slice(0, 2) + '***'
  return `${visible}@${domain}`
}

export function HomeScreen({
  email,
  entries,
  notes,
  reminders,
  expenses,
  onNavigate,
  onLock,
  onOpenSettings,
}: HomeScreenProps) {
  const navigateTo = (id: HomeModuleId) => {
    onNavigate(id)
  }

  const modules: Module[] = [
    {
      id: 'passwords',
      title: 'Passwords',
      description: 'Websites, emails and logins, encrypted',
      icon: KeyRound,
      count: entries.length,
      ready: true,
    },
    {
      id: 'notes',
      title: 'Notes',
      description: 'Private encrypted notes',
      icon: StickyNote,
      count: notes.length,
      ready: true,
    },
    {
      id: 'reminders',
      title: 'Reminders',
      description: 'Private encrypted reminders',
      icon: Bell,
      count: reminders.length,
      ready: true,
    },
    {
      id: 'expenses',
      title: 'Expenses',
      description: 'Private encrypted expenses',
      icon: Wallet,
      count: expenses.length,
      ready: true,
    },
  ]

  return (
    <div className="home-page">
      <header className="home-topbar">
        <span className="brand">
          <span className="brand-mark">
            <KeyRound size={18} />
          </span>
          <span className="brand-name">PassVault</span>
        </span>
        <div className="topbar-right">
          <button type="button" className="icon-btn" onClick={onLock} aria-label="Lock vault">
            <Lock size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-greeting">
          <h1>Welcome back</h1>
          <p className="muted small">
            Everything you store here is encrypted on your device.
            {'\n'}
            Signed in as <strong>{maskEmail(email)}</strong>
          </p>
        </section>

        <section className="modules-grid" aria-label="Modules">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={module.ready ? 'module-card' : 'module-card disabled'}
              onClick={module.ready ? () => navigateTo(module.id) : undefined}
              aria-disabled={!module.ready}
            >
              <div className={`module-icon ${module.id}`}>
                <module.icon size={22} />
              </div>
              <div className="module-body">
                <div className="module-header">
                  <span className="module-title">{module.title}</span>
                  <span className={`module-status ${module.id}`}>
                    {module.ready ? (module.count > 0 ? `${module.count} saved` : 'Add first') : 'Coming soon'}
                  </span>
                </div>
                <p className="module-desc">{module.description}</p>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  )
}
