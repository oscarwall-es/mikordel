import { describe, expect, it } from 'vitest'
import { createGameState } from './game'
import { buildShareText } from './share'

describe('buildShareText', () => {
  it('dagens ord: nummer, poäng och emoji-rader', () => {
    const game = createGameState('daily', 'skola', ['lampa', 'stark', 'skola'])
    expect(buildShareText(game, 999)).toBe(
      ['Ordel #1000 3/6', '', '🟪⬛⬛⬛🟩', '🟩⬛🟪⬛🟪', '🟩🟩🟩🟩🟩'].join('\n'),
    )
  })

  it('förlust skrivs som X/6', () => {
    const game = createGameState('daily', 'skola', ['glass', 'kaffe', 'mamma', 'lampa', 'stuga', 'björn'])
    expect(game.status).toBe('lost')
    expect(buildShareText(game, 0).split('\n')[0]).toBe('Ordel #1 X/6')
    expect(buildShareText(game, 0).split('\n')).toHaveLength(2 + 6)
  })

  it('övningsläge märks och saknar dagnummer', () => {
    const game = createGameState('practice', 'glass', ['glass'])
    expect(buildShareText(game, 42)).toBe('Ordel (övning) 1/6\n\n🟩🟩🟩🟩🟩')
  })

  it('avslöjar aldrig ordet', () => {
    const game = createGameState('daily', 'skola', ['stark', 'skola'])
    expect(buildShareText(game, 5).toLowerCase()).not.toMatch(/skola|stark/)
  })
})
