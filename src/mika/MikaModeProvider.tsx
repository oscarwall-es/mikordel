import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setMikaAudioMuted, startMikaAudio, stopMikaAudio } from './audioPlayer'
import { MIKA_MODE_DEFAULT, MikaModeContext } from './mikaMode'

/**
 * Håller Mika-mode-flaggan i vanligt React-state – medvetet INTE i localStorage, URL eller
 * någon annan lagring. En omladdning startar därför alltid med Mika-mode av.
 */
export function MikaModeProvider({ children }: { children: ReactNode }) {
  const [mikaMode, setMikaMode] = useState(MIKA_MODE_DEFAULT)
  const [audioMuted, setAudioMuted] = useState(false)

  const toggleMikaMode = useCallback(() => {
    const next = !mikaMode
    // Ljudet startas/stoppas här, synkront i klickhanteraren – iOS Safari kräver att
    // uppspelning startar inom användarens gest, inte i en effekt efter omrendering.
    if (next) startMikaAudio(false)
    else stopMikaAudio()
    setMikaMode(next)
    // Varje gång läget slås på börjar det med ljud på
    setAudioMuted(false)
  }, [mikaMode])

  const toggleAudioMuted = useCallback(() => {
    const next = !audioMuted
    setMikaAudioMuted(next) // direkt i gesten, via `muted` (fungerar på iOS)
    setAudioMuted(next)
  }, [audioMuted])

  // Om providern avmonteras (t.ex. i tester) ska inget ljud leva kvar
  useEffect(() => stopMikaAudio, [])

  const value = useMemo(
    () => ({ mikaMode, toggleMikaMode, audioMuted, toggleAudioMuted }),
    [mikaMode, toggleMikaMode, audioMuted, toggleAudioMuted],
  )
  return <MikaModeContext.Provider value={value}>{children}</MikaModeContext.Provider>
}
