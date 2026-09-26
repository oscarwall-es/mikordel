import type { ReactNode } from 'react'
import { MAX_GUESSES, WORD_LENGTH, type LetterStatus } from '../logic/evaluate'
import { Modal } from './Modal'
import { STATUS_BG } from './tiles'

const EXAMPLE: [string, LetterStatus][] = [
  ['h', 'absent'],
  ['u', 'present'],
  ['s', 'absent'],
  ['e', 'absent'],
  ['t', 'correct'],
]

function Chip({ status, children }: { status: LetterStatus; children: ReactNode }) {
  return <strong className={`${STATUS_BG[status]} rounded px-[3.5px] py-px text-white`}>{children}</strong>
}

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Så spelar du">
      <div className="mt-3.5 space-y-4 leading-tight">
        <p>Gissa dagens ord på max {MAX_GUESSES} försök!</p>
        <p>Du måste gissa på riktiga svenska ord med {WORD_LENGTH} bokstäver.</p>
        <p>Varje gissning ger ledtrådar som hjälper dig hitta svaret.</p>
      </div>

      <section className="mt-4 rounded-xl bg-card px-4 pt-4 pb-[22px] leading-tight">
        <h3 className="text-xl font-bold">Exempel på gissning</h3>
        <div className="mt-3.5 flex gap-2" aria-label="HUSET: H svart, U lila, S svart, E svart, T grön">
          {EXAMPLE.map(([letter, status], i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`${STATUS_BG[status]} grid size-12 place-items-center rounded-lg text-3xl font-bold uppercase`}
            >
              {letter}
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          <p>
            En <Chip status="correct">grön</Chip> ruta betyder att bokstaven är korrekt och på rätt plats.
          </p>
          <p>
            En <Chip status="present">lila</Chip> ruta betyder att bokstaven är korrekt men på <strong>fel</strong>{' '}
            plats.
          </p>
          <p>
            En <Chip status="absent">svart</Chip> ruta betyder att bokstaven inte är med i ordet.
          </p>
          <p>PS. Tänk på att samma bokstav kan finnas med i ordet mer än en gång!</p>
        </div>
      </section>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 h-[50px] w-full shrink-0 rounded-lg bg-action font-bold tracking-[0.03em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-icon"
      >
        Spela
      </button>
    </Modal>
  )
}
