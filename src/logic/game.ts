import { evaluateGuess, MAX_GUESSES, toLetters, WORD_LENGTH, type LetterStatus } from './evaluate'

export type GameMode = 'daily' | 'practice'

/**
 * idle    = ny omgång, inget inskrivet än
 * playing = spelaren har börjat skriva/gissa
 * won/lost = omgången är slut, all inmatning ignoreras
 */
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

export interface EvaluatedGuess {
  word: string
  statuses: LetterStatus[]
}

export type GameErrorKind = 'too-short' | 'invalid-word'

export interface GameState {
  mode: GameMode
  answer: string
  status: GameStatus
  /** Bokstäver som skrivits in men inte skickats. */
  currentGuess: string[]
  guesses: EvaluatedGuess[]
  /** Kumulativ tangentbordsstatus för den här omgången; grön slår lila slår svart. */
  keyStatuses: Partial<Record<string, LetterStatus>>
  /**
   * Senaste avvisade gissning, null efter en giltig gissning. `id` ökar vid varje fel under hela omgången
   * (aldrig återanvänt), så UI:t kan trigga shake även vid samma fel två gånger i rad.
   */
  error: { kind: GameErrorKind; id: number } | null
  errorCount: number
}

export type GameAction =
  | { type: 'addLetter'; letter: string }
  | { type: 'removeLetter' }
  | { type: 'submit' }
  | { type: 'newGame'; mode: GameMode; answer: string }

const LETTER = /^[a-zåäö]$/u
const PRIORITY: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 }

function mergeKeyStatuses(
  keys: GameState['keyStatuses'],
  guess: EvaluatedGuess,
): GameState['keyStatuses'] {
  const next = { ...keys }
  toLetters(guess.word).forEach((letter, i) => {
    const status = guess.statuses[i]
    const prev = next[letter]
    if (!prev || PRIORITY[status] > PRIORITY[prev]) next[letter] = status
  })
  return next
}

/** Kumulativ tangentbordsstatus för en lista gissningar (t.ex. alla utom raden som håller på att vändas). */
export function computeKeyStatuses(guesses: readonly EvaluatedGuess[]): GameState['keyStatuses'] {
  return guesses.reduce(mergeKeyStatuses, {})
}

/** Applicerar en (redan validerad) gissning och räknar ut ny status. */
function applyGuess(state: GameState, word: string): GameState {
  const guess: EvaluatedGuess = { word, statuses: evaluateGuess(word, state.answer) }
  const guesses = [...state.guesses, guess]
  const won = guess.statuses.every((s) => s === 'correct')
  return {
    ...state,
    currentGuess: [],
    guesses,
    keyStatuses: mergeKeyStatuses(state.keyStatuses, guess),
    status: won ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing',
    error: null,
  }
}

/**
 * Skapar startstate för en omgång. `previousGuesses` spelas upp mot facit, vilket används
 * för att återställa dagens ord från localStorage – facit och färger räknas alltid om, aldrig lagras.
 */
export function createGameState(
  mode: GameMode,
  answer: string,
  previousGuesses: readonly string[] = [],
): GameState {
  let state: GameState = {
    mode,
    answer: answer.normalize('NFC').toLowerCase(),
    status: 'idle',
    currentGuess: [],
    guesses: [],
    keyStatuses: {},
    error: null,
    errorCount: 0,
  }
  for (const word of previousGuesses) {
    if (state.status === 'won' || state.status === 'lost') break
    state = applyGuess(state, word.normalize('NFC').toLowerCase())
  }
  return state
}

/**
 * Skapar en reducer. Ordvalideringen injiceras så reducern förblir ren och testbar,
 * och fungerar likadant för båda spellägena – det enda som skiljer är facit och `mode`.
 */
export function createGameReducer(isValidWord: (word: string) => boolean) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    if (action.type === 'newGame') {
      return createGameState(action.mode, action.answer)
    }

    if (state.status === 'won' || state.status === 'lost') return state

    switch (action.type) {
      case 'addLetter': {
        const letter = action.letter.normalize('NFC').toLowerCase()
        if (!LETTER.test(letter) || state.currentGuess.length >= WORD_LENGTH) return state
        return { ...state, status: 'playing', currentGuess: [...state.currentGuess, letter] }
      }

      case 'removeLetter': {
        if (state.currentGuess.length === 0) return state
        return { ...state, currentGuess: state.currentGuess.slice(0, -1) }
      }

      case 'submit': {
        const reject = (kind: GameErrorKind): GameState => ({
          ...state,
          error: { kind, id: state.errorCount + 1 },
          errorCount: state.errorCount + 1,
        })
        if (state.currentGuess.length < WORD_LENGTH) return reject('too-short')
        const word = state.currentGuess.join('')
        if (!isValidWord(word)) return reject('invalid-word')
        return applyGuess(state, word)
      }
    }
  }
}
