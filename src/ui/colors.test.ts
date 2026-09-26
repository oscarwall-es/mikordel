import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_KEY,
  contrastRatio,
  DEFAULT_BACKGROUND,
  loadBackgroundColor,
  pageColorsFor,
  PALETTE,
  relativeLuminance,
  saveBackgroundColor,
} from './colors'

const memoryStore = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('kontrast', () => {
  it('relativ luminans och kontrast följer WCAG', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBe(1)
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
  })

  it('väljer ljus text på mörk bakgrund och mörk text på ljus', () => {
    expect(pageColorsFor('#1e293b').text).toBe('#f1f5f9')
    expect(pageColorsFor('#fbcfe8').text).toBe('#0f172a')
    expect(pageColorsFor('#ffffff').text).toBe('#0f172a')
    expect(pageColorsFor('#000000').text).toBe('#f1f5f9')
  })

  it.each(PALETTE.map((s) => [s.name, s.hex]))('%s: text når WCAG AA (4,5:1) och ikoner 3:1', (_, hex) => {
    const { text, muted } = pageColorsFor(hex)
    expect(contrastRatio(hex, text)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(hex, muted)).toBeGreaterThanOrEqual(3)
  })

  it('godtycklig färg ger alltid läsbar text (minst 4,5:1)', () => {
    for (let i = 0; i < 4096; i++) {
      const hex = `#${(i * 4099).toString(16).padStart(6, '0').slice(-6)}`
      expect(contrastRatio(hex, pageColorsFor(hex).text)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('rutor och tangenter får kant bara när de smälter ihop med bakgrunden', () => {
    expect(pageColorsFor(DEFAULT_BACKGROUND).componentEdge).toBe('transparent')
    // Samma färg som tomma rutor (slate-700) → kant behövs
    expect(pageColorsFor('#334155').componentEdge).not.toBe('transparent')
    expect(pageColorsFor('#ffffff').componentEdge).toBe('transparent')
  })

  it('aktiva rutan får mörk ytterring bara på ljus bakgrund', () => {
    expect(pageColorsFor(DEFAULT_BACKGROUND).activeRing).toBe('transparent')
    expect(pageColorsFor('#f5e6c8').activeRing).toBe('#0f172a')
  })

  it('ogiltig färg faller tillbaka på standardfärgen', () => {
    expect(pageColorsFor('rött').background).toBe(DEFAULT_BACKGROUND)
  })
})

describe('persistens', () => {
  it('sparar och läser tillbaka vald färg', () => {
    const store = memoryStore()
    expect(loadBackgroundColor(store)).toBe(DEFAULT_BACKGROUND)
    saveBackgroundColor('#0C4A6E', store)
    expect(loadBackgroundColor(store)).toBe('#0c4a6e')
  })

  it('ignorerar ogiltiga värden och trasig lagring', () => {
    const store = memoryStore()
    store.setItem(BACKGROUND_KEY, 'javascript:alert(1)')
    expect(loadBackgroundColor(store)).toBe(DEFAULT_BACKGROUND)
    saveBackgroundColor('inte en färg', store)
    expect(store.getItem(BACKGROUND_KEY)).toBe('javascript:alert(1)')
    const broken = {
      getItem: () => {
        throw new Error('blockerad')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(loadBackgroundColor(broken)).toBe(DEFAULT_BACKGROUND)
    expect(() => saveBackgroundColor('#ffffff', broken)).not.toThrow()
    expect(loadBackgroundColor(null)).toBe(DEFAULT_BACKGROUND)
  })

  it('paletten har 8 unika, giltiga färger med standardfärgen först', () => {
    expect(PALETTE).toHaveLength(8)
    expect(PALETTE[0].hex).toBe(DEFAULT_BACKGROUND)
    expect(new Set(PALETTE.map((s) => s.hex.toLowerCase())).size).toBe(8)
  })
})
