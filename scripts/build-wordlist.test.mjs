import { describe, expect, it } from 'vitest'
import { normalizeEntry, seededShuffle, SHUFFLE_SEED } from './build-wordlist.mjs'

describe('seededShuffle', () => {
  const words = ['björn', 'fågel', 'glass', 'hjälp', 'hälsa', 'kaffe', 'kanel', 'lampa', 'mamma', 'mjölk']

  it('ger samma ordning varje gång', () => {
    expect(seededShuffle(words)).toEqual(seededShuffle(words))
  })

  it('är en permutation av indatan och ändrar inte originalet', () => {
    const copy = [...words]
    expect([...seededShuffle(words)].sort()).toEqual([...words].sort())
    expect(words).toEqual(copy)
  })

  it('faktiskt blandar', () => {
    expect(seededShuffle(words)).not.toEqual(words)
  })

  it('seedet är låst – ändras detta test har dagens-ord-sekvensen ändrats för alla', () => {
    expect(SHUFFLE_SEED).toBe(20240101)
    expect(seededShuffle(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toMatchInlineSnapshot(`
      [
        "d",
        "b",
        "f",
        "a",
        "h",
        "g",
        "c",
        "e",
      ]
    `)
  })
})

describe('normalizeEntry', () => {
  it('filtrerar och normaliserar', () => {
    expect(normalizeEntry('banan/ADE', 5)).toBe('banan')
    expect(normalizeEntry('päron\tsubst', 5)).toBe('päron')
    expect(normalizeEntry('ärtor', 5)).toBe('ärtor')
    for (const bad of ['Sverige', 'e-bok', "it's", 'café', 'katt', '# kommentar', '']) {
      expect(normalizeEntry(bad, 5)).toBeNull()
    }
  })
})
