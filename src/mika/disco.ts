/**
 * Diskolampan i Mika-mode: färger och tempo, med inbyggda säkerhetsgränser.
 *
 * Fotosensitiv epilepsi: WCAG 2.3.1 sätter gränsen vid tre blinkningar per sekund.
 * Bakgrunden byter därför aldrig färg oftare än var MIN_FLASH_INTERVAL_MS, och varje byte
 * är en mjuk övertoning. Rent mättat rött finns inte med, och rödaktiga toner står aldrig
 * efter varandra (WCAG:s "red flash"). Med prefers-reduced-motion blinkar ingenting.
 */

/** Minsta tid mellan två färgbyten: > 333 ms ⇒ färre än 3 byten per sekund. */
export const MIN_FLASH_INTERVAL_MS = 334

/** Valt tempo: lugnt nog att kännas som en diskolampa, inte ett stroboskop. */
export const DISCO_INTERVAL_MS = 600

/** Övertoningens längd; kortare än intervallet så varje färg hinner synas. */
export const DISCO_FADE_MS = 450

/**
 * Neonfärger, i den ordning de visas (sedan börjar det om). Alla är ljusa nog för mörk
 * text (minst 6,7:1), så texten kan ligga still medan bakgrunden byter färg. Den första
 * (cyan) är också den stillastående färgen vid reducerade animationer – den skiljer sig
 * tydligt från Mika-indikatorns magenta.
 */
export const DISCO_COLORS = [
  '#22d3ee', // cyan
  '#fde047', // gul
  '#60a5fa', // elektriskt blå
  '#a3e635', // limegrön
  '#c084fc', // violett
  '#fb923c', // orange
  '#34d399', // mint
  '#ff7a8a', // korall
  '#2dd4bf', // turkos
  '#ff5ce1', // magenta
] as const

/** Säkerhetsgolv: ett intervall kortare än MIN_FLASH_INTERVAL_MS höjs till gränsen. */
export function clampFlashInterval(ms: number): number {
  return Number.isFinite(ms) ? Math.max(MIN_FLASH_INTERVAL_MS, ms) : MIN_FLASH_INTERVAL_MS
}

export interface DiscoTiming {
  /** Tid mellan färgbyten, eller null när bakgrunden står still. */
  intervalMs: number | null
  fadeMs: number
}

/** Tempot för diskolampan. Med reducerade animationer: ingen blinkning alls, stillastående färg. */
export function discoTiming(prefersReducedMotion: boolean): DiscoTiming {
  if (prefersReducedMotion) return { intervalMs: null, fadeMs: 0 }
  const intervalMs = clampFlashInterval(DISCO_INTERVAL_MS)
  return { intervalMs, fadeMs: Math.min(DISCO_FADE_MS, intervalMs) }
}

export function nextDiscoIndex(index: number): number {
  return (index + 1) % DISCO_COLORS.length
}

/** Nyans (0–360°) och mättnad (0–1) för en hex-färg. */
export function hueSaturation(hex: string): { hue: number; saturation: number } {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const light = (max + min) / 2
  const saturation = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1))
  let hue = 0
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
  }
  return { hue: (hue * 60 + 360) % 360, saturation }
}

/** Rödaktig och mättad: nyans inom ±20° från rött. */
export function isReddish(hex: string): boolean {
  const { hue, saturation } = hueSaturation(hex)
  return saturation > 0.5 && (hue <= 20 || hue >= 340)
}

/** Rent, mättat rött (t.ex. #ff0000) – ska aldrig förekomma. */
export function isPureRed(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
  return r >= 200 && g <= 80 && b <= 80
}
