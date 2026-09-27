import { MIKA_TRACKS, type MikaTrack } from './audio'

/**
 * Spelaren för Mika-mode-ljudet: alla spår i MIKA_TRACKS (röst och musik) spelar samtidigt,
 * i loop, oberoende av varandra. Varje spår har ett eget <audio>-element som återanvänds
 * hela sessionen.
 *
 * iOS Safari-särdrag som styr upplägget:
 *  - `volume` går inte att ändra från JavaScript på iOS (den är alltid 1 och tilldelningar
 *    ignoreras). Mute görs därför med `muted`, som iOS respekterar. `volume` sätts ändå
 *    (spårets volym / 0) för plattformar där den fungerar.
 *  - Uppspelning måste startas direkt i användarens gest (klicket), inte senare i en effekt
 *    efter omrendering. startMikaAudio() anropas därför synkront från klickhanteraren och
 *    startar alla spår i samma anrop.
 *  - Ett element som väl startats i en gest får spela igen senare, så elementen återanvänds
 *    i stället för att skapas på nytt.
 */
interface TrackState {
  track: MikaTrack
  element: HTMLAudioElement
  /** Om spåret ska spela (satt i start, nollställd i stopp eller om uppspelningen nekas). */
  active: boolean
}

let tracks: TrackState[] | null = null

function getTracks(): TrackState[] {
  if (!tracks) {
    tracks = MIKA_TRACKS.map((track) => {
      const element = document.createElement('audio')
      element.src = track.src
      element.loop = true
      element.preload = 'auto'
      element.setAttribute('playsinline', '')
      element.setAttribute('data-mika-audio', track.id)
      return { track, element, active: false }
    })
  }
  return tracks
}

/** Mutar/slår på alla spår samtidigt – via `muted` (fungerar på iOS), plus volume där det går. */
export function setMikaAudioMuted(muted: boolean): void {
  for (const { track, element } of tracks ?? []) {
    element.muted = muted
    element.volume = muted ? 0 : track.volume
  }
}

/** Startar alla spår i loop. Anropa direkt i en klickhanterare (iOS). Kastar aldrig. */
export function startMikaAudio(muted = false): void {
  if (typeof document === 'undefined') return
  const all = getTracks()
  for (const { element } of all) if (!element.isConnected) document.body.appendChild(element)
  setMikaAudioMuted(muted)
  for (const state of all) {
    if (state.active) continue
    state.active = true
    const refused = (error: unknown) => {
      state.active = false // så att nästa gest (t.ex. mute-knappen) får försöka igen
      console.warn(`Mika-mode: kunde inte spela upp ljudet (${state.track.id})`, error)
    }
    try {
      // Nekad uppspelning (autoplay-spärr, fil saknas …) loggas – appen fortsätter som vanligt
      state.element.play()?.catch?.(refused)
    } catch (error) {
      refused(error)
    }
  }
}

/** Stoppar alla spår omedelbart och tar bort elementen ur sidan (de återanvänds nästa gång). */
export function stopMikaAudio(): void {
  for (const state of tracks ?? []) {
    state.active = false
    state.element.pause()
    state.element.currentTime = 0
    state.element.remove()
  }
}

/** Om alla spår är startade (annars startar skyddsnätet i MikaAudio de som saknas). */
export function isMikaAudioPlaying(): boolean {
  return !!tracks && tracks.every((t) => t.active)
}
