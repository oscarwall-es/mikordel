import { useEffect, useRef } from 'react'
import { MIKA_AUDIO_SRC, mikaVolume } from './audio'
import { useMikaMode } from './useMikaMode'

/**
 * Spelar Mikas röst i loop så länge komponenten är monterad (dvs. så länge Mika-mode är på).
 * Avmontering stoppar ljudet omedelbart. Kopplat bara till Mika-mode – inte till flikarna.
 */
export function MikaAudio() {
  const ref = useRef<HTMLAudioElement>(null)
  const { audioMuted } = useMikaMode()

  // Start och stopp
  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    audio.volume = mikaVolume(false)
    // Slås på via ett knapptryck, så autoplay-spärren borde inte slå till – men om den ändå
    // gör det (eller filen inte kan laddas) loggas det och appen fortsätter som vanligt.
    const playing = audio.play()
    playing?.catch?.((error: unknown) => console.warn('Mika-mode: kunde inte spela upp ljudet', error))
    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [])

  // Mute
  useEffect(() => {
    if (ref.current) ref.current.volume = mikaVolume(audioMuted)
  }, [audioMuted])

  return <audio ref={ref} src={MIKA_AUDIO_SRC} loop preload="auto" data-mika-audio="" />
}
