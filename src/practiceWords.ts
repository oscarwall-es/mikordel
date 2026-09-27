import { pickPracticeWord } from './logic/practice'

/**
 * Nästa övningsord: som pickPracticeWord (undviker de senaste orden), men dagens ord är
 * undantaget hela dagen – inte bara så länge det råkar ligga i fönstret med senaste ord.
 */
export function nextPracticeWord(
  answers: readonly string[],
  dailyAnswer: string,
  recent: readonly string[],
  random: () => number = Math.random,
): string {
  const pool = answers.filter((w) => w !== dailyAnswer)
  // Skyddsnät för en svarslista med bara dagens ord: då finns inget annat att välja
  return pickPracticeWord(pool.length > 0 ? pool : answers, recent, random)
}
