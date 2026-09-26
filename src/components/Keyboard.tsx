import type { LetterStatus } from '../logic/evaluate'
import { STATUS_BG } from './tiles'

// Rutnät med 22 halva kolumner: varje bokstav tar 2, så rad 3 kan förskjutas och
// backspace/SPELA kan vara 1,5 resp. 2,5 tangenter breda som i skärmdumpen.
const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]
/** Z hamnar under D (tredje tangenten). */
const ROW3_START = 5

interface KeyboardProps {
  keyStatuses: Partial<Record<string, LetterStatus>>
  onLetter: (letter: string) => void
  onEnter: () => void
  onBackspace: () => void
  disabled?: boolean
}

const keyBase =
  'h-12 rounded-md font-bold text-white uppercase select-none transition-colors active:brightness-125 disabled:cursor-default disabled:active:brightness-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-icon'

export function Keyboard({ keyStatuses, onLetter, onEnter, onBackspace, disabled }: KeyboardProps) {
  // Tangenterna ska inte ta fokus vid klick – då skulle fysisk Enter "klicka" på senast använda tangent.
  const noFocus = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div className="grid w-full grid-cols-22 gap-[3px]" aria-label="Tangentbord">
      {ROWS.map((row, r) =>
        row.map((letter, i) => {
          const status = keyStatuses[letter]
          return (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onMouseDown={noFocus}
              onClick={() => onLetter(letter)}
              className={`${keyBase} col-span-2 text-base ${status ? STATUS_BG[status] : 'bg-key'}`}
              style={r === 2 && i === 0 ? { gridColumnStart: ROW3_START } : undefined}
              aria-label={`${letter.toUpperCase()}${status ? `, ${STATUS_LABEL[status]}` : ''}`}
            >
              {letter}
            </button>
          )
        }),
      )}

      <button
        type="button"
        disabled={disabled}
        onMouseDown={noFocus}
        onClick={onBackspace}
        className={`${keyBase} col-span-3 col-start-20 row-start-3 grid place-items-center bg-key`}
        aria-label="Radera"
      >
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinejoin="round" d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7 6-7Z" />
          <path strokeLinecap="round" d="m11.5 9.5 5 5m0-5-5 5" />
        </svg>
      </button>

      <button
        type="button"
        disabled={disabled}
        onMouseDown={noFocus}
        onClick={onEnter}
        className={`${keyBase} col-span-5 col-start-18 row-start-4 bg-action text-base tracking-wide`}
      >
        Spela
      </button>
    </div>
  )
}

const STATUS_LABEL: Record<LetterStatus, string> = {
  correct: 'rätt plats',
  present: 'fel plats',
  absent: 'finns inte',
}
