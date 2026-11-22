import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  name?: string
  disabled?: boolean
  ariaLabel?: string
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = 'off',
  autoFocus,
  name,
  disabled,
  ariaLabel,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="input-wrap">
      <input
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        spellCheck={false}
        autoCapitalize="off"
      />
      <button
        type="button"
        className="input-adornment"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}
