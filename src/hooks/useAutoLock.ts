import { useEffect } from 'react'

/**
 * Locks the vault after a period of inactivity, and when the tab has been in
 * the background for a while.
 */
export function useAutoLock(
  active: boolean,
  onLock: () => void,
  idleMs = 5 * 60_000,
  hiddenLockMs = 2 * 60_000,
) {
  useEffect(() => {
    if (!active) return

    let timer = 0
    let hiddenAt = 0

    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(onLock, idleMs)
    }

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'touchstart',
      'mousemove',
    ]
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        window.clearTimeout(timer)
      } else if (hiddenAt && Date.now() - hiddenAt > hiddenLockMs) {
        onLock()
      } else {
        reset()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    reset()

    return () => {
      window.clearTimeout(timer)
      for (const event of events) {
        window.removeEventListener(event, reset)
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active, onLock, idleMs, hiddenLockMs])
}
