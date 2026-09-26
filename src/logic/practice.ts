/** Hur många av de senast spelade orden som inte får slumpas fram igen. */
export const RECENT_LIMIT = 5

/**
 * Slumpar ett övningsord som inte finns bland `recent` (de senaste orden i sessionen).
 * Om listan är så kort att alla ord är nyligen spelade undviks bara det allra senaste,
 * så samma ord kommer aldrig två gånger i rad (så länge listan har minst två ord).
 */
export function pickPracticeWord(
  answers: readonly string[],
  recent: readonly string[],
  random: () => number = Math.random,
): string {
  if (answers.length === 0) throw new Error('Svarslistan är tom')
  const recentSet = new Set(recent.slice(-RECENT_LIMIT))
  let candidates = answers.filter((w) => !recentSet.has(w))
  if (candidates.length === 0) {
    const last = recent.at(-1)
    candidates = answers.filter((w) => w !== last)
  }
  if (candidates.length === 0) candidates = [...answers]
  return candidates[Math.floor(random() * candidates.length)]
}

/** Lägger till ett spelat ord och behåller bara de senaste `RECENT_LIMIT`. */
export function pushRecent(recent: readonly string[], word: string): string[] {
  return [...recent.filter((w) => w !== word), word].slice(-RECENT_LIMIT)
}
