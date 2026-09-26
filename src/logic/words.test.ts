import { describe, expect, it } from 'vitest'
import answers from '../data/answers.json'
import valid from '../data/valid.json'
import { ANSWERS, isValidWord } from './words'

// Sanity checks på ordlistorna – fångar misstag när den riktiga listan fylls på.
describe.each([
  ['answers.json', answers],
  ['valid.json', valid],
])('%s', (_, list) => {
  it('innehåller bara 5-bokstavsord med gemener a–ö i NFC', () => {
    const bad = list.filter((w) => !/^[a-zåäö]{5}$/u.test(w) || w !== w.normalize('NFC'))
    expect(bad).toEqual([])
  })

  it('saknar dubbletter', () => {
    expect(new Set(list).size).toBe(list.length)
  })
})

describe('isValidWord', () => {
  it('godkänner alla svarsord', () => {
    expect(ANSWERS.filter((w) => !isValidWord(w))).toEqual([])
  })

  it('är okänslig för versaler och avvisar okända ord', () => {
    expect(isValidWord('SKOLA')).toBe(true)
    expect(isValidWord('abcde')).toBe(false)
  })
})
