import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { MIKA_MODE_DEFAULT, MikaModeContext } from './mikaMode'

/**
 * Håller Mika-mode-flaggan i vanligt React-state – medvetet INTE i localStorage, URL eller
 * någon annan lagring. En omladdning startar därför alltid med Mika-mode av.
 */
export function MikaModeProvider({ children }: { children: ReactNode }) {
  const [mikaMode, setMikaMode] = useState(MIKA_MODE_DEFAULT)
  const [audioMuted, setAudioMuted] = useState(false)
  const toggleMikaMode = useCallback(() => {
    setMikaMode((on) => !on)
    // Varje gång läget slås på börjar det med ljud på
    setAudioMuted(false)
  }, [])
  const toggleAudioMuted = useCallback(() => setAudioMuted((muted) => !muted), [])
  const value = useMemo(
    () => ({ mikaMode, toggleMikaMode, audioMuted, toggleAudioMuted }),
    [mikaMode, toggleMikaMode, audioMuted, toggleAudioMuted],
  )
  return <MikaModeContext.Provider value={value}>{children}</MikaModeContext.Provider>
}
