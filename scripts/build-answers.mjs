#!/usr/bin/env node
/**
 * Bygger kandidater till svarslistan (answers) genom att skära Språkbankens Kelly-lista
 * mot vår valid-lista. Resultatet granskas manuellt innan det blir answers.json.
 *
 * Användning:
 *   node scripts/build-answers.mjs <kelly.xml> <valid.json> <utdata.json>
 *
 * Exempel:
 *   curl -o raw/kelly.xml https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/kelly/kelly.xml
 *   npm run answers -- raw/kelly.xml src/data/valid.json src/data/answers.candidates.json
 *
 * KÄLLA OCH LICENS
 *   Kelly-listan, Språkbanken Text, Göteborgs universitet.
 *   https://spraakbanken.gu.se/en/resources/kelly
 *   Licens: Creative Commons Erkännande 4.0 (CC BY 4.0),
 *   https://creativecommons.org/licenses/by/4.0/ – kräver att källan anges (se README).
 *   Nedladdad fil: kelly.xml (LMF-format, senast ändrad 2017-09-15).
 *
 *   Kelly är en frekvensbaserad lista med 8 425 grundformer (lemman) av allmänspråklig
 *   modern svenska, framtagen ur webbkorpusen SweWaC (114 miljoner ord). Att den bara
 *   innehåller grundformer är poängen: skärningen mot valid-listan (som innehåller alla
 *   böjningsformer) tar bort "bilar", "husen", "bombs" osv. och lämnar vanliga grundformer.
 *
 * Filtrering:
 *   1. samma ordfilter som build-wordlist.mjs (gemener a–ö, exakt 5 bokstäver, NFC)
 *   2. ordet måste finnas i valid-listan (så svarsord alltid går att gissa)
 *   3. homografer (samma stavning, olika ordklass) slås ihop
 *
 * Utdata sorteras alfabetiskt för manuell granskning. När listan är godkänd blandas den
 * med build-wordlist.mjs --shuffle till answers.json (se README om seed och ordning).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { classifyEntry } from './build-wordlist.mjs'

const LENGTH = 5

/** Läser ut grundformer ur Kelly-LMF-XML: [{ word, pos, wpm, cefr }]. */
export function parseKelly(xml) {
  return [...xml.matchAll(/<FormRepresentation>([\s\S]*?)<\/FormRepresentation>/g)].map((m) => {
    const feats = Object.fromEntries([...m[1].matchAll(/att="(\w+)" val="([^"]*)"/g)].map((a) => [a[1], a[2]]))
    return {
      word: feats.writtenForm ?? '',
      pos: feats.kellyPartOfSpeech ?? '',
      // Kelly använder decimalkomma: "14,78"
      wpm: Number.parseFloat((feats.wpm ?? '').replace(',', '.')) || 0,
      cefr: Number(feats.cefr) || null,
    }
  })
}

/** Skär Kelly mot valid-listan. Returnerar kandidaterna och vad som föll bort. */
export function buildCandidates(kelly, validWords) {
  const valid = new Set(validWords)
  const words = new Map()
  const notInValid = []
  let wrongFormat = 0
  let matched = 0
  for (const entry of kelly) {
    const { word } = classifyEntry(entry.word, LENGTH)
    if (!word) {
      wrongFormat++
      continue
    }
    if (!valid.has(word)) {
      notInValid.push(word)
      continue
    }
    matched++
    const prev = words.get(word)
    words.set(word, prev ? { ...prev, pos: `${prev.pos}, ${entry.pos}` } : { ...entry, word })
  }
  const collator = new Intl.Collator('sv')
  const candidates = [...words.values()].sort((a, b) => collator.compare(a.word, b.word))
  return { candidates, notInValid: [...new Set(notInValid)], wrongFormat, homographs: matched - candidates.length }
}

function main() {
  const [kellyPath, validPath, output] = process.argv.slice(2)
  if (!kellyPath || !validPath || !output) {
    console.error('Användning: node scripts/build-answers.mjs <kelly.xml> <valid.json> <utdata.json>')
    process.exit(1)
  }
  const kelly = parseKelly(readFileSync(kellyPath, 'utf8'))
  const { candidates, notInValid, wrongFormat, homographs } = buildCandidates(kelly, JSON.parse(readFileSync(validPath, 'utf8')))
  writeFileSync(output, JSON.stringify(candidates.map((c) => c.word), null, 2) + '\n')

  console.log(`${String(kelly.length).padStart(6)}  grundformer i Kelly`)
  console.log(`${String(wrongFormat).padStart(6)}  inte 5 bokstäver a–ö (eller versal/namn)`)
  console.log(`${String(notInValid.length).padStart(6)}  saknas i ${validPath}: ${notInValid.join(', ')}`)
  console.log(`${String(homographs).padStart(6)}  homografer ihopslagna (samma stavning, olika ordklass)`)
  console.log(`${String(candidates.length).padStart(6)}  kandidater → ${output} (alfabetisk)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
