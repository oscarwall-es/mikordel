import './mika.css'
import { MikaDisco } from './MikaDisco'
import { MikaRain } from './MikaRain'
import { useMikaMode } from './useMikaMode'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Mika-mode-idé #1: diskoläge – blinkande neonbakgrund och ett kontinuerligt regn av symboler.
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
      <MikaRain key={String(reducedMotion)} reducedMotion={reducedMotion} />
    </>
  )
}
