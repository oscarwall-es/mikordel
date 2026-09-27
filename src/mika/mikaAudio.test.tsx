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

const render = () =>
  act(() =>
    root.render(
      <MikaModeProvider>
        <Toggle />
        <MikaIndicator />
        <MikaEffects />
      </MikaModeProvider>,
    ),
  )
const toggle = () => act(() => (container.querySelector('[data-toggle]') as HTMLElement).click())
const audio = () => container.querySelector<HTMLAudioElement>('[data-mika-audio]')
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
  it('startar uppspelning av rösten i loop på 70 % volym', () => {
    render()
    toggle()
    expect(audio()).not.toBeNull()
    expect(audio()!.getAttribute('src')).toBe(MIKA_AUDIO_SRC)
    expect(MIKA_AUDIO_SRC).toMatch(/audio\/mika-voice\.mp3$/)
    expect(audio()!.loop).toBe(true)
    expect(audio()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(MIKA_DEFAULT_VOLUME).toBeLessThan(1)
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

  it('mute-knappen sätter volymen till 0 och tillbaka', () => {
    render()
    toggle()
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('false')
    clickMute()
    expect(audio()!.volume).toBe(0)
    expect(muteButton()!.getAttribute('aria-pressed')).toBe('true')
    clickMute()
    expect(audio()!.volume).toBe(MIKA_DEFAULT_VOLUME)
  })

  it('mute nollställs till "ljud på" nästa gång läget slås på', () => {
    render()
    toggle()
    clickMute()
    expect(audio()!.volume).toBe(0)
    toggle() // av
    toggle() // på igen
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

  it('kraschar inte i webbläsare där play() inte returnerar något', () => {
    play.mockReturnValue(undefined as unknown as Promise<void>)
    render()
    expect(() => toggle()).not.toThrow()
  })

  it('startar bara en gång, även när mute ändras', () => {
    render()
    toggle()
    clickMute()
    clickMute()
    expect(play).toHaveBeenCalledTimes(1)
  })
})
