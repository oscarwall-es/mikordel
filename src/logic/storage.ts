import { daysBetween } from './daily'
import { MAX_GUESSES } from './evaluate'
import type { GameMode } from './game'

/** Minsta gemensamma nämnare med localStorage, så tester (och ev. annan lagring) kan injicera egen. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

// Nycklarna behåller det ursprungliga namnet "ordel" – byts de förlorar befintliga spelare sin statistik.
const DAILY_KEY = 'ordel:daily:v1'
const STATS_KEY = 'ordel:stats:v1'
const HELP_SEEN_KEY = 'ordel:help-seen:v1'

/**
 * localStorage kan saknas eller kasta (privat läge, blockerade cookies). Då faller vi tillbaka
 * på ett minneslager för sessionen, så spelet fungerar – det sparas bara inte.
 */
function defaultStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage
    const probe = '__ordel_probe__'
    ls.setItem(probe, probe)
    ls.removeItem(probe)
    return ls
  } catch {
    return memoryStore()
  }
}

export function memoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

let fallback: KeyValueStore | undefined
const resolveStore = (store?: KeyValueStore) => store ?? (fallback ??= defaultStore())

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Full eller blockerad lagring – spelet fortsätter utan att spara.
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isNonNegInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

// ---------------------------------------------------------------------------
// Dagens ord
// ---------------------------------------------------------------------------

/**
 * Sparat läge för dagens ord. Bara gissningarna sparas – färger och status räknas om
 * via createGameState. Facit sparas så att en uppdaterad ordlista mitt under dagen inte
 * byter ord för någon som redan börjat.
 */
export interface DailySave {
  date: string
  answer: string
  guesses: string[]
}

/** Returnerar sparat läge för `today`, eller null om inget finns / det gäller en annan dag. */
export function loadDailyState(today: string, store?: KeyValueStore): DailySave | null {
  const data = readJson(resolveStore(store), DAILY_KEY)
  if (
    !isObject(data) ||
    data.date !== today ||
    typeof data.answer !== 'string' ||
    !Array.isArray(data.guesses) ||
    !data.guesses.every((g) => typeof g === 'string')
  ) {
    return null
  }
  return { date: data.date, answer: data.answer, guesses: data.guesses as string[] }
}

export function saveDailyState(save: DailySave, store?: KeyValueStore): void {
  writeJson(resolveStore(store), DAILY_KEY, save)
}

// ---------------------------------------------------------------------------
// Statistik
// ---------------------------------------------------------------------------

export interface DailyStats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** distribution[i] = antal vinster på i+1 försök. */
  distribution: number[]
  /** Datum för senast registrerade resultat; skyddar mot dubbelräkning vid omladdning. */
  lastPlayedDate: string | null
  lastWonDate: string | null
}

export interface PracticeStats {
  played: number
  wins: number
}

export interface Stats {
  daily: DailyStats
  practice: PracticeStats
}

export type GameResult =
  | { mode: Extract<GameMode, 'daily'>; won: boolean; guessCount: number; date: string }
  | { mode: Extract<GameMode, 'practice'>; won: boolean; guessCount: number }

export function emptyStats(): Stats {
  return {
    daily: {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      distribution: new Array(MAX_GUESSES).fill(0),
      lastPlayedDate: null,
      lastWonDate: null,
    },
    practice: { played: 0, wins: 0 },
  }
}

/** Läser statistik; saknade eller trasiga fält ersätts med standardvärden i stället för att allt nollställs. */
export function loadStats(store?: KeyValueStore): Stats {
  const stats = emptyStats()
  const data = readJson(resolveStore(store), STATS_KEY)
  if (!isObject(data)) return stats

  if (isObject(data.daily)) {
    const d = data.daily
    for (const key of ['played', 'wins', 'currentStreak', 'maxStreak'] as const) {
      if (isNonNegInt(d[key])) stats.daily[key] = d[key]
    }
    if (Array.isArray(d.distribution) && d.distribution.length === MAX_GUESSES && d.distribution.every(isNonNegInt)) {
      stats.daily.distribution = [...d.distribution]
    }
    if (typeof d.lastPlayedDate === 'string') stats.daily.lastPlayedDate = d.lastPlayedDate
    if (typeof d.lastWonDate === 'string') stats.daily.lastWonDate = d.lastWonDate
  }
  if (isObject(data.practice)) {
    const p = data.practice
    if (isNonNegInt(p.played)) stats.practice.played = p.played
    if (isNonNegInt(p.wins)) stats.practice.wins = p.wins
  }
  return stats
}

export function saveStats(stats: Stats, store?: KeyValueStore): void {
  writeJson(resolveStore(store), STATS_KEY, stats)
}

/** Ren funktion: ny statistik efter ett avslutat spel. Ett andra dagligt resultat för samma datum ignoreras. */
export function applyResult(stats: Stats, result: GameResult): Stats {
  if (result.mode === 'practice') {
    return {
      ...stats,
      practice: {
        played: stats.practice.played + 1,
        wins: stats.practice.wins + (result.won ? 1 : 0),
      },
    }
  }

  const d = stats.daily
  if (d.lastPlayedDate === result.date) return stats

  const distribution = [...d.distribution]
  let currentStreak = 0
  if (result.won) {
    if (result.guessCount >= 1 && result.guessCount <= MAX_GUESSES) distribution[result.guessCount - 1]++
    const continues = d.lastWonDate !== null && daysBetween(d.lastWonDate, result.date) === 1
    currentStreak = continues ? d.currentStreak + 1 : 1
  }

  return {
    ...stats,
    daily: {
      played: d.played + 1,
      wins: d.wins + (result.won ? 1 : 0),
      currentStreak,
      maxStreak: Math.max(d.maxStreak, currentStreak),
      distribution,
      lastPlayedDate: result.date,
      lastWonDate: result.won ? result.date : d.lastWonDate,
    },
  }
}

/** Läser, uppdaterar och sparar statistiken. Returnerar den nya statistiken. */
export function recordResult(result: GameResult, store?: KeyValueStore): Stats {
  const s = resolveStore(store)
  const next = applyResult(loadStats(s), result)
  saveStats(next, s)
  return next
}

/**
 * Streak att visa i dag. Den sparade streaken uppdateras bara när man spelar, så om man
 * hoppat över en dag är den bruten även om det sparade värdet inte hunnit nollställas.
 */
export function getCurrentStreak(daily: DailyStats, today: string): number {
  if (daily.lastWonDate === null) return 0
  return daysBetween(daily.lastWonDate, today) <= 1 ? daily.currentStreak : 0
}

export function winPercent(played: number, wins: number): number {
  return played === 0 ? 0 : Math.round((wins / played) * 100)
}

// ---------------------------------------------------------------------------
// Övrigt
// ---------------------------------------------------------------------------

/** Om spelaren redan sett hjälpen – används för att visa den automatiskt vid första besöket. */
export function hasSeenHelp(store?: KeyValueStore): boolean {
  return readJson(resolveStore(store), HELP_SEEN_KEY) === true
}

export function markHelpSeen(store?: KeyValueStore): void {
  writeJson(resolveStore(store), HELP_SEEN_KEY, true)
}
