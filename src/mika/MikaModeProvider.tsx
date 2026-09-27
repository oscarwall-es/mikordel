import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { MIKA_MODE_DEFAULT, MikaModeContext } from './mikaMode'

/**
 * Håller Mika-mode-flaggan i vanligt React-state – medvetet INTE i localStorage, URL eller
 * någon annan lagring. En omladdning startar därför alltid med Mika-mode av.
 */
export function MikaModeProvider({ children }: { children: ReactNode }) {
  const [mikaMode, setMikaMode] = useState(MIKA_MODE_DEFAULT)
  const toggleMikaMode = useCallback(() => setMikaMode((on) => !on), [])
  const value = useMemo(() => ({ mikaMode, toggleMikaMode }), [mikaMode, toggleMikaMode])
  return <MikaModeContext.Provider value={value}>{children}</MikaModeContext.Provider>
}
