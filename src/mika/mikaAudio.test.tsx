// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MIKA_AUDIO_SRC, MIKA_DEFAULT_VOLUME, MIKA_MUSIC_SRC, MIKA_MUSIC_VOLUME } from './audio'
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
// Spelaren lägger sina <audio>-element direkt i <body> medan ljudet spelar
const voice = () => document.querySelector<HTMLAudioElement>('[data-mika-audio="voice"]')
const music = () => document.querySelector<HTMLAudioElement>('[data-mika-audio="music"]')
const both = () => [voice()!, music()!]
const muteButton = () => container.querySelector<HTMLButtonElement>('[data-mika-mute]')
const clickMute = () => act(() => muteButton()!.click())
/** Vilka element play() anropats på. */
const playedTracks = () => play.mock.contexts.map((el: unknown) => (el as HTMLElement).getAttribute('data-mika-audio'))

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
    expect(voice()).toBeNull()
    expect(music()).toBeNull()
    expect(muteButton()).toBeNull()
    expect(play).not.toHaveBeenCalled()
  })
})

describe('Mika-ljudet när Mika-mode slås på', () => {
  it('startar både röst och musik, båda i loop, med musiken lägre än rösten', () => {
    render()
    toggle()
    expect(voice()!.getAttribute('src')).toBe(MIKA_AUDIO_SRC)
    expect(music()!.getAttribute('src')).toBe(MIKA_MUSIC_SRC)
    expect(MIKA_MUSIC_SRC).toMatch(/audio\/mika-music\.mp3$/)
    for (const el of both()) {
      expect(el.loop).toBe(true)
      expect(el.muted).toBe(false)
    }
    expect(voice()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(music()!.volume).toBe(MIKA_MUSIC_VOLUME)
    expect(MIKA_MUSIC_VOLUME).toBeGreaterThanOrEqual(0.5)
    expect(MIKA_MUSIC_VOLUME).toBeLessThan(MIKA_DEFAULT_VOLUME)
    expect(playedTracks().sort()).toEqual(['music', 'voice'])
  })

  it('startar båda spåren direkt i klickhanteraren (krav i iOS Safari), inte först i en effekt', () => {
    // Utan MikaEffects finns ingen effekt som kan starta ljudet – bara själva klicket
    render(false)
    toggle()
    expect(playedTracks().sort()).toEqual(['music', 'voice'])
  })

  it('stoppar båda spåren omedelbart när läget slås av', () => {
    render()
    toggle()
    const [v, m] = both()
    toggle()
    expect(pause.mock.contexts).toEqual(expect.arrayContaining([v, m]))
    expect(v.currentTime).toBe(0)
    expect(m.currentTime).toBe(0)
    expect(voice()).toBeNull()
    expect(music()).toBeNull()
  })

  it('mute-knappen mutar båda spåren samtidigt med muted (och volym 0), och slår på igen', () => {
    render()
    toggle()
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('false')
    clickMute()
    for (const el of both()) {
      expect(el.muted).toBe(true)
      expect(el.volume).toBe(0)
    }
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('true')
    clickMute()
    for (const el of both()) expect(el.muted).toBe(false)
    expect(voice()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(music()!.volume).toBe(MIKA_MUSIC_VOLUME)
  })

  it('iOS Safari: mute fungerar på båda spåren fast volume inte går att ändra från JavaScript', () => {
    // Som på iOS: volume är alltid 1 och tilldelningar ignoreras
    const volume = vi.spyOn(HTMLMediaElement.prototype, 'volume', 'set').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'volume', 'get').mockReturnValue(1)
    render()
    toggle()
    clickMute()
    expect(volume).toHaveBeenCalled() // försöket görs, men…
    for (const el of both()) {
      expect(el.volume).toBe(1) // …ignoreras, precis som på iPhone
      expect(el.muted).toBe(true) // och båda spåren är ändå tysta
    }
    clickMute()
    for (const el of both()) expect(el.muted).toBe(false)
  })

  it('mute nollställs till "ljud på" för båda spåren nästa gång läget slås på', () => {
    render()
    toggle()
    clickMute()
    toggle() // av
    toggle() // på igen
    for (const el of both()) expect(el.muted).toBe(false)
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('false')
  })

  it('kraschar inte om webbläsaren nekar uppspelning – varnar bara', async () => {
    play.mockRejectedValue(new DOMException('Autoplay nekad', 'NotAllowedError'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render()
    toggle()
    await act(async () => {})
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('kunde inte spela upp ljudet'), expect.any(DOMException))
    expect(voice()).not.toBeNull()
  })

  it('om bara ett spår nekas spelar det andra vidare', async () => {
    play.mockImplementation(function (this: HTMLMediaElement) {
      return this.getAttribute('data-mika-audio') === 'music'
        ? Promise.reject(new DOMException('Nekad', 'NotAllowedError'))
        : Promise.resolve()
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render()
    toggle()
    await act(async () => {})
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('music')
    expect(voice()).not.toBeNull()
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

  it('startar varje spår bara en gång, även när mute ändras', () => {
    render()
    toggle()
    clickMute()
    clickMute()
    expect(playedTracks().sort()).toEqual(['music', 'voice'])
  })

  it('samma ljudelement återanvänds mellan på/av (iOS låser upp elementen vid första gesten)', () => {
    render()
    toggle()
    const [v, m] = both()
    toggle()
    toggle()
    expect(voice()).toBe(v)
    expect(music()).toBe(m)
  })
})
