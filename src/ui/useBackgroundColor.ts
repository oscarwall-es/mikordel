import { useLayoutEffect, useState } from 'react'
import { loadBackgroundColor, pageColorsFor, saveBackgroundColor } from './colors'

/**
 * Appens bakgrundsfärg. Sparas i localStorage och speglas till CSS-variabler på <html>,
 * så att allt som använder `bg-page`, `text-on-page` osv. följer med.
 */
export function useBackgroundColor() {
  const [color, setColor] = useState(loadBackgroundColor)

  // Layout-effekt: färgen sätts innan första målningen, så standardfärgen inte blinkar förbi.
  useLayoutEffect(() => {
    const colors = pageColorsFor(color)
    const root = document.documentElement.style
    root.setProperty('--color-page', colors.background)
    root.setProperty('--color-on-page', colors.text)
    root.setProperty('--color-on-page-muted', colors.muted)
    root.setProperty('--component-edge', colors.componentEdge)
    root.setProperty('--active-ring', colors.activeRing)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.background)
    saveBackgroundColor(colors.background)
  }, [color])

  return [color, setColor] as const
}
