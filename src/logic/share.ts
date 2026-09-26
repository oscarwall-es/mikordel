import { MAX_GUESSES, type LetterStatus } from './evaluate'
import type { GameState } from './game'

export const SHARE_EMOJI: Record<LetterStatus, string> = {
  correct: '🟩',
  present: '🟪',
  absent: '⬛',
}

/**
 * Delningstext utan själva ordet, t.ex.
 *
 *   Ordel #1000 3/6
 *
 *   ⬛🟪⬛⬛⬛
 *   🟩⬛🟪⬛⬛
 *   🟩🟩🟩🟩🟩
 *
 * Dagens ord får sitt nummer (dag 1 = startdatumet), övningsomgångar märks "(övning)".
 * Förlust skrivs som X/6.
 */
export function buildShareText(game: Pick<GameState, 'mode' | 'status' | 'guesses'>, dayNumber: number): string {
  const score = game.status === 'won' ? game.guesses.length : 'X'
  const label = game.mode === 'daily' ? `Ordel #${dayNumber + 1}` : 'Ordel (övning)'
  const rows = game.guesses.map((g) => g.statuses.map((s) => SHARE_EMOJI[s]).join(''))
  return `${label} ${score}/${MAX_GUESSES}\n\n${rows.join('\n')}`
}
