export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

/**
 * correct = rätt bokstav, rätt plats (grön)
 * present = rätt bokstav, fel plats (lila)
 * absent  = bokstaven finns inte (kvar) i ordet (svart)
 */
export type LetterStatus = 'correct' | 'present' | 'absent'

/** Delar upp ett ord i bokstäver. NFC gör att å/ä/ö alltid är ett tecken, aldrig a + ring. */
export function toLetters(word: string): string[] {
  return Array.from(word.normalize('NFC').toLowerCase())
}

/**
 * Utvärderar en gissning mot facit med tvåpassalgoritmen:
 *  1. Exakta positionsträffar blir gröna och förbrukas ur facits bokstavsräkning.
 *  2. Övriga bokstäver blir lila om bokstaven finns kvar i räkningen (och förbrukas), annars svarta.
 *
 * Ren funktion – vet ingenting om spelläge eller UI.
 */
export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const g = toLetters(guess)
  const a = toLetters(answer)
  if (g.length !== a.length) {
    throw new Error(`Gissningen (${g.length}) och facit (${a.length}) har olika längd`)
  }

  const result: LetterStatus[] = new Array(g.length).fill('absent')
  const remaining = new Map<string, number>()

  // Pass 1: gröna. Bokstäver i facit som inte matchades exakt räknas som "kvar".
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      result[i] = 'correct'
    } else {
      remaining.set(a[i], (remaining.get(a[i]) ?? 0) + 1)
    }
  }

  // Pass 2: lila/svarta, från vänster till höger.
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue
    const count = remaining.get(g[i]) ?? 0
    if (count > 0) {
      result[i] = 'present'
      remaining.set(g[i], count - 1)
    }
  }

  return result
}
