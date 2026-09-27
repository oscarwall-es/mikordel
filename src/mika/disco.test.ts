import { describe, expect, it } from 'vitest'
import { contrastRatio, pageColorsFor } from '../ui/colors'
import {
  clampFlashInterval,
  DISCO_COLORS,
  DISCO_FADE_MS,
  DISCO_INTERVAL_MS,
  discoTiming,
  hueSaturation,
  isPureRed,
  isReddish,
  MIN_FLASH_INTERVAL_MS,
  nextDiscoIndex,
} from './disco'
import { createRainParticles, RAIN_COUNT, RAIN_COUNT_REDUCED, RAIN_SHAPES } from './rain'

describe('diskolampans säkerhetsgränser', () => {
  it('golvet ger färre än 3 byten per sekund (WCAG 2.3.1)', () => {
    expect(MIN_FLASH_INTERVAL_MS).toBeGreaterThanOrEqual(330)
    expect(1000 / MIN_FLASH_INTERVAL_MS).toBeLessThan(3)
  })

  it('valt tempo ligger över golvet, och övertoningen hinner klart före nästa byte', () => {
    const { intervalMs, fadeMs } = discoTiming(false)
    expect(intervalMs).toBe(DISCO_INTERVAL_MS)
    expect(intervalMs!).toBeGreaterThanOrEqual(MIN_FLASH_INTERVAL_MS)
    expect(fadeMs).toBe(DISCO_FADE_MS)
    expect(fadeMs).toBeLessThanOrEqual(intervalMs!)
  })

  it('ett för kort intervall höjs alltid till golvet', () => {
    for (const ms of [0, 1, 50, 100, 333, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(clampFlashInterval(ms)).toBeGreaterThanOrEqual(MIN_FLASH_INTERVAL_MS)
    }
    expect(clampFlashInterval(800)).toBe(800)
  })

  it('prefers-reduced-motion stänger av blinket helt', () => {
    expect(discoTiming(true)).toEqual({ intervalMs: null, fadeMs: 0 })
  })

  it('stillastående färg (första) skiljer sig tydligt i nyans från Mika-indikatorns magenta', () => {
    const a = hueSaturation(DISCO_COLORS[0]).hue
    const b = hueSaturation('#d946ef').hue // fuchsia-500
    const distance = Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
    expect(distance).toBeGreaterThanOrEqual(90)
  })

  it('innehåller inget rent mättat rött', () => {
    expect(isPureRed('#ff0000')).toBe(true)
    expect(DISCO_COLORS.filter(isPureRed)).toEqual([])
  })

  it('rödaktiga toner står aldrig efter varandra (även när sekvensen börjar om)', () => {
    expect(isReddish('#ff0000')).toBe(true)
    expect(isReddish('#22d3ee')).toBe(false)
    DISCO_COLORS.forEach((color, i) => {
      const next = DISCO_COLORS[nextDiscoIndex(i)]
      expect(isReddish(color) && isReddish(next), `${color} → ${next}`).toBe(false)
    })
  })

  it('8–12 starka färger, alla med läsbar text (minst 4,5:1)', () => {
    expect(DISCO_COLORS.length).toBeGreaterThanOrEqual(8)
    expect(DISCO_COLORS.length).toBeLessThanOrEqual(12)
    expect(new Set(DISCO_COLORS).size).toBe(DISCO_COLORS.length)
    for (const color of DISCO_COLORS) {
      const { text } = pageColorsFor(color)
      expect(contrastRatio(color, text)).toBeGreaterThanOrEqual(4.5)
      // Samma (mörka) text för alla, så texten blinkar inte i takt med bakgrunden
      expect(text).toBe(pageColorsFor(DISCO_COLORS[0]).text)
    }
  })

  it('nästa färg cyklar genom alla och börjar om', () => {
    const seen = new Set<number>()
    let i = 0
    for (let n = 0; n < DISCO_COLORS.length; n++) {
      seen.add(i)
      i = nextDiscoIndex(i)
    }
    expect(seen.size).toBe(DISCO_COLORS.length)
    expect(i).toBe(0)
  })
})

describe('regnet', () => {
  it('blandar minst fem former, med varierande storlek, fart och rotation', () => {
    const particles = createRainParticles(false)
    expect(particles).toHaveLength(RAIN_COUNT)
    expect(RAIN_SHAPES.length).toBeGreaterThanOrEqual(5)
    expect(new Set(particles.map((p) => p.shape)).size).toBe(RAIN_SHAPES.length)
    for (const key of ['sizePx', 'durationMs', 'rotateDeg'] as const) {
      expect(new Set(particles.map((p) => p[key])).size).toBeGreaterThan(10)
    }
  })

  it('är redan igång när det startar (negativ fördröjning inom ett fall)', () => {
    for (const p of createRainParticles(false)) {
      expect(p.delayMs).toBeLessThanOrEqual(0)
      expect(-p.delayMs).toBeLessThanOrEqual(p.durationMs)
    }
  })

  it('med reducerade animationer: betydligt färre och långsamma partiklar', () => {
    const reduced = createRainParticles(true)
    expect(reduced).toHaveLength(RAIN_COUNT_REDUCED)
    expect(RAIN_COUNT_REDUCED).toBeLessThanOrEqual(RAIN_COUNT / 3)
    expect(Math.min(...reduced.map((p) => p.durationMs))).toBeGreaterThanOrEqual(4000)
  })
})
