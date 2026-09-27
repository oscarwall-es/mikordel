// @vitest-environment jsdom
import { act, useEffect, useReducer, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Header } from '../components/Header'
import { getDailyWordIndex } from '../logic/daily'
import { evaluateGuess } from '../logic/evaluate'
import { createGameReducer, createGameState, type GameAction } from '../logic/game'
import { pickPracticeWord } from '../logic/practice'
import { MikaIndicator } from './MikaIndicator'
import { MIKA_MODE_DEFAULT } from './mikaMode'
import { MikaModeProvider } from './MikaModeProvider'
import { useMikaMode } from './useMikaMode'

// Säger åt React att vi kör i en testmiljö där act() används
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = (ui: ReactNode) => act(() => root.render(ui))
const click = (el: Element | null) => act(() => (el as HTMLElement).click())

/** Visar flaggan och en knapp som slår om den. */
function Probe() {
  const { mikaMode, toggleMikaMode } = useMikaMode()
  return (
    <button type="button" data-probe onClick={toggleMikaMode}>
      {String(mikaMode)}
    </button>
  )
}
const probe = () => container.querySelector('[data-probe]')!

describe('Mika-mode-flaggan', () => {
  it('är av som standard', () => {
    expect(MIKA_MODE_DEFAULT).toBe(false)
    render(
      <MikaModeProvider>
        <Probe />
      </MikaModeProvider>,
    )
    expect(probe().textContent).toBe('false')
  })

  it('toggle slår på och av', () => {
    render(
      <MikaModeProvider>
        <Probe />
      </MikaModeProvider>,
    )
    click(probe())
    expect(probe().textContent).toBe('true')
    click(probe())
    expect(probe().textContent).toBe('false')
  })

  it('är av igen efter omladdning (ny montering), och sparas aldrig', () => {
    render(
      <MikaModeProvider>
        <Probe />
      </MikaModeProvider>,
    )
    click(probe())
    expect(probe().textContent).toBe('true')
    // "Omladdning": avmontera hela trädet och montera ett nytt
    act(() => root.unmount())
    root = createRoot(container)
    render(
      <MikaModeProvider>
        <Probe />
      </MikaModeProvider>,
    )
    expect(probe().textContent).toBe('false')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(location.search + location.hash).toBe('')
  })

  it('är av, och toggle gör ingenting, utan provider', () => {
    render(<Probe />)
    click(probe())
    expect(probe().textContent).toBe('false')
  })
})

describe('knappen och indikatorn', () => {
  const noop = () => {}
  const renderHeader = () =>
    render(
      <MikaModeProvider>
        <Header onHelp={noop} onStats={noop} onColors={noop} />
        <MikaIndicator />
      </MikaModeProvider>,
    )
  // Knappen finns i två lägen (höger/vänster beroende på skärmbredd); de styrs av samma flagga
  const buttons = () => [...container.querySelectorAll('button[aria-label="Mika-mode"]')]
  const indicator = () => container.querySelector('[data-mika-indicator]')

  it('knappen ser ut som de andra ikonknapparna när läget är av, och ingen indikator visas', () => {
    renderHeader()
    const palette = container.querySelector('button[aria-label="Bakgrundsfärg"]')!
    expect(buttons()).toHaveLength(2)
    for (const b of buttons()) {
      expect(b.className).toBe(palette.className)
      expect(b.getAttribute('aria-pressed')).toBe('false')
    }
    expect(indicator()).toBeNull()
  })

  it('ett klick slår på: knappen markeras och indikatorn visas; nästa klick slår av', () => {
    renderHeader()
    click(buttons()[1])
    for (const b of buttons()) {
      expect(b.getAttribute('aria-pressed')).toBe('true')
      expect(b.className).toContain('bg-fuchsia-500')
    }
    expect(indicator()).not.toBeNull()
    expect(indicator()!.textContent).toContain('Mika-mode')
    click(buttons()[0])
    expect(buttons().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
    expect(indicator()).toBeNull()
  })

  it('indikatorn släpper igenom klick (täcker inget)', () => {
    renderHeader()
    click(buttons()[1])
    expect(indicator()!.className).toContain('pointer-events-none')
  })
})

describe('spellogiken påverkas inte av Mika-mode', () => {
  it('src/logic och src/data importerar ingenting från src/mika', () => {
    const sources = import.meta.glob(['../logic/**/*.ts', '!../logic/**/*.test.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(5)
    const offenders = Object.entries(sources).filter(([, src]) => /mika/i.test(src))
    expect(offenders.map(([path]) => path)).toEqual([])
  })

  it('evaluateGuess, reducern och daily/practice ger samma resultat med läget på som av', () => {
    const reducer = createGameReducer((w) => ['glass', 'skola', 'stark'].includes(w))
    const actions: GameAction[] = [...'glass'].map((letter) => ({ type: 'addLetter', letter }) as GameAction)
    actions.push({ type: 'submit' })
    const latest: { current: unknown } = { current: null }

    function Game() {
      const { mikaMode, toggleMikaMode } = useMikaMode()
      const [game, dispatch] = useReducer(reducer, undefined, () => createGameState('daily', 'skola'))
      useEffect(() => {
        latest.current = {
          mikaMode,
          game,
          evaluate: evaluateGuess('glass', 'skola'),
          daily: getDailyWordIndex(new Date(2026, 8, 27), 1062),
          practice: pickPracticeWord(['a', 'b', 'c'], ['a'], () => 0.5),
        }
      })
      return (
        <>
          <button type="button" data-toggle onClick={toggleMikaMode} />
          <button type="button" data-play onClick={() => actions.forEach(dispatch)} />
        </>
      )
    }

    const run = (withMika: boolean) => {
      render(
        <MikaModeProvider>
          <Game key={String(withMika)} />
        </MikaModeProvider>,
      )
      if (withMika) click(container.querySelector('[data-toggle]'))
      click(container.querySelector('[data-play]'))
      const { mikaMode, ...rest } = latest.current as { mikaMode: boolean }
      expect(mikaMode).toBe(withMika)
      return rest
    }

    const off = run(false)
    act(() => root.unmount())
    root = createRoot(container)
    const on = run(true)
    expect(on).toEqual(off)
    // …och resultatet är detsamma som den rena reducern ger helt utan React
    expect((off as { game: unknown }).game).toEqual(actions.reduce(reducer, createGameState('daily', 'skola')))
  })
})
