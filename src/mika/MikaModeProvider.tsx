import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { startMikaAudio, startMikaInterrupt, stopMikaAudio } from './audioPlayer'
import { MIKA_MODE_DEFAULT, MikaModeContext } from './mikaMode'

/**
 * Håller Mika-mode-flaggan i vanligt React-state – medvetet INTE i localStorage, URL eller
 * någon annan lagring. En omladdning startar därför alltid med Mika-mode av.
 */
export function MikaModeProvider({ children }: { children: ReactNode }) {
  const [mikaMode, setMikaMode] = useState(MIKA_MODE_DEFAULT)
  const [interrupting, setInterrupting] = useState(false)

  const toggleMikaMode = useCallback(() => {
    const next = !mikaMode
    // Ljudet startas/stoppas här, synkront i klickhanteraren – iOS Safari kräver att
    // uppspelning startar inom användarens gest, inte i en effekt efter omrendering.
    // stopMikaAudio() stoppar även ett pågående avbrott.
    if (next) startMikaAudio()
    else stopMikaAudio()
    setMikaMode(next)
    setInterrupting(false)
  }, [mikaMode])

  const startInterrupt = useCallback(() => {
    // Bara när läget är på, och aldrig ovanpå ett pågående avbrott
    if (!mikaMode || interrupting) return
    // Startas direkt i gesten (iOS); när avbrottsspåret tagit slut återgår knappen
    if (startMikaInterrupt(() => setInterrupting(false))) setInterrupting(true)
  }, [mikaMode, interrupting])

  // Om providern avmonteras (t.ex. i tester) ska inget ljud leva kvar
  useEffect(() => stopMikaAudio, [])

  const value = useMemo(
    () => ({ mikaMode, toggleMikaMode, interrupting, startInterrupt }),
    [mikaMode, toggleMikaMode, interrupting, startInterrupt],
  )
  return <MikaModeContext.Provider value={value}>{children}</MikaModeContext.Provider>
}
