import { describe, expect, it } from 'vitest'
import { pickPracticeWord, pushRecent, RECENT_LIMIT } from './practice'

const ANSWERS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']

/** Deterministisk "slump" som går igenom värden i [0, 1). */
const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('pickPracticeWord', () => {
  it('väljer aldrig något av de senaste orden', () => {
    const recent = ['a1', 'a2', 'a3', 'a4', 'a5']
    for (let r = 0; r < 1; r += 0.05) {
      expect(['a6', 'a7', 'a8']).toContain(pickPracticeWord(ANSWERS, recent, () => r))
    }
  })

  it('bryr sig bara om de senaste RECENT_LIMIT orden', () => {
    const recent = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']
    // a1 och a2 ligger utanför fönstret och är tillåtna igen
    const picked = new Set(Array.from({ length: 20 }, (_, i) => pickPracticeWord(ANSWERS, recent, () => i / 20)))
    expect(picked).toEqual(new Set(['a1', 'a2', 'a8']))
  })

  it('undviker samma ord två gånger i rad även när listan är kortare än fönstret', () => {
    const answers = ['x', 'y', 'z']
    for (let r = 0; r < 1; r += 0.1) {
      expect(pickPracticeWord(answers, ['y', 'z', 'x'], () => r)).not.toBe('x')
    }
  })

  it('fungerar med en lista på ett enda ord', () => {
    expect(pickPracticeWord(['x'], ['x'])).toBe('x')
  })

  it('aldrig samma ord två gånger i rad över många omgångar', () => {
    const random = seq(0.13, 0.99, 0.5, 0.01, 0.77, 0.42, 0.66)
    let recent: string[] = []
    let prev = ''
    for (let i = 0; i < 100; i++) {
      const word = pickPracticeWord(ANSWERS, recent, random)
      expect(word).not.toBe(prev)
      expect(recent).not.toContain(word)
      recent = pushRecent(recent, word)
      prev = word
    }
  })
})

describe('pushRecent', () => {
  it('behåller bara de senaste orden', () => {
    let recent: string[] = []
    for (const w of ANSWERS) recent = pushRecent(recent, w)
    expect(recent).toEqual(ANSWERS.slice(-RECENT_LIMIT))
  })

  it('flyttar ett redan förekommande ord till slutet utan dubblett', () => {
    expect(pushRecent(['a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'a'])
  })
})
