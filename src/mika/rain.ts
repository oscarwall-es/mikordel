/**
 * Kontinuerligt regn av symboler i Mika-mode. Rena funktioner – MikaRain renderar bara
 * det som räknas ut här. Samma idé som vinstregnet (ui/celebration.ts), men varje partikel
 * faller om och om igen i stället för en gång.
 */

export const RAIN_SHAPES = ['heart', 'star', 'circle', 'triangle', 'bolt', 'note'] as const
export type RainShape = (typeof RAIN_SHAPES)[number]

export interface RainParticle {
  shape: RainShape
  /** Horisontell position i procent av skärmbredden. */
  left: number
  /** Vertikal position i procent – bara för den stillastående (reducerade) varianten. */
  top: number
  sizePx: number
  /** Tid för ett fall (eller en in-och-uttoning i reducerad variant). */
  durationMs: number
  /** Negativ fördröjning, så att skärmen är fylld direkt när regnet startar. */
  delayMs: number
  driftPx: number
  rotateDeg: number
  color: string
}

/** Antal partiklar: fullt regn, respektive glest och stilla med reducerade animationer. */
export const RAIN_COUNT = 40
export const RAIN_COUNT_REDUCED = 12

const COLORS = ['#ffffff', '#fde047', '#f472b6', '#22d3ee', '#a3e635', '#c084fc', '#fb923c']

const between = (random: () => number, min: number, max: number) => min + random() * (max - min)

export function createRainParticles(prefersReducedMotion: boolean, random: () => number = Math.random): RainParticle[] {
  const count = prefersReducedMotion ? RAIN_COUNT_REDUCED : RAIN_COUNT
  return Array.from({ length: count }, (_, i) => {
    // Formerna turas om, så alla sorter alltid finns med
    const shape = RAIN_SHAPES[i % RAIN_SHAPES.length]
    // Reducerat: långsam in- och uttoning på 4–7 s. Annars ett fall på 4–9 s.
    const durationMs = Math.round(prefersReducedMotion ? between(random, 4000, 7000) : between(random, 4000, 9000))
    return {
      shape,
      left: between(random, 0, 100),
      top: between(random, 5, 90),
      sizePx: Math.round(between(random, 14, 38)),
      durationMs,
      delayMs: -Math.round(between(random, 0, durationMs)),
      driftPx: Math.round(between(random, -80, 80)),
      rotateDeg: Math.round(between(random, -360, 360)),
      color: COLORS[Math.floor(random() * COLORS.length)],
    }
  })
}
