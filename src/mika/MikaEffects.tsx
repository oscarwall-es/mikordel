import './mika.css'
import { MikaAudio } from './MikaAudio'
import { MikaDisco } from './MikaDisco'
import { MikaRain } from './MikaRain'
import { useMikaMode } from './useMikaMode'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Mika-mode-effekterna: #1 diskoläge (blinkande neonbakgrund och regn av symboler) och
 * #2 Mikas röst i loop.
 * Renderar ingenting (och kör inga timers) när Mika-mode är av; allt försvinner direkt när
 * läget slås av eftersom komponenterna avmonteras.
 */
export function MikaEffects() {
  const { mikaMode } = useMikaMode()
  const reducedMotion = usePrefersReducedMotion()
  if (!mikaMode) return null
  return (
    <>
      <MikaDisco />
      <MikaAudio />
      <MikaRain key={String(reducedMotion)} reducedMotion={reducedMotion} />
    </>
  )
}
