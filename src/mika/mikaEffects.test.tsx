// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MIN_FLASH_INTERVAL_MS } from './disco'
import { MikaEffects } from './MikaEffects'
import { MikaModeProvider } from './MikaModeProvider'
import { RAIN_COUNT, RAIN_COUNT_REDUCED } from './rain'
import { useMikaMode } from './useMikaMode'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

/** jsdom saknar matchMedia – låtsas att användaren har (eller inte har) reducerade animationer. */
function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

function Toggle() {
  const { toggleMikaMode } = useMikaMode()
  return <button type="button" data-toggle onClick={toggleMikaMode} />
}

const render = () =>
  act(() =>
    root.render(
      <MikaModeProvider>
        <Toggle />
        <MikaEffects />
      </MikaModeProvider>,
    ),
  )
const toggle = () => act(() => (container.querySelector('[data-toggle]') as HTMLElement).click())
const disco = () => container.querySelector<HTMLElement>('[data-mika-disco]')
const particles = () => container.querySelectorAll('[data-mika-particle]')
const bodyOverrides = () => document.body.getAttribute('style') ?? ''

/** Stegar fram tiden i små steg och noterar när diskofärgen byts. */
function recordColorChanges(totalMs: number, stepMs = 10) {
  const changes: number[] = []
  let last = disco()?.dataset.mikaDisco
  for (let t = stepMs; t <= totalMs; t += stepMs) {
    act(() => vi.advanceTimersByTime(stepMs))
    const now = disco()?.dataset.mikaDisco
    if (now !== last) changes.push(t)
    last = now
  }
  return changes
}

beforeEach(() => {
  vi.useFakeTimers()
  mockReducedMotion(false)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('diskoläge av (Mika-mode av)', () => {
  it('visar ingenting, kör inga timers och rör inte body', () => {
    render()
    expect(disco()).toBeNull()
    expect(particles()).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(bodyOverrides()).toBe('')
    act(() => vi.advanceTimersByTime(10_000))
    expect(disco()).toBeNull()
  })
})

describe('diskoläge på', () => {
  it('startar direkt: blinkande bakgrund och regn', () => {
    render()
    toggle()
    expect(disco()).not.toBeNull()
    expect(particles()).toHaveLength(RAIN_COUNT)
    expect(bodyOverrides()).toContain('background-color: transparent')
  })

  it('byter färg, men aldrig oftare än var 330:e ms (färre än 3 per sekund)', () => {
    render()
    toggle()
    const changes = recordColorChanges(10_000)
    expect(changes.length).toBeGreaterThan(5)
    const gaps = changes.slice(1).map((t, i) => t - changes[i])
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_FLASH_INTERVAL_MS)
    // Över valfri sekund: högst 2 byten
    for (let start = 0; start < 9000; start += 100) {
      expect(changes.filter((t) => t > start && t <= start + 1000).length).toBeLessThan(3)
    }
  })

  it('försvinner direkt när läget slås av: inga lager, inga timers, body återställd', () => {
    render()
    toggle()
    act(() => vi.advanceTimersByTime(2000))
    toggle()
    expect(disco()).toBeNull()
    expect(particles()).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(bodyOverrides()).toBe('')
  })
})

describe('diskoläge med prefers-reduced-motion', () => {
  it('stänger av blinket helt och glesar ut regnet', () => {
    mockReducedMotion(true)
    render()
    toggle()
    expect(disco()).not.toBeNull()
    expect(recordColorChanges(10_000)).toEqual([])
    expect(disco()!.style.transition).toBe('none')
    expect(particles()).toHaveLength(RAIN_COUNT_REDUCED)
  })
})
