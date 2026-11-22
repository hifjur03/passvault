import { useState } from 'react'
import { Modal } from './Modal'
import { PinPad } from './PinPad'

interface PinSetupModalProps {
  isChange: boolean
  onSave: (pin: string) => Promise<void>
  onClose: () => void
}

export function PinSetupModal({ isChange, onSave, onClose }: PinSetupModalProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create')
  const [firstPin, setFirstPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetSignal, setResetSignal] = useState(0)

  const handleComplete = async (pin: string) => {
    setError('')
    if (step === 'create') {
      setFirstPin(pin)
      setStep('confirm')
      setResetSignal((current) => current + 1)
      return
    }

    if (pin !== firstPin) {
      setError('The PINs do not match. Start again.')
      setStep('create')
      setFirstPin('')
      setResetSignal((current) => current + 1)
      return
    }

    setBusy(true)
    try {
      await onSave(pin)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the PIN.')
      setStep('create')
      setFirstPin('')
      setResetSignal((current) => current + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isChange ? 'Change quick-unlock PIN' : 'Set up quick unlock'}
      subtitle="The PIN only unlocks this device. Your vault is still protected by your master password."
      onClose={onClose}
    >
      <PinPad
        key={resetSignal}
        title={step === 'create' ? 'Choose a 6-digit PIN' : 'Confirm your PIN'}
        subtitle={step === 'create' ? 'Used only on this device' : 'Enter the same PIN again'}
        error={error}
        busy={busy}
        onComplete={(pin) => void handleComplete(pin)}
        footer={
          <button type="button" className="link-btn muted-link" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        }
      />
    </Modal>
  )
}
