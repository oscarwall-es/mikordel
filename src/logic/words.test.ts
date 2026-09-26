import { describe, expect, it } from 'vitest'
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

// answers.json ⊆ valid.json, answers.new.json ⊆ valid.new.json osv.
const answerLists = Object.keys(lists).filter((p) => name(p).startsWith('answers'))
describe.each(answerLists.map((p) => [name(p), p, p.replace('answers', 'valid')] as const))(
  '%s ⊆ motsvarande valid-lista',
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
