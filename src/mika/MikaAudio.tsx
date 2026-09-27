import { useEffect } from 'react'
import { isMikaAudioPlaying, startMikaAudio } from './audioPlayer'

/**
 * Skyddsnät för Mika-ljudet medan läget är på (monteras av MikaEffects).
 *
 * Start och stopp sker i klickhanteraren (MikaModeProvider), eftersom iOS Safari kräver att
 * uppspelning startar inom användarens gest. Den här komponenten startar bakgrundsspåren om
 * de av någon anledning inte redan spelar. Den stoppar medvetet inte ljudet vid avmontering
 * – React StrictMode avmonterar på låtsas i utveckling, och en omstart då skulle ske
 * utanför gesten.
 */
export function MikaAudio() {
  useEffect(() => {
    if (!isMikaAudioPlaying()) startMikaAudio()
  }, [])

  return null
}
