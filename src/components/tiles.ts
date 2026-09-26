import { WORD_LENGTH, type LetterStatus } from '../logic/evaluate'

/** Fördröjning mellan varje ruta när en rad vänds, och hur länge en vändning tar. */
export const FLIP_STAGGER_MS = 300
export const FLIP_DURATION_MS = 500
/** Tid tills hela raden är vänd – tangentbord och resultat väntar så här länge. */
export const REVEAL_DURATION_MS = FLIP_STAGGER_MS * (WORD_LENGTH - 1) + FLIP_DURATION_MS

export const STATUS_BG: Record<LetterStatus, string> = {
  correct: 'bg-correct',
  present: 'bg-present',
  absent: 'bg-absent',
}

export const STATUS_COLOR_VAR: Record<LetterStatus, string> = {
  correct: 'var(--color-correct)',
  present: 'var(--color-present)',
  absent: 'var(--color-absent)',
}
