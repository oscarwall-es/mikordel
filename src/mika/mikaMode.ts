import { createContext } from 'react'

/** Mika-mode är ALLTID av när appen startar eller laddas om. Värdet sparas aldrig. */
export const MIKA_MODE_DEFAULT = false

export interface MikaModeValue {
  mikaMode: boolean
  toggleMikaMode: () => void
  /** Om avbrottet (idé #4) pågår: röst och musik är tysta medan avbrottsspåret spelar. */
  interrupting: boolean
  /** Startar avbrottet. Gör ingenting om läget är av eller ett avbrott redan pågår. */
  startInterrupt: () => void
}

/**
 * Utan provider (t.ex. i en isolerad komponent eller ett test) är Mika-mode av och toggle
 * gör ingenting – då beter sig allt garanterat som vanligt.
 */
export const MikaModeContext = createContext<MikaModeValue>({
  mikaMode: MIKA_MODE_DEFAULT,
  toggleMikaMode: () => {},
  interrupting: false,
  startInterrupt: () => {},
})
