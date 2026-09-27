import { MIKA_AUDIO_SRC, MIKA_DEFAULT_VOLUME } from './audio'

/**
 * Spelaren för Mikas röst. Ett och samma <audio>-element återanvänds hela sessionen.
 *
 * iOS Safari-särdrag som styr upplägget:
 *  - `volume` går inte att ändra från JavaScript på iOS (den är alltid 1 och tilldelningar
 *    ignoreras). Mute görs därför med `muted`, som iOS respekterar. `volume` sätts ändå
 *    (70 % / 0) för plattformar där den fungerar.
 *  - Uppspelning måste startas direkt i användarens gest (klicket), inte senare i en effekt
 *    efter omrendering. startMikaAudio() anropas därför synkront från klickhanteraren.
 *  - Ett element som väl startats i en gest får spela igen senare, så elementet återanvänds
 *    i stället för att skapas på nytt.
 */
let element: HTMLAudioElement | null = null
/** Om rösten ska spela (satt i start, nollställd i stopp eller om uppspelningen nekas). */
let active = false

function getElement(): HTMLAudioElement {
  if (!element) {
    element = document.createElement('audio')
    element.src = MIKA_AUDIO_SRC
    element.loop = true
    element.preload = 'auto'
    element.setAttribute('playsinline', '')
    element.setAttribute('data-mika-audio', '')
  }
  return element
}

export function setMikaAudioMuted(muted: boolean): void {
  const audio = element
  if (!audio) return
  audio.muted = muted
  audio.volume = muted ? 0 : MIKA_DEFAULT_VOLUME
}

/** Startar rösten i loop. Anropa direkt i en klickhanterare (iOS). Kastar aldrig. */
export function startMikaAudio(muted = false): void {
  if (typeof document === 'undefined') return
  const audio = getElement()
  if (!audio.isConnected) document.body.appendChild(audio)
  setMikaAudioMuted(muted)
  if (active) return
  active = true
  const refused = (error: unknown) => {
    active = false // så att nästa gest (t.ex. mute-knappen) får försöka igen
    console.warn('Mika-mode: kunde inte spela upp ljudet', error)
  }
  try {
    // Nekad uppspelning (autoplay-spärr, fil saknas …) loggas – appen fortsätter som vanligt
    audio.play()?.catch?.(refused)
  } catch (error) {
    refused(error)
  }
}

/** Stoppar omedelbart och tar bort elementet ur sidan (det återanvänds nästa gång). */
export function stopMikaAudio(): void {
  active = false
  const audio = element
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
  audio.remove()
}

/** Om rösten är startad (för att undvika dubbla play()-anrop). */
export function isMikaAudioPlaying(): boolean {
  return active
}
