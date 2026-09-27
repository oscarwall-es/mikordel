// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MIKA_AUDIO_SRC,
  MIKA_DEFAULT_VOLUME,
  MIKA_INTERRUPT_SRC,
  MIKA_MUSIC_SRC,
  MIKA_MUSIC_VOLUME,
} from './audio'
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
// Spelaren lägger sina <audio>-element direkt i <body> medan de spelar
const track = (id: string) => document.querySelector<HTMLAudioElement>(`[data-mika-audio="${id}"]`)
const voice = () => track('voice')
const music = () => track('music')
const interrupt = () => track('interrupt')
const background = () => [voice()!, music()!]
const button = () => container.querySelector<HTMLButtonElement>('[data-mika-interrupt]')
const clickButton = () => act(() => button()!.click())
/** Avbrottsspåret tar slut – samma 'ended'-händelse som webbläsaren skickar. */
const endInterrupt = (el = interrupt()!) => act(() => void el.dispatchEvent(new Event('ended')))
/** Vilka spår play() anropats på, i ordning. */
const played = (): (string | null)[] => play.mock.contexts.map((el: unknown) => (el as HTMLElement).getAttribute('data-mika-audio'))

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
    expect(interrupt()).toBeNull()
    expect(button()).toBeNull()
    expect(play).not.toHaveBeenCalled()
  })
})

