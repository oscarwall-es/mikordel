import { useEffect, useState, type Dispatch } from 'react'
import { computeKeyStatuses, type GameAction, type GameErrorKind, type GameState } from '../logic/game'
import { Board } from './Board'
import { Keyboard } from './Keyboard'
import { REVEAL_DURATION_MS } from './tiles'

const ERROR_TEXT: Record<GameErrorKind, string> = {
  'too-short': 'För få bokstäver',
  'invalid-word': 'Finns inte i ordlistan',
}
const TOAST_MS = 1500
const LETTER_KEY = /^[a-zåäö]$/iu

interface GameViewProps {
  game: GameState
  dispatch: Dispatch<GameAction>
  /** Falskt när t.ex. en modal är öppen – då ignoreras det fysiska tangentbordet. */
  keyboardActive: boolean
  /** Anropas när sista raden vänts klart och omgången är slut. */
  onRevealComplete?: () => void
}

/**
 * En spelomgång på skärmen. Ska få en ny `key` för varje omgång, så att animationstillståndet
 * (vilka rader som redan vänts) börjar om. Rader som fanns vid montering – t.ex. återställda
 * från localStorage – visas direkt utan animation.
 */
export function GameView({ game, dispatch, keyboardActive, onRevealComplete }: GameViewProps) {
  const [revealedCount, setRevealedCount] = useState(game.guesses.length)
  const revealing = game.guesses.length > revealedCount
  const revealRow = revealing ? game.guesses.length - 1 : null
  const inProgress = game.status === 'idle' || game.status === 'playing'
  const acceptsInput = inProgress && !revealing

  // När raden vänts klart: visa färgerna på tangentbordet och meddela om omgången är slut.
  useEffect(() => {
    if (!revealing) return
    const count = game.guesses.length
    const timer = setTimeout(() => {
      setRevealedCount(count)
      if (game.status === 'won' || game.status === 'lost') onRevealComplete?.()
    }, REVEAL_DURATION_MS)
    return () => clearTimeout(timer)
  }, [revealing, game.guesses.length, game.status, onRevealComplete])

  // Felmeddelande som försvinner av sig själv
  const [dismissedErrorId, setDismissedErrorId] = useState<number | null>(null)
  const toast = game.error && game.error.id !== dismissedErrorId ? game.error : null
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setDismissedErrorId(toast.id), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // Fysiskt tangentbord
  useEffect(() => {
    if (!keyboardActive || !acceptsInput) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter') dispatch({ type: 'submit' })
      else if (e.key === 'Backspace') dispatch({ type: 'removeLetter' })
      else if (LETTER_KEY.test(e.key)) dispatch({ type: 'addLetter', letter: e.key })
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyboardActive, acceptsInput, dispatch])

  const keyStatuses = revealing ? computeKeyStatuses(game.guesses.slice(0, revealedCount)) : game.keyStatuses

  return (
    <>
      <main className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-2">
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2"
        >
          {toast && (
            <div className="rounded-md bg-icon px-4 py-2 text-sm font-bold whitespace-nowrap text-surface shadow-lg">
              {ERROR_TEXT[toast.kind]}
            </div>
          )}
        </div>
        <Board
          guesses={game.guesses}
          currentGuess={game.currentGuess}
          acceptsInput={acceptsInput}
          revealRow={revealRow}
          shakeKey={game.error?.id ?? null}
        />
      </main>
      <div className="mx-auto w-full max-w-[420px] px-2 pb-3">
        <Keyboard
          keyStatuses={keyStatuses}
          disabled={!acceptsInput}
          onLetter={(letter) => dispatch({ type: 'addLetter', letter })}
          onBackspace={() => dispatch({ type: 'removeLetter' })}
          onEnter={() => dispatch({ type: 'submit' })}
        />
      </div>
    </>
  )
}
