import { describe, expect, it } from 'vitest'
import { createGameReducer, createGameState, type GameAction, type GameState } from './game'

const VALID = new Set(['skola', 'stark', 'glass', 'kaffe', 'mamma', 'lampa', 'stuga', 'björn', 'fågel', 'hälsa', 'äpple'])
const reducer = createGameReducer((w) => VALID.has(w))

/** Skriver in ett ord bokstav för bokstav och skickar det. */
const typeAndSubmit = (word: string): GameAction[] => [
  ...Array.from(word).map((letter): GameAction => ({ type: 'addLetter', letter })),
  { type: 'submit' },
]
const run = (state: GameState, actions: GameAction[]) => actions.reduce(reducer, state)
const play = (answer: string, ...words: string[]) =>
  run(createGameState('daily', answer), words.flatMap(typeAndSubmit))

describe('statusövergångar', () => {
  it('börjar i idle utan gissningar', () => {
    const s = createGameState('daily', 'skola')
    expect(s).toMatchObject({ status: 'idle', guesses: [], currentGuess: [], keyStatuses: {}, error: null, errorCount: 0 })
  })

  it('idle → playing vid första bokstaven', () => {
    const s = reducer(createGameState('daily', 'skola'), { type: 'addLetter', letter: 's' })
    expect(s.status).toBe('playing')
    expect(s.currentGuess).toEqual(['s'])
  })

  it('playing → won när gissningen är rätt', () => {
    const s = play('skola', 'stark', 'skola')
    expect(s.status).toBe('won')
    expect(s.guesses).toHaveLength(2)
  })

  it('playing → won på sista försöket', () => {
    const s = play('skola', 'stark', 'glass', 'kaffe', 'mamma', 'lampa', 'skola')
    expect(s.status).toBe('won')
  })

  it('playing → lost efter sex felaktiga gissningar', () => {
    const s = play('skola', 'stark', 'glass', 'kaffe', 'mamma', 'lampa', 'stuga')
    expect(s.status).toBe('lost')
    expect(s.guesses).toHaveLength(6)
  })

  it('ignorerar all inmatning efter vinst eller förlust', () => {
    for (const done of [play('skola', 'skola'), play('skola', 'stark', 'glass', 'kaffe', 'mamma', 'lampa', 'stuga')]) {
      expect(run(done, typeAndSubmit('björn'))).toBe(done)
      expect(reducer(done, { type: 'removeLetter' })).toBe(done)
    }
  })
})

