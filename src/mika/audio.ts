/**
 * Ljudspåren i Mika-mode. Filerna ligger i public/audio/ och serveras under appens base-sökväg
 * (/mikordel/ på GitHub Pages, / i utveckling). Alla spår spelar samtidigt, i loop,
 * oberoende av varandra.
 */

/** Idé #2: Mikas röst (egen inspelning, ~5,6 s). */
export const MIKA_AUDIO_SRC = `${import.meta.env.BASE_URL}audio/mika-voice.mp3`

/** Idé #3: störig bakgrundsmusik (~8 s). */
export const MIKA_MUSIC_SRC = `${import.meta.env.BASE_URL}audio/mika-music.mp3`

/** Röstens startvolym – tydligt hörbar men inte fullt max. */
export const MIKA_DEFAULT_VOLUME = 0.7

/**
 * Musikens startvolym – lägre än rösten, så att båda hörs men rösten går att uppfatta.
 * Obs: iOS Safari ignorerar volume, där spelar båda på full volym och balansen avgörs av
 * filernas egen nivå (musiken är där ~1 dB svagare än rösten).
 */
export const MIKA_MUSIC_VOLUME = 0.55

export interface MikaTrack {
  /** Används som värde på data-mika-audio-attributet. */
  id: 'voice' | 'music'
  src: string
  volume: number
}

export const MIKA_TRACKS: readonly MikaTrack[] = [
  { id: 'voice', src: MIKA_AUDIO_SRC, volume: MIKA_DEFAULT_VOLUME },
  { id: 'music', src: MIKA_MUSIC_SRC, volume: MIKA_MUSIC_VOLUME },
]
