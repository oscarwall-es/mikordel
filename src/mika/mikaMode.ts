import { createContext } from 'react'

/** Mika-mode är ALLTID av när appen startar eller laddas om. Värdet sparas aldrig. */
export const MIKA_MODE_DEFAULT = false

export interface MikaModeValue {
  mikaMode: boolean
  toggleMikaMode: () => void
  /** Ljudet i Mika-mode. Nollställs till "ljud på" varje gång läget slås på eller av; sparas aldrig. */
  audioMuted: boolean
  toggleAudioMuted: () => void
}

/**
 * Utan provider (t.ex. i en isolerad komponent eller ett test) är Mika-mode av och toggle
 * gör ingenting – då beter sig allt garanterat som vanligt.
 */
export const MikaModeContext = createContext<MikaModeValue>({
  mikaMode: MIKA_MODE_DEFAULT,
  toggleMikaMode: () => {},
  audioMuted: false,
  toggleAudioMuted: () => {},
})
