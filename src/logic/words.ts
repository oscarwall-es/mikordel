import answersJson from '../data/answers.json'
import validJson from '../data/valid.json'

export const ANSWERS: readonly string[] = answersJson

// Svarsorden räknas alltid som giltiga, även om valid.json skulle sakna något av dem.
const VALID = new Set<string>([...validJson, ...answersJson])

export function isValidWord(word: string): boolean {
  return VALID.has(word.normalize('NFC').toLowerCase())
}
