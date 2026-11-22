import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Delete, Lock } from 'lucide-react'
import { PIN_LENGTH } from '../lib/crypto'

interface PinPadProps {
  title: string
  subtitle?: string
  error?: string
  busy?: boolean
  onComplete: (pin: string) => void
  footer?: ReactNode
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function PinPad({
  title,
  subtitle,
  error,
  busy,
  onComplete,
  footer,
}: PinPadProps) {
  const [pin, setPin] = useState('')
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      onCompleteRef.current(pin)
    }
  }, [pin])

  const addDigit = (digit: string) => {
    if (busy) return
    setPin((current) => (current.length < PIN_LENGTH ? current + digit : current))
  }

  const removeDigit = () => {
    if (busy) return
    setPin((current) => current.slice(0, -1))
  }

  return (
    <div className="pin-card">
      <div className="pin-icon">
        <Lock size={26} />
      </div>
      <h1 className="pin-title">{title}</h1>
      {subtitle ? <p className="muted small pin-subtitle">{subtitle}</p> : null}

      <div className="pin-dots" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span key={index} className={index < pin.length ? 'pin-dot filled' : 'pin-dot'} />
        ))}
      </div>

      <div className="pin-message" aria-live="polite">
        {error ? <span className="error-text">{error}</span> : <span>&nbsp;</span>}
      </div>

      <div className="pin-pad">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="pin-btn"
            onClick={() => addDigit(digit)}
            disabled={busy}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          className="pin-btn pin-btn-muted"
          onClick={removeDigit}
          disabled={busy || pin.length === 0}
          aria-label="Delete digit"
        >
          <Delete size={20} />
        </button>
        <button type="button" className="pin-btn" onClick={() => addDigit('0')} disabled={busy}>
          0
        </button>
        <button
          type="button"
          className="pin-btn pin-btn-muted"
          onClick={() => setPin('')}
          disabled={busy || pin.length === 0}
          aria-label="Clear"
        >
          Clear
        </button>
      </div>

      {footer ? <div className="pin-footer">{footer}</div> : null}
    </div>
  )
}
