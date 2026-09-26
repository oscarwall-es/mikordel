import { describe, expect, it } from 'vitest'
import answersExclude from '../../scripts/data/answers-exclude.json'
import extraWords from '../../scripts/data/extra-words.json'
import { ANSWERS, isValidWord } from './words'

// Alla ordlistor i src/data, även kandidater som answers.new.json – så nya listor
// kontrolleras innan de byts in.
const lists = import.meta.glob<string[]>('../data/*.json', { eager: true, import: 'default' })
const name = (path: string) => path.replace('../data/', '')

// Sanity checks på ordlistorna – fångar misstag när den riktiga listan fylls på.
describe.each(Object.entries(lists).map(([path, list]) => [name(path), list] as const))('%s', (_, list) => {
  it('är en icke-tom lista', () => {
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
  })

  it('innehåller bara 5-bokstavsord med gemener a–ö i NFC', () => {
    const bad = list.filter((w) => !/^[a-zåäö]{5}$/u.test(w) || w !== w.normalize('NFC'))
    expect(bad).toEqual([])
  })

  it('saknar dubbletter', () => {
    const seen = new Set<string>()
    const dupes = list.filter((w) => seen.has(w) || !seen.add(w))
    expect(dupes).toEqual([])
  })
})

// answers.json ⊆ valid.json, answers.new.json ⊆ valid.new.json osv. Listor utan egen
// valid-motsvarighet (t.ex. answers.candidates.json) prövas mot valid.new.json, annars valid.json.
const validFor = (answersPath: string) =>
  [answersPath.replace('answers', 'valid'), '../data/valid.new.json', '../data/valid.json'].find((p) => p in lists)!
const answerLists = Object.keys(lists).filter((p) => name(p).startsWith('answers'))
describe.each(answerLists.map((p) => [name(p), p, validFor(p)] as const))(
  '%s ⊆ valid-lista',
  (_, answersPath, validPath) => {
    it('alla svarsord finns i valid-listan', () => {
      expect(lists[validPath], `${name(validPath)} saknas`).toBeDefined()
      const valid = new Set(lists[validPath])
      expect(lists[answersPath].filter((w) => !valid.has(w))).toEqual([])
    })
  },
)

describe('isValidWord', () => {
  it('godkänner alla svarsord', () => {
    expect(ANSWERS.filter((w) => !isValidWord(w))).toEqual([])
  })

  it('är okänslig för versaler och avvisar okända ord', () => {
    expect(isValidWord('SKOLA')).toBe(true)
    expect(isValidWord('abcde')).toBe(false)
  })
})

// Manuella beslut om svarslistan (se scripts/data/) – skyddar mot att en ombyggnad tappar dem.
describe('beslut om ordlistorna', () => {
  it('strukna funktionsord är inte svarsord men fortfarande giltiga gissningar', () => {
    expect(answersExclude.filter((w) => ANSWERS.includes(w))).toEqual([])
    expect(answersExclude.filter((w) => !isValidWord(w))).toEqual([])
  })

  it('ord som saknas i källfilen (spjut m.fl.) är både svarsord och giltiga gissningar', () => {
    expect(extraWords.filter((w) => !ANSWERS.includes(w) || !isValidWord(w))).toEqual([])
  })

  it('ord med é är filtrerade (tangentbordet saknar é)', () => {
    expect(isValidWord('moské')).toBe(false)
    expect(ANSWERS.some((w) => w.includes('é'))).toBe(false)
  })
})