describe('ogiltiga gissningar förbrukar inte ett försök', () => {
  it('avvisar ord som inte finns i ordlistan', () => {
    const s = play('skola', 'abcde')
    expect(s.guesses).toHaveLength(0)
    expect(s.status).toBe('playing')
    expect(s.error?.kind).toBe('invalid-word')
    // Bokstäverna ligger kvar så spelaren kan rätta dem
    expect(s.currentGuess).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('avvisar för korta gissningar', () => {
    const s = run(createGameState('daily', 'skola'), [
      { type: 'addLetter', letter: 's' },
      { type: 'submit' },
    ])
    expect(s.guesses).toHaveLength(0)
    expect(s.error?.kind).toBe('too-short')
  })

  it('felets id ökar vid upprepade fel så UI:t kan skaka igen', () => {
    const once = play('skola', 'abcde')
    const twice = reducer(once, { type: 'submit' })
    expect(twice.error?.id).toBeGreaterThan(once.error!.id)
  })

  it('man kan fortfarande använda alla sex försök efter avvisade ord', () => {
    const s = run(createGameState('daily', 'skola'), [
      ...typeAndSubmit('abcde'),
      ...Array.from({ length: 5 }, (): GameAction => ({ type: 'removeLetter' })),
      ...['stark', 'glass', 'kaffe', 'mamma', 'lampa', 'skola'].flatMap(typeAndSubmit),
    ])
    expect(s.status).toBe('won')
    expect(s.guesses).toHaveLength(6)
  })

  it('lyckad gissning nollställer felet, men nästa fel får ändå ett nytt id', () => {
    const clear = (): GameAction[] => Array.from({ length: 5 }, () => ({ type: 'removeLetter' }))
    const first = play('skola', 'abcde')
    const afterValid = run(first, [...clear(), ...typeAndSubmit('stark')])
    expect(afterValid.error).toBeNull()
    const second = run(afterValid, typeAndSubmit('abcde'))
    expect(second.error!.id).toBeGreaterThan(first.error!.id)
  })
})

describe('inmatning', () => {
  it('max fem bokstäver', () => {
    const s = run(createGameState('daily', 'skola'), Array.from('skolans').map((letter) => ({ type: 'addLetter', letter })))
    expect(s.currentGuess).toEqual(['s', 'k', 'o', 'l', 'a'])
  })

  it('backspace tar bort sista bokstaven och gör inget på tom rad', () => {
    let s = run(createGameState('daily', 'skola'), [{ type: 'addLetter', letter: 's' }, { type: 'addLetter', letter: 'k' }])
    s = reducer(s, { type: 'removeLetter' })
    expect(s.currentGuess).toEqual(['s'])
    s = reducer(reducer(s, { type: 'removeLetter' }), { type: 'removeLetter' })
    expect(s.currentGuess).toEqual([])
  })

  it('accepterar Å, Ä, Ö och versaler, men inte andra tecken', () => {
    const s = run(createGameState('daily', 'skola'), ['Å', 'ä', 'ö', '1', 'é', 'Enter', ' '].map((letter) => ({ type: 'addLetter', letter })))
    expect(s.currentGuess).toEqual(['å', 'ä', 'ö'])
  })
})

describe('tangentbordets kumulativa färgning', () => {
  it('grön förblir grön även när bokstaven senare blir lila eller svart', () => {
    // "stark" mot "skola": s grön. "glass" mot "skola": s lila + svart – s ska förbli grön
    const s = play('skola', 'stark', 'glass')
    expect(s.keyStatuses.s).toBe('correct')
  })

  it('lila uppgraderas till grön', () => {
    // "lampa" mot "skola": l lila. "skola": l grön
    const afterLampa = play('skola', 'lampa')
    expect(afterLampa.keyStatuses.l).toBe('present')
    expect(run(afterLampa, typeAndSubmit('skola')).keyStatuses.l).toBe('correct')
  })

  it('lila nedgraderas inte till svart av en överskjutande dubblett', () => {
    // "mamma" mot "lampa": m på plats 3 grön, övriga m svarta → m ska vara grön
    expect(play('lampa', 'mamma').keyStatuses.m).toBe('correct')
    // "kaffe" mot "fågel": första f lila, andra svart → f ska vara lila
    expect(play('fågel', 'kaffe').keyStatuses.f).toBe('present')
  })

  it('bokstäver som inte gissats saknar status', () => {
    expect(play('skola', 'stark').keyStatuses.b).toBeUndefined()
  })
})

describe('lägen och nya omgångar', () => {
  it('samma reducer fungerar för övningsläget', () => {
    const s = run(createGameState('practice', 'glass'), typeAndSubmit('glass'))
    expect(s).toMatchObject({ mode: 'practice', status: 'won' })
  })

  it('newGame nollställer gissningar och tangentbordsfärger', () => {
    const done = play('skola', 'stark', 'skola')
    const next = reducer(done, { type: 'newGame', mode: 'practice', answer: 'glass' })
    expect(next).toEqual(createGameState('practice', 'glass'))
    expect(next.keyStatuses).toEqual({})
  })
})

describe('återställning via createGameState', () => {
  it('spelar upp tidigare gissningar mot facit', () => {
    const restored = createGameState('daily', 'skola', ['stark', 'skola'])
    expect(restored).toEqual(play('skola', 'stark', 'skola'))
  })

  it('pågående omgång återställs som playing', () => {
    expect(createGameState('daily', 'skola', ['stark']).status).toBe('playing')
  })
})
