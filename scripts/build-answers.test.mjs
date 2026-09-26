import { describe, expect, it } from 'vitest'
import { buildCandidates, parseKelly } from './build-answers.mjs'

const entry = (word, pos, wpm = '1,5') => `
    <LexicalEntry><Lemma><FormRepresentation>
      <feat att="writtenForm" val="${word}" />
      <feat att="kellyPartOfSpeech" val="${pos}" />
      <feat att="wpm" val="${wpm}" />
      <feat att="cefr" val="2" />
    </FormRepresentation></Lemma></LexicalEntry>`

describe('parseKelly', () => {
  it('läser ord, ordklass, frekvens (decimalkomma) och CEFR', () => {
    expect(parseKelly(entry('sparv', 'noun-en', '0,93'))).toEqual([{ word: 'sparv', pos: 'noun-en', wpm: 0.93, cefr: 2 }])
  })
})

describe('buildCandidates', () => {
  const kelly = parseKelly(
    [
      entry('skola', 'noun-en'),
      entry('skola', 'aux verb'), // homograf
      entry('Norge', 'proper name'), // namn
      entry('hus', 'noun-ett'), // fel längd
      entry('spjut', 'noun-ett'), // saknas i valid
      entry('äpple', 'noun-ett'),
      entry('bil', 'noun-en'),
    ].join(''),
  )

  it('behåller bara 5-bokstavsord som finns i valid-listan, alfabetiskt, utan dubbletter', () => {
    const { candidates, notInValid, wrongFormat, homographs } = buildCandidates(kelly, ['skola', 'äpple', 'bilar'])
    expect(candidates.map((c) => c.word)).toEqual(['skola', 'äpple'])
    expect(notInValid).toEqual(['spjut'])
    expect(wrongFormat).toBe(3)
    expect(homographs).toBe(1)
  })

  it('slår ihop ordklasser för homografer', () => {
    const { candidates } = buildCandidates(kelly, ['skola'])
    expect(candidates[0].pos).toBe('noun-en, aux verb')
  })
})