describe('Mika-ljudet när Mika-mode slås på', () => {
  it('startar röst och musik (inte avbrottet), båda i loop, musiken lägre än rösten', () => {
    render()
    toggle()
    expect(voice()!.getAttribute('src')).toBe(MIKA_AUDIO_SRC)
    expect(music()!.getAttribute('src')).toBe(MIKA_MUSIC_SRC)
    for (const el of background()) {
      expect(el.loop).toBe(true)
      expect(el.muted).toBe(false)
    }
    expect(voice()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(music()!.volume).toBe(MIKA_MUSIC_VOLUME)
    expect(MIKA_MUSIC_VOLUME).toBeLessThan(MIKA_DEFAULT_VOLUME)
    expect(interrupt()).toBeNull()
    expect(played().sort()).toEqual(['music', 'voice'])
  })

  it('startar röst och musik direkt i klickhanteraren (krav i iOS Safari), inte först i en effekt', () => {
    render(false)
    toggle()
    expect(played().sort()).toEqual(['music', 'voice'])
  })

  it('stoppar båda spåren omedelbart när läget slås av', () => {
    render()
    toggle()
    const [v, m] = background()
    toggle()
    expect(pause.mock.contexts).toEqual(expect.arrayContaining([v, m]))
    expect(v.currentTime).toBe(0)
    expect(m.currentTime).toBe(0)
    expect(voice()).toBeNull()
    expect(music()).toBeNull()
  })

  it('samma ljudelement återanvänds mellan på/av (iOS låser upp elementen vid första gesten)', () => {
    render()
    toggle()
    const [v, m] = background()
    toggle()
    toggle()
    expect(voice()).toBe(v)
    expect(music()).toBe(m)
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
})

describe('avbrottsknappen', () => {
  it('ser ut som förut (högtalare, inte inaktiverad) när inget avbrott pågår', () => {
    render()
    toggle()
    expect(button()!.disabled).toBe(false)
    expect(button()!.getAttribute('aria-label')).toBe('Avbryt med Mika')
    expect(button()!.getAttribute('aria-pressed')).toBeNull() // inte längre en av/på-knapp
  })

  it('klick tystar röst och musik med muted och spelar avbrottet en gång, direkt i klicket', () => {
    render()
    toggle()
    clickButton()
    for (const el of background()) {
      expect(el.muted).toBe(true)
      expect(el.volume).toBe(0)
    }
    expect(interrupt()).not.toBeNull()
    expect(interrupt()!.getAttribute('src')).toBe(MIKA_INTERRUPT_SRC)
    expect(interrupt()!.loop).toBe(false)
    expect(interrupt()!.muted).toBe(false)
    expect(played().filter((id) => id === 'interrupt')).toHaveLength(1)
    // Röst och musik pausas inte – de spelar vidare, tysta
    expect(pause).not.toHaveBeenCalled()
  })

  it('under avbrottet: kryss-ikon, inaktiverad knapp, och nya klick gör ingenting', () => {
    render()
    toggle()
    clickButton()
    expect(button()!.disabled).toBe(true)
    expect(button()!.getAttribute('aria-label')).toBe('Mikas avbrott pågår')
    const startedAt = interrupt()!.currentTime
    // Både ett klick på den inaktiverade knappen och ett direkt anrop ska ignoreras
    clickButton()
    act(() => void button()!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(played().filter((id) => id === 'interrupt')).toHaveLength(1)
    expect(interrupt()!.currentTime).toBe(startedAt)
    for (const el of background()) expect(el.muted).toBe(true)
  })

  it('när avbrottsspåret tar slut (ended) hörs röst och musik igen automatiskt', () => {
    render()
    toggle()
    const playsBefore = play.mock.calls.length
    clickButton()
    endInterrupt()
    for (const el of background()) expect(el.muted).toBe(false)
    expect(voice()!.volume).toBe(MIKA_DEFAULT_VOLUME)
    expect(music()!.volume).toBe(MIKA_MUSIC_VOLUME)
    expect(interrupt()).toBeNull()
    expect(button()!.disabled).toBe(false)
    expect(button()!.getAttribute('aria-label')).toBe('Avbryt med Mika')
    // Bara avbrottet spelades – röst och musik behövde aldrig startas om
    expect(play.mock.calls.length).toBe(playsBefore + 1)
  })

  it('går att avbryta igen efteråt, och avbrottet börjar då från början', () => {
    render()
    toggle()
    clickButton()
    const el = interrupt()!
    el.currentTime = 9
    endInterrupt()
    clickButton()
    expect(interrupt()).toBe(el)
    expect(el.currentTime).toBe(0)
    expect(played().filter((id) => id === 'interrupt')).toHaveLength(2)
  })

  it('Mika-mode av mitt under avbrottet: allt stoppas och städas, och ett sent ended gör ingenting', () => {
    render()
    toggle()
    clickButton()
    const el = interrupt()!
    toggle() // av
    expect(pause.mock.contexts).toContain(el)
    expect(el.currentTime).toBe(0)
    expect(interrupt()).toBeNull()
    expect(voice()).toBeNull()
    expect(button()).toBeNull()
    endInterrupt(el) // ett sent 'ended' från det stoppade spåret
    expect(voice()).toBeNull()
    toggle() // på igen: ljud direkt, inget avbrott kvar
    for (const e of background()) expect(e.muted).toBe(false)
    expect(interrupt()).toBeNull()
    expect(button()!.disabled).toBe(false)
  })

  it('nekas avbrottsspåret hörs röst och musik igen direkt (de blir inte kvar tysta)', async () => {
    play.mockImplementation(function (this: HTMLMediaElement) {
      return this.getAttribute('data-mika-audio') === 'interrupt'
        ? Promise.reject(new DOMException('Nekad', 'NotAllowedError'))
        : Promise.resolve()
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render()
    toggle()
    clickButton()
    await act(async () => {})
    expect(warn.mock.calls[0][0]).toContain('interrupt')
    for (const el of background()) expect(el.muted).toBe(false)
    expect(button()!.disabled).toBe(false)
  })

  it('iOS Safari: avbrottet tystar och återställer via muted fast volume inte går att ändra', () => {
    // Som på iOS: volume är alltid 1 och tilldelningar ignoreras
    vi.spyOn(HTMLMediaElement.prototype, 'volume', 'set').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'volume', 'get').mockReturnValue(1)
    render()
    toggle()
    clickButton()
    for (const el of background()) {
      expect(el.volume).toBe(1) // ignoreras, precis som på iPhone…
      expect(el.muted).toBe(true) // …men tystnaden fungerar ändå
    }
    endInterrupt()
    for (const el of background()) expect(el.muted).toBe(false)
  })

  it('ett avbrott vid avstängt läge är omöjligt (ingen knapp, inget ljud)', () => {
    render()
    expect(button()).toBeNull()
    expect(interrupt()).toBeNull()
  })
})
