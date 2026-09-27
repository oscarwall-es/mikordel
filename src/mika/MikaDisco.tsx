import { useEffect, useLayoutEffect, useState } from 'react'
import { pageColorsFor } from '../ui/colors'
import { DISCO_COLORS, discoTiming, nextDiscoIndex } from './disco'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** Alla diskofärger är ljusa – samma mörka text och ikoner passar alla, så texten blinkar inte. */
const DISCO_PAGE = pageColorsFor(DISCO_COLORS[0])

const BODY_OVERRIDES: Record<string, string> = {
  // Bodyns egen bakgrund görs genomskinlig så att diskolagret bakom appen syns
  'background-color': 'transparent',
  '--color-on-page': DISCO_PAGE.text,
  '--color-on-page-muted': DISCO_PAGE.muted,
  '--component-edge': DISCO_PAGE.componentEdge,
  '--active-ring': DISCO_PAGE.activeRing,
}

/**
 * Diskolampa: bakgrunden tonar mellan neonfärger, högst ett byte per DISCO_INTERVAL_MS
 * (aldrig oftare än 3 per sekund, se disco.ts). Med prefers-reduced-motion står färgen still.
 */
export function MikaDisco() {
  const reducedMotion = usePrefersReducedMotion()
  const { intervalMs, fadeMs } = discoTiming(reducedMotion)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (intervalMs === null) return
    const timer = setInterval(() => setIndex(nextDiscoIndex), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  // Layout-effekt: sätts och tas bort i samma bildruta som lagret, utan övertoning åt något håll
  useLayoutEffect(() => {
    const style = document.body.style
    style.setProperty('transition', 'none')
    for (const [prop, value] of Object.entries(BODY_OVERRIDES)) style.setProperty(prop, value)
    return () => {
      for (const prop of Object.keys(BODY_OVERRIDES)) style.removeProperty(prop)
      // Tvinga fram stilberäkning innan transition släpps, så återgången sker direkt
      void document.body.offsetHeight
      style.removeProperty('transition')
    }
  }, [])

  const color = DISCO_COLORS[reducedMotion ? 0 : index]
  return (
    <div
      aria-hidden="true"
      data-mika-disco={color}
      className="mika-layer mika-disco"
      style={{ backgroundColor: color, transition: fadeMs > 0 ? `background-color ${fadeMs}ms linear` : 'none' }}
    />
  )
}
