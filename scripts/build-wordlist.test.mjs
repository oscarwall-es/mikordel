import { describe, expect, it } from 'vitest'
import { classifyEntry, normalizeEntry, seededShuffle, SHUFFLE_SEED } from './build-wordlist.mjs'

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
  it('godkänner och normaliserar', () => {
    expect(normalizeEntry('banan', 5)).toBe('banan')
    expect(normalizeEntry('  päron\tsubst', 5)).toBe('päron')
    expect(normalizeEntry('ärtor', 5)).toBe('ärtor')
  })

  it.each([
    ['Sverige', 'uppercase'],
    ['LVU', 'uppercase'],
    ['mRNA', 'uppercase'],
    ['GB/s', 'uppercase'],
    ['e-bok', 'hyphen'],
    ["it's", 'hyphen'],
    ['a priori', 'space'],
    ['all round', 'space'],
    ['mp3', 'digit'],
    ['café', 'chars'],
    ['km/h', 'chars'],
    ['.net', 'chars'],
    ['katt', 'length'],
    ['# kommentar', 'empty'],
    ['', 'empty'],
  ])('filtrerar bort %j (%s)', (line, reason) => {
    expect(classifyEntry(line, 5)).toMatchObject({ reason })
    expect(normalizeEntry(line, 5)).toBeNull()
  })

  it('flerordsuttryck blir aldrig sitt första ord', () => {
    expect(normalizeEntry('klipp och klistra', 5)).toBeNull()
    expect(normalizeEntry('stark ström', 5)).toBeNull()
  })
})
