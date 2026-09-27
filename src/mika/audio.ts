/**
 * Mika-mode-idé #2: Mikas röst i loop. Inspelningen ligger i public/audio/mika-voice.mp3 och
 * serveras under appens base-sökväg (/mikordel/ på GitHub Pages, / i utveckling).
 */
export const MIKA_AUDIO_SRC = `${import.meta.env.BASE_URL}audio/mika-voice.mp3`

/** Startvolym – tydligt hörbar men inte fullt max. */
export const MIKA_DEFAULT_VOLUME = 0.7
