import { describe, expect, it } from 'vitest'
import { daysBetween, getDailyWord, getDailyWordIndex, getDayNumber, toDateKey } from './daily'

// Lokal tid, som i webbläsaren (månader är 0-indexerade)
const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

describe('getDailyWordIndex', () => {
  it('startdatumet ger index 0', () => {
    expect(getDailyWordIndex(day(2024, 1, 1), 20)).toBe(0)
  })

  it('samma datum ger alltid samma index, oavsett tid på dygnet', () => {
    const indexes = [0, 1, 9, 12, 23].map((h) => getDailyWordIndex(day(2026, 9, 26, h), 20))
    expect(new Set(indexes).size).toBe(1)
    expect(getDailyWordIndex(new Date(2026, 8, 26, 23, 59, 59), 20)).toBe(indexes[0])
  })

  it('byter index vid lokal midnatt', () => {
    const before = getDailyWordIndex(new Date(2026, 8, 26, 23, 59, 59), 20)
    const after = getDailyWordIndex(new Date(2026, 8, 27, 0, 0, 0), 20)
    expect(after).toBe((before + 1) % 20)
  })

  it('på varandra följande dagar ger olika index', () => {
    const n = 20
    const indexes = Array.from({ length: n }, (_, i) => getDailyWordIndex(day(2026, 3, 1 + i), n))
    expect(new Set(indexes).size).toBe(n)
  })

  it('är cykliskt: n dagar senare ger samma index', () => {
    for (const n of [1, 7, 20, 2315]) {
      const d = day(2025, 6, 15)
      const later = new Date(d)
      later.setDate(d.getDate() + n)
      expect(getDailyWordIndex(later, n)).toBe(getDailyWordIndex(d, n))
    }
  })

  it('ligger alltid inom listans längd, även före startdatumet', () => {
    for (const d of [day(2023, 12, 31), day(2000, 1, 1), day(2099, 12, 31)]) {
      const i = getDailyWordIndex(d, 20)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(20)
    }
    expect(getDailyWordIndex(day(2023, 12, 31), 20)).toBe(19)
  })

  it('påverkas inte av sommartidsomställning', () => {
    // Sommartid börjar 2026-03-29 och slutar 2026-10-25 i Sverige
    expect(getDayNumber(day(2026, 3, 30, 0)) - getDayNumber(day(2026, 3, 29, 0))).toBe(1)
    expect(getDayNumber(day(2026, 10, 26, 0)) - getDayNumber(day(2026, 10, 25, 0))).toBe(1)
  })

  it('kastar fel för tom lista', () => {
    expect(() => getDailyWordIndex(day(2026, 1, 1), 0)).toThrow()
  })
})

describe('getDailyWord', () => {
  it('slår upp ordet för datumets index', () => {
    const answers = ['skola', 'stark', 'glass']
    expect(getDailyWord(day(2024, 1, 1), answers)).toBe('skola')
    expect(getDailyWord(day(2024, 1, 2), answers)).toBe('stark')
    expect(getDailyWord(day(2024, 1, 4), answers)).toBe('skola')
  })
})

describe('datumhjälpare', () => {
  it('toDateKey använder lokalt datum med nollutfyllnad', () => {
    expect(toDateKey(day(2026, 3, 5, 0))).toBe('2026-03-05')
  })

  it('daysBetween räknar kalenderdagar, även över månads- och årsskiften', () => {
    expect(daysBetween('2026-09-26', '2026-09-27')).toBe(1)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2) // skottår
    expect(daysBetween('2026-09-27', '2026-09-26')).toBe(-1)
  })
})
