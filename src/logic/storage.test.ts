import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyResult,
  emptyStats,
  getCurrentStreak,
  hasSeenHelp,
  loadDailyState,
  loadStats,
  markHelpSeen,
  memoryStore,
  recordResult,
  saveDailyState,
  winPercent,
  type KeyValueStore,
} from './storage'

let store: KeyValueStore
beforeEach(() => {
  store = memoryStore()
})

describe('dagens ord – sparat läge', () => {
  it('återställer sparat läge för samma dag', () => {
    const save = { date: '2026-09-26', answer: 'skola', guesses: ['stark', 'skola'] }
    saveDailyState(save, store)
    expect(loadDailyState('2026-09-26', store)).toEqual(save)
  })

  it('ignorerar sparat läge från en annan dag', () => {
    saveDailyState({ date: '2026-09-25', answer: 'skola', guesses: ['stark'] }, store)
    expect(loadDailyState('2026-09-26', store)).toBeNull()
  })

  it('returnerar null när inget är sparat eller datan är trasig', () => {
    expect(loadDailyState('2026-09-26', store)).toBeNull()
    store.setItem('ordel:daily:v1', '{inte json')
    expect(loadDailyState('2026-09-26', store)).toBeNull()
    store.setItem('ordel:daily:v1', JSON.stringify({ date: '2026-09-26', answer: 'skola', guesses: [1, 2] }))
    expect(loadDailyState('2026-09-26', store)).toBeNull()
  })

  it('kraschar inte när lagringen kastar', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blockerad')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(() => saveDailyState({ date: 'x', answer: 'skola', guesses: [] }, broken)).not.toThrow()
    expect(loadDailyState('x', broken)).toBeNull()
    expect(loadStats(broken)).toEqual(emptyStats())
  })
})

describe('statistik – dagens ord', () => {
  const win = (date: string, guessCount = 3) => ({ mode: 'daily' as const, won: true, guessCount, date })
  const loss = (date: string) => ({ mode: 'daily' as const, won: false, guessCount: 6, date })

  it('räknar spelade, vinster och fördelning', () => {
    let s = emptyStats()
    s = applyResult(s, win('2026-09-24', 3))
    s = applyResult(s, loss('2026-09-25'))
    s = applyResult(s, win('2026-09-26', 1))
    expect(s.daily).toMatchObject({ played: 3, wins: 2, distribution: [1, 0, 1, 0, 0, 0] })
  })

  it('streak ökar vid vinster på varandra följande dagar', () => {
    let s = emptyStats()
    for (const d of ['2026-09-24', '2026-09-25', '2026-09-26']) s = applyResult(s, win(d))
    expect(s.daily).toMatchObject({ currentStreak: 3, maxStreak: 3 })
  })

  it('streak nollställs vid förlust men längsta streak finns kvar', () => {
    let s = emptyStats()
    for (const d of ['2026-09-23', '2026-09-24']) s = applyResult(s, win(d))
    s = applyResult(s, loss('2026-09-25'))
    expect(s.daily).toMatchObject({ currentStreak: 0, maxStreak: 2 })
    s = applyResult(s, win('2026-09-26'))
    expect(s.daily).toMatchObject({ currentStreak: 1, maxStreak: 2 })
  })

  it('streak börjar om när man hoppat över en dag', () => {
    let s = applyResult(emptyStats(), win('2026-09-24'))
    s = applyResult(s, win('2026-09-26'))
    expect(s.daily.currentStreak).toBe(1)
  })

  it('streak fortsätter över månads- och årsskiften', () => {
    let s = applyResult(emptyStats(), win('2025-12-31'))
    s = applyResult(s, win('2026-01-01'))
    expect(s.daily.currentStreak).toBe(2)
  })

  it('samma dag räknas bara en gång', () => {
    const once = applyResult(emptyStats(), win('2026-09-26'))
    expect(applyResult(once, win('2026-09-26'))).toBe(once)
    expect(applyResult(once, loss('2026-09-26'))).toBe(once)
  })

  it('getCurrentStreak visar 0 om streaken brutits av en överhoppad dag', () => {
    const s = applyResult(applyResult(emptyStats(), win('2026-09-24')), win('2026-09-25'))
    expect(getCurrentStreak(s.daily, '2026-09-25')).toBe(2) // spelat i dag
    expect(getCurrentStreak(s.daily, '2026-09-26')).toBe(2) // inte spelat i dag än
    expect(getCurrentStreak(s.daily, '2026-09-27')).toBe(0) // missade 26:e
  })
})

describe('statistik – övningsläge', () => {
  it('räknas separat från dagens ord', () => {
    let s = emptyStats()
    s = applyResult(s, { mode: 'practice', won: true, guessCount: 4 })
    s = applyResult(s, { mode: 'practice', won: false, guessCount: 6 })
    s = applyResult(s, { mode: 'practice', won: true, guessCount: 2 })
    expect(s.practice).toEqual({ played: 3, wins: 2 })
    expect(s.daily).toEqual(emptyStats().daily)
  })

  it('flera omgångar samma dag räknas alla', () => {
    let s = emptyStats()
    for (let i = 0; i < 10; i++) s = applyResult(s, { mode: 'practice', won: true, guessCount: 3 })
    expect(s.practice.played).toBe(10)
  })
})

describe('recordResult och loadStats', () => {
  it('sparar och läser tillbaka statistik', () => {
    recordResult({ mode: 'daily', won: true, guessCount: 2, date: '2026-09-26' }, store)
    recordResult({ mode: 'practice', won: false, guessCount: 6 }, store)
    const s = loadStats(store)
    expect(s.daily).toMatchObject({ played: 1, wins: 1, currentStreak: 1, distribution: [0, 1, 0, 0, 0, 0] })
    expect(s.practice).toEqual({ played: 1, wins: 0 })
  })

  it('ersätter trasiga fält med standardvärden och behåller resten', () => {
    store.setItem(
      'ordel:stats:v1',
      JSON.stringify({ daily: { played: 5, wins: 'fem', distribution: [1, 2] }, practice: { played: 3, wins: 1 } }),
    )
    const s = loadStats(store)
    expect(s.daily.played).toBe(5)
    expect(s.daily.wins).toBe(0)
    expect(s.daily.distribution).toEqual([0, 0, 0, 0, 0, 0])
    expect(s.practice).toEqual({ played: 3, wins: 1 })
  })
})

describe('winPercent', () => {
  it('avrundar och hanterar noll spelade', () => {
    expect(winPercent(0, 0)).toBe(0)
    expect(winPercent(3, 2)).toBe(67)
    expect(winPercent(4, 4)).toBe(100)
  })
})

describe('hjälp vid första besöket', () => {
  it('är osedd tills den markerats', () => {
    expect(hasSeenHelp(store)).toBe(false)
    markHelpSeen(store)
    expect(hasSeenHelp(store)).toBe(true)
  })
})
