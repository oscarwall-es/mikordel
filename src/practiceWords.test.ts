import { describe, expect, it } from 'vitest'
import answers from './data/answers.json'
import { pushRecent } from './logic/practice'
import { nextPracticeWord } from './practiceWords'

describe('nextPracticeWord', () => {
  it('väljer aldrig dagens ord, oavsett slump', () => {
    const daily = answers[500]
    for (let r = 0; r < 1; r += 1 / answers.length) {
      expect(nextPracticeWord(answers, daily, [], () => r)).not.toBe(daily)
    }
  })

  it('väljer aldrig dagens ord ens långt efter att det lämnat fönstret med senaste ord', () => {
    // Samma sekvens som i appen: pushRecent före och efter varje val. Förut kunde dagens ord
    // komma tillbaka från omgång 6, när det föll ur fönstret med de 5 senaste orden.
    const daily = answers[0]
    const target = () => {
      // Slump som skulle träffa dagens ord om det fanns bland kandidaterna (det står först i listan)
      return 0
    }
    let recent: string[] = []
    let current = nextPracticeWord(answers, daily, recent, target)
    for (let round = 0; round < 50; round++) {
      const seen = pushRecent(recent, current)
      current = nextPracticeWord(answers, daily, seen, target)
      expect(current).not.toBe(daily)
      recent = pushRecent(seen, current)
    }
  })

  it('undviker fortfarande de senaste orden', () => {
    const recent = answers.slice(1, 6)
    for (let r = 0; r < 1; r += 0.01) {
      expect(recent).not.toContain(nextPracticeWord(answers, answers[0], recent, () => r))
    }
  })

  it('faller tillbaka på hela listan om den bara innehåller dagens ord', () => {
    expect(nextPracticeWord(['skola'], 'skola', [])).toBe('skola')
  })
})
