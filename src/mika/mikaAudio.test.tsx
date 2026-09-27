// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MIKA_AUDIO_SRC, MIKA_DEFAULT_VOLUME } from './audio'
import { MikaEffects } from './MikaEffects'
import { MikaIndicator } from './MikaIndicator'
import { MikaModeProvider } from './MikaModeProvider'
import { useMikaMode } from './useMikaMode'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>

function Toggle() {
  const { toggleMikaMode } = useMikaMode()
  return <button type="button" data-toggle onClick={toggleMikaMode} />
}

const render = (withEffects = true) =>
  act(() =>
    root.render(
      <MikaModeProvider>
        <Toggle />
        <MikaIndicator />
        {withEffects && <MikaEffects />}
      </MikaModeProvider>,
    ),
  )
const toggle = () => act(() => (container.querySelector('[data-toggle]') as HTMLElement).click())
// Spelaren lägger sitt <audio>-element direkt i <body> medan rösten spelar
const audio = () => document.querySelector<HTMLAudioElement>('[data-mika-audio]')
const muteButton = () => container.querySelector<HTMLButtonElement>('[data-mika-mute]')
const clickMute = () => act(() => muteButton()!.click())

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('Mika-ljudet när Mika-mode är av', () => {
  it('varken spelas eller renderas', () => {
    render()
    expect(audio()).toBeNull()
    expect(muteButton()).toBeNull()
    expect(play).not.toHaveBeenCalled()
  })
})

describe('Mika-ljudet när Mika-mode slås på', () => {
  it('startar uppspelning av rösten i loop på 70 % volym, inte mutad', () => {
    render()
    toggle()
    expect(audio()).not.toBeNull()
    expect(audio()!.getAttribute('src')).toBe(MIKA_AUDIO_SRC)
    expect(MIKA_AUDIO_SRC).toMatch(/audio\/mika-voice\.mp3$/)
    expect(audio()!.loop).toBe(true)
    expect(audio()!.muted).toBe(false)
    expect(audio()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(MIKA_DEFAULT_VOLUME).toBeLessThan(1)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('startar direkt i klickhanteraren (krav i iOS Safari), inte först i en effekt', () => {
    // Utan MikaEffects finns ingen effekt som kan starta ljudet – bara själva klicket
    render(false)
    toggle()
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('stoppas omedelbart när läget slås av', () => {
    render()
    toggle()
    const element = audio()!
    toggle()
    expect(pause).toHaveBeenCalled()
    expect(element.currentTime).toBe(0)
    expect(audio()).toBeNull()
  })

  it('mute-knappen mutar med muted (och volym 0) och slår på igen', () => {
    render()
    toggle()
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('false')
    clickMute()
    expect(audio()!.muted).toBe(true)
    expect(audio()!.volume).toBe(0)
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('true')
    clickMute()
    expect(audio()!.muted).toBe(false)
    expect(audio()!.volume).toBe(MIKA_DEFAULT_VOLUME)
  })

  it('iOS Safari: mute fungerar fast volume inte går att ändra från JavaScript', () => {
    // Som på iOS: volume är alltid 1 och tilldelningar ignoreras
    const volume = vi.spyOn(HTMLMediaElement.prototype, 'volume', 'set').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'volume', 'get').mockReturnValue(1)
    render()
    toggle()
    clickMute()
    expect(volume).toHaveBeenCalled() // försöket görs, men…
    expect(audio()!.volume).toBe(1) // …ignoreras, precis som på iPhone
    expect(audio()!.muted).toBe(true) // och ljudet är ändå avstängt
    clickMute()
    expect(audio()!.muted).toBe(false)
  })

  it('mute nollställs till "ljud på" nästa gång läget slås på', () => {
    render()
    toggle()
    clickMute()
    expect(audio()!.muted).toBe(true)
    toggle() // av
    toggle() // på igen
    expect(audio()!.muted).toBe(false)
    expect(audio()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('false')
  })

  it('kraschar inte om webbläsaren nekar uppspelning – varnar bara', async () => {
    play.mockRejectedValue(new DOMException('Autoplay nekad', 'NotAllowedError'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render()
    toggle()
    await act(async () => {})
    expect(warn).toHaveBeenCalledWith('Mika-mode: kunde inte spela upp ljudet', expect.any(DOMException))
    expect(audio()).not.toBeNull()
  })

  it('kraschar inte i webbläsare där play() inte returnerar något eller kastar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    play.mockReturnValue(undefined as unknown as Promise<void>)
    render()
    expect(() => toggle()).not.toThrow()
    toggle()
    play.mockImplementation(() => {
      throw new Error('play saknas')
    })
    expect(() => toggle()).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('startar bara en gång, även när mute ändras', () => {
    render()
    toggle()
    clickMute()
    clickMute()
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('samma ljudelement återanvänds mellan på/av (iOS låser upp elementet vid första gesten)', () => {
    render()
    toggle()
    const first = audio()
    toggle()
    toggle()
    expect(audio()).toBe(first)
  })
})
