import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function mediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null
}

function subscribe(onChange: () => void) {
  const mq = mediaQuery()
  mq?.addEventListener('change', onChange)
  return () => mq?.removeEventListener('change', onChange)
}

/** Om användaren bett systemet om reducerade animationer. Följer ändringar direkt. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mediaQuery()?.matches ?? false,
    () => false,
  )
}
