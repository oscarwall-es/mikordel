import { describe, expect, it } from 'vitest'
import { evaluateGuess, type LetterStatus } from './evaluate'

// Kortform för läsbara förväntningar: G = grön, P = lila (present), B = svart
const codes: Record<string, LetterStatus> = { G: 'correct', P: 'present', B: 'absent' }
const expectPattern = (guess: string, answer: string, pattern: string) =>
  expect(evaluateGuess(guess, answer)).toEqual(Array.from(pattern).map((c) => codes[c]))

describe('evaluateGuess – grundfall', () => {
  it('helt rätt ord blir fem gröna', () => {
    expectPattern('skola', 'skola', 'GGGGG')
  })

  it('inga gemensamma bokstäver blir fem svarta', () => {
    expectPattern('mjölk', 'stuga', 'BBBBB')
  })

  it('rätt bokstäver på fel plats blir lila', () => {
    expectPattern('lampa', 'kanel', 'PGBBB')
  })

  it('blandning av grönt, lila och svart', () => {
    expectPattern('stark', 'skola', 'GBPBP')
  })
})

describe('evaluateGuess – dubbla bokstäver i gissningen', () => {
  it('bara en lila när facit har bokstaven en gång', () => {
    // facit "stark" har ett a; gissningen har två – bara det första blir lila
    expectPattern('mamma', 'stark', 'BPBBB')
  })

  it('grön prioriteras över en tidigare lila för samma bokstav', () => {
    // facit "stuga" har ett a på sista platsen. Gissningens a på plats 2 får inte bli lila,
    // eftersom a:et redan förbrukas av den gröna träffen på plats 5.
    expectPattern('lampa', 'stuga', 'BBBBG')
  })

  it('överskjutande dubblett blir svart när facit bara har en förekomst', () => {
    // facit "fågel" har ett f; gissningens första f blir lila, det andra svart
    expectPattern('kaffe', 'fågel', 'BBPBP')
  })

  it('dubblett där ena är grön och den andra saknar motsvarighet', () => {
    // "glass" mot "stark": a är grön, s finns en gång i facit – första s lila, andra svart
    expectPattern('glass', 'stark', 'BBGPB')
  })

  it('tre likadana bokstäver mot facit med en', () => {
    expectPattern('mamma', 'hälsa', 'BBBBG')
  })
})

describe('evaluateGuess – dubbla bokstäver i facit', () => {
  it('en förekomst i gissningen mot två i facit blir lila', () => {
    // facit "kaffe" har två f; gissningen har ett f på fel plats
    expectPattern('fågel', 'kaffe', 'PBBPB')
  })

  it('båda förekomsterna kan bli lila', () => {
    // facit "glass" har s på plats 4 och 5; gissningen "sista" har s på plats 1 och 3
    expectPattern('sista', 'glass', 'PBPBP')
  })

  it('en grön och en lila för samma bokstav', () => {
    // facit "mamma": m på 1, 3, 4. Gissningen har m på 1 (grön) och 5 (lila)
    expectPattern('mölkm', 'mamma', 'GBBBP')
  })

  it('grön och lila i samma gissning där båda har dubbletter', () => {
    // "mössa" mot "glass": s på plats 4 grön, s på plats 3 lila (facit har två s)
    expectPattern('mössa', 'glass', 'BBPGP')
  })

  it('överskott av dubbletter när facit har exakt matchande antal gröna', () => {
    // "pappa" mot "lampa": p på plats 4 och a på 2 och 5 gröna, resterande p svarta
    expectPattern('pappa', 'lampa', 'BGBGG')
  })

  it('dubbletter som är gröna respektive lila', () => {
    expectPattern('snäll', 'snäll', 'GGGGG')
    expectPattern('kulle', 'snäll', 'BBPGB')
  })
})

describe('evaluateGuess – svenska tecken och normalisering', () => {
  it('Å, Ä, Ö är egna bokstäver och matchar inte A/O', () => {
    expectPattern('ängel', 'angel', 'BGGGG')
    expectPattern('björn', 'bjorn', 'GGBGG')
  })

  it('är okänslig för versaler', () => {
    expectPattern('ÄPPLE', 'äpple', 'GGGGG')
  })

  it('behandlar sammansatt ä (a + U+0308) likadant som förkomponerat ä', () => {
    const decomposed = 'äpple'
    expectPattern(decomposed, 'äpple', 'GGGGG')
  })

  it('kastar fel vid olika längd', () => {
    expect(() => evaluateGuess('skol', 'skola')).toThrow()
  })
})
