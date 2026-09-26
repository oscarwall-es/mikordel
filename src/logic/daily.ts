/** Dag 0 för dagens ord. Ändras den byter alla spelare ord samtidigt – rör den inte i onödan. */
export const START_DATE_KEY = '2024-01-01'

const MS_PER_DAY = 86_400_000

/**
 * Kalenderdatum som "YYYY-MM-DD" i spelarens lokala tidszon,
 * så att dagens ord byts vid lokal midnatt.
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Dagar räknat i UTC utifrån datumdelarna, så sommartid inte ger 23- eller 25-timmarsdygn. */
function dateKeyToDayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

/** Antal hela kalenderdagar från `fromKey` till `toKey` (negativt om `toKey` är tidigare). */
export function daysBetween(fromKey: string, toKey: string): number {
  return dateKeyToDayNumber(toKey) - dateKeyToDayNumber(fromKey)
}

/** Dagnummer sedan startdatumet (0 på startdatumet). */
export function getDayNumber(date: Date): number {
  return daysBetween(START_DATE_KEY, toDateKey(date))
}

/** Index i svarslistan för ett visst datum. Alltid inom [0, listLength), även före startdatumet. */
export function getDailyWordIndex(date: Date, listLength: number): number {
  if (!Number.isInteger(listLength) || listLength <= 0) {
    throw new Error('Svarslistan måste innehålla minst ett ord')
  }
  const day = getDayNumber(date)
  return ((day % listLength) + listLength) % listLength
}

export function getDailyWord(date: Date, answers: readonly string[]): string {
  return answers[getDailyWordIndex(date, answers.length)]
}
