import { useEffect } from 'react'
import { isMikaAudioPlaying, setMikaAudioMuted, startMikaAudio } from './audioPlayer'
import { useMikaMode } from './useMikaMode'

/**
 * Håller Mikas röst i takt med Mika-mode medan läget är på (monteras av MikaEffects).
 *
 * Start och stopp sker i klickhanteraren (MikaModeProvider), eftersom iOS Safari kräver att
 * uppspelning startar inom användarens gest. Den här komponenten är skyddsnätet: den speglar
 * mute-läget och startar ljudet om det av någon anledning inte redan spelar. Den stoppar
 * medvetet inte ljudet vid avmontering – React StrictMode avmonterar på låtsas i utveckling,
 * och en omstart då skulle ske utanför gesten.
 */
export function MikaAudio() {
  const { audioMuted } = useMikaMode()

  useEffect(() => {
    if (isMikaAudioPlaying()) setMikaAudioMuted(audioMuted)
    else startMikaAudio(audioMuted)
  }, [audioMuted])

  return null
}
