import { useState, type CSSProperties } from 'react'
import { MAX_GUESSES, toLetters, WORD_LENGTH, type LetterStatus } from '../logic/evaluate'
import type { EvaluatedGuess } from '../logic/game'
import { FLIP_STAGGER_MS, STATUS_BG, STATUS_COLOR_VAR } from './tiles'

type TileProps =
  | { kind: 'empty'; active: boolean }
  | { kind: 'filled'; letter: string }
  | { kind: 'evaluated'; letter: string; status: LetterStatus; flipDelayMs?: number }

function Tile(props: TileProps) {
  const base =
    'aspect-square w-full rounded-lg border-2 grid place-items-center text-3xl font-bold uppercase select-none'

  if (props.kind === 'empty') {
    return (
      <div
        className={`${base} bg-tile ${props.active ? 'border-tile-active' : 'border-transparent'}`}
        data-state={props.active ? 'active' : 'empty'}
      />
    )
  }

  if (props.kind === 'filled') {
    return (
      <div className={`${base} bg-tile border-tile-filled motion-safe:animate-pop`} data-state="filled">
        {props.letter}
      </div>
    )
  }

  const flipping = props.flipDelayMs !== undefined
  const style = flipping
    ? ({ '--flip-color': STATUS_COLOR_VAR[props.status], animationDelay: `${props.flipDelayMs}ms` } as CSSProperties)
    : undefined
  return (
    <div
      className={`${base} ${STATUS_BG[props.status]} border-transparent ${flipping ? 'motion-safe:animate-flip' : ''}`}
      style={style}
      data-state={props.status}
    >
      {props.letter}
    </div>
  )
}

interface BoardProps {
  guesses: EvaluatedGuess[]
  currentGuess: string[]
  /** Om spelaren kan skriva just nu – styr om aktiv ruta markeras. */
  acceptsInput: boolean
  /** Index för raden som ska vändas med animation (senast skickade gissningen), annars null. */
  revealRow: number | null
  /** Varje nytt värde skakar den aktuella raden en gång (felets id från reducern, som aldrig återanvänds). */
  shakeKey: number | null
}

export function Board({ guesses, currentGuess, acceptsInput, revealRow, shakeKey }: BoardProps) {
  // Raden skakar tills animationen för just det här felet är klar.
  const [shakeDone, setShakeDone] = useState<number | null>(null)
  const shaking = shakeKey !== null && shakeKey !== shakeDone

  const currentRow = guesses.length

  return (
    <div className="grid w-full max-w-[322px] grid-rows-6 gap-2" role="grid" aria-label="Spelplan">
      {Array.from({ length: MAX_GUESSES }, (_, row) => {
        const guess = guesses[row]
        const isCurrent = row === currentRow
        return (
          <div
            key={row}
            role="row"
            className={`grid grid-cols-5 gap-2 [perspective:600px] ${isCurrent && shaking ? 'motion-safe:animate-shake' : ''}`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) setShakeDone(shakeKey)
            }}
          >
            {Array.from({ length: WORD_LENGTH }, (_, col) => {
              if (guess) {
                return (
                  <Tile
                    key={col}
                    kind="evaluated"
                    letter={toLetters(guess.word)[col]}
                    status={guess.statuses[col]}
                    flipDelayMs={row === revealRow ? col * FLIP_STAGGER_MS : undefined}
                  />
                )
              }
              const letter = isCurrent ? currentGuess[col] : undefined
              if (letter) return <Tile key={col} kind="filled" letter={letter} />
              return <Tile key={col} kind="empty" active={isCurrent && acceptsInput && col === currentGuess.length} />
            })}
          </div>
        )
      })}
    </div>
  )
}
