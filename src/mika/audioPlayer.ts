import { MIKA_INTERRUPT_TRACK, MIKA_TRACKS, type MikaTrack } from './audio'

/**
 * Spelaren för Mika-mode-ljudet.
 *  - Bakgrundsspåren (MIKA_TRACKS: röst och musik) spelar samtidigt, i loop, oberoende av
 *    varandra, så länge Mika-mode är på.
 *  - Avbrottsspåret (MIKA_INTERRUPT_TRACK) spelas en gång när man trycker på avbrottsknappen.
 *    Under tiden spelar bakgrundsspåren vidare men mutade; när avbrottets 'ended'-händelse
 *    kommer avmutas de igen. De behöver alltså aldrig startas om (vilket iOS kunde neka
 *    utanför en gest) – de fortsätter där de hunnit.
 * Varje spår har ett eget <audio>-element som återanvänds hela sessionen.
 *
 * iOS Safari-särdrag som styr upplägget:
 *  - `volume` går inte att ändra från JavaScript på iOS (den är alltid 1 och tilldelningar
 *    ignoreras). Tystning görs därför med `muted`, som iOS respekterar. `volume` sätts ändå
 *    där den fungerar.
 *  - Uppspelning måste startas direkt i användarens gest (klicket), inte senare i en effekt
 *    efter omrendering. startMikaAudio() och startMikaInterrupt() anropas därför synkront
 *    från klickhanterarna.
 *  - Ett element som väl startats i en gest får spela igen senare, så elementen återanvänds
 *    i stället för att skapas på nytt.
 */
interface TrackState {
  track: MikaTrack
  element: HTMLAudioElement
  /** Om spåret ska spela (satt i start, nollställd i stopp eller om uppspelningen nekas). */
  active: boolean
}

let background: TrackState[] | null = null
let interrupt: TrackState | null = null
/** Anropas när avbrottet är klart; nollställs vid stopp så att inget gammalt avbrott rapporteras. */
let onInterruptEnd: (() => void) | null = null
/** Räknas upp för varje avbrott, så att ett sent avslag från ett gammalt avbrott inte avslutar ett nytt. */
let interruptRun = 0

function createTrack(track: MikaTrack, loop: boolean): TrackState {
  const element = document.createElement('audio')
  element.src = track.src
  element.loop = loop
  element.preload = 'auto'
  element.setAttribute('playsinline', '')
  element.setAttribute('data-mika-audio', track.id)
  return { track, element, active: false }
}

function getBackground(): TrackState[] {
  background ??= MIKA_TRACKS.map((track) => createTrack(track, true))
  return background
}

function getInterrupt(): TrackState {
  if (!interrupt) {
    interrupt = createTrack(MIKA_INTERRUPT_TRACK, false)
    // Avbrottet är klart när spåret faktiskt tagit slut – ingen hårdkodad timer
    interrupt.element.addEventListener('ended', () => {
      if (interrupt?.active) finishInterrupt()
    })
  }
  return interrupt
}

/** play() som aldrig kastar; `onRefused` anropas om webbläsaren nekar. */
function safePlay(state: TrackState, onRefused: () => void = () => {}) {
  const refused = (error: unknown) => {
    state.active = false // så att nästa gest får försöka igen
    console.warn(`Mika-mode: kunde inte spela upp ljudet (${state.track.id})`, error)
    onRefused()
  }
  try {
    // Nekad uppspelning (autoplay-spärr, fil saknas …) loggas – appen fortsätter som vanligt
    state.element.play()?.catch?.(refused)
  } catch (error) {
    refused(error)
  }
}

/** Tystar/avtystar bakgrundsspåren – via `muted` (fungerar på iOS), plus volume där det går. */
function setBackgroundMuted(muted: boolean): void {
  for (const { track, element } of background ?? []) {
    element.muted = muted
    element.volume = muted ? 0 : track.volume
  }
}

/** Startar bakgrundsspåren i loop. Anropa direkt i en klickhanterare (iOS). Kastar aldrig. */
export function startMikaAudio(): void {
  if (typeof document === 'undefined') return
  const all = getBackground()
  for (const { element } of all) if (!element.isConnected) document.body.appendChild(element)
  // Pågår ett avbrott ska bakgrunden vara tyst tills det är klart
  setBackgroundMuted(isMikaInterruptActive())
  for (const state of all) {
    if (state.active) continue
    state.active = true
    safePlay(state)
  }
}

/**
 * Startar avbrottet: tystar röst och musik och spelar avbrottsspåret en gång. Anropa direkt i
 * en klickhanterare (iOS). Gör ingenting om ett avbrott redan pågår. `onEnd` anropas när
 * avbrottet är klart (spåret tog slut eller kunde inte spelas) – men inte om det stoppas.
 * Returnerar om ett avbrott startades.
 */
export function startMikaInterrupt(onEnd?: () => void): boolean {
  if (typeof document === 'undefined') return false
  const state = getInterrupt()
  if (state.active) return false
  state.active = true
  const run = ++interruptRun
  onInterruptEnd = onEnd ?? null
  setBackgroundMuted(true)
  const { element, track } = state
  element.currentTime = 0
  element.muted = false
  element.volume = track.volume
  if (!element.isConnected) document.body.appendChild(element)
  // Kan avbrottet inte spelas ska bakgrunden inte bli kvar tyst – avsluta direkt
  safePlay(state, () => {
    if (run === interruptRun && onInterruptEnd !== null) finishInterrupt()
  })
  return true
}

/** Avbrottet är klart: bakgrundsspåren hörs igen, där de hunnit. */
function finishInterrupt(): void {
  const state = interrupt
  if (!state) return
  state.active = false
  state.element.remove()
  setBackgroundMuted(false)
  const done = onInterruptEnd
  onInterruptEnd = null
  done?.()
}

/** Om ett avbrott pågår just nu. */
export function isMikaInterruptActive(): boolean {
  return !!interrupt?.active
}

/** Stoppar allt Mika-ljud omedelbart – även ett pågående avbrott – och tar bort elementen ur sidan. */
export function stopMikaAudio(): void {
  onInterruptEnd = null
  interruptRun++
  for (const state of [...(background ?? []), ...(interrupt ? [interrupt] : [])]) {
    state.active = false
    state.element.pause()
    state.element.currentTime = 0
    state.element.remove()
  }
  // Nästa gång läget slås på ska ljudet höras direkt
  setBackgroundMuted(false)
}

/** Om bakgrundsspåren är startade (annars startar skyddsnätet i MikaAudio de som saknas). */
export function isMikaAudioPlaying(): boolean {
  return !!background && background.every((t) => t.active)
}
