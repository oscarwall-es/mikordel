#!/usr/bin/env node
/**
 * Bygger en JSON-ordlista med svenska ord av exakt N bokstäver ur en rå ordlista.
 *
 * Användning:
 *   node scripts/build-wordlist.mjs <indata> <utdata.json> [--length 5] [--include fil.json ...] [--shuffle]
 *
 * Exempel:
 *   npm run words -- raw/swe_wordlist_raw.txt src/data/valid.json --include src/data/answers.json
 *   npm run words -- raw/svarsord.txt src/data/answers.json --shuffle
 *
 * Indata: en JSON-array med ord (om filen slutar på .json), annars en textfil med ett ord per rad
 * (hela raden är ordet). Tål tomma rader, kommentarer som börjar med # och tabbseparerade
 * kolumner (första kolumnen används). Mellanslag delar INTE raden – "a priori" är ett
 * flerordsuttryck och filtreras bort, inte tolkas som ordet "a".
 *
 * Filtrering, i denna ordning (första träffen avgör anledningen i sammanfattningen):
 *   1. versal någonstans i ordet → namn eller förkortning (Anna, LVU, mRNA)
 *   2. bindestreck eller apostrof
 *   3. mellanslag (flerordsuttryck)
 *   4. siffror
 *   5. andra tecken än a–z, å, ä, ö (t.ex. é, ü, /, .) – går inte att skriva på spelets tangentbord
 *   6. fel längd
 * Allt normaliseras till NFC + gemener först; Å, Ä, Ö räknas som egna bokstäver.
 *
 * --include slår ihop ord från en eller flera befintliga JSON-listor, t.ex. så att
 * valid.json garanterat innehåller alla ord i answers.json.
 *
 * --shuffle blandar listan deterministiskt i stället för att lämna den alfabetisk. Används för
 * answers.json, eftersom dagens ord väljs som (dag % antal ord) – en alfabetisk lista skulle göra
 * morgondagens ord förutsägbart.
 *
 *   Metod: listan sorteras först alfabetiskt (svensk kollation, Intl.Collator('sv')) så att
 *   indatans ordning inte spelar någon roll. Därefter Fisher–Yates-blandning (i = n-1 ned till 1,
 *   j = floor(rng() * (i + 1)), byt plats på i och j) med PRNG:n mulberry32 och det fasta seedet
 *   SHUFFLE_SEED nedan.
 *
 *   Samma uppsättning ord ger alltså alltid exakt samma ordning, oavsett hur många gånger skriptet
 *   körs. OBS: läggs ett ord till eller tas bort blandas HELA listan om, och dagens-ord-sekvensen
 *   ändras för alla spelare från och med den dagen. Ändra aldrig SHUFFLE_SEED eller algoritmen
 *   utan att vara medveten om det.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ALLOWED = /^[a-zåäö]+$/u

/** Fast seed för --shuffle. Får inte ändras – se kommentaren ovan. */
export const SHUFFLE_SEED = 20240101

/** mulberry32: liten, välkänd 32-bitars PRNG. Returnerar en funktion som ger tal i [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministisk Fisher–Yates-blandning av en kopia av `items`. */
export function seededShuffle(items, seed = SHUFFLE_SEED) {
  const rng = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function parseArgs(argv) {
  const positional = []
  const include = []
  let length = 5
  let shuffle = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--length') length = Number(argv[++i])
    else if (arg === '--include') include.push(argv[++i])
    else if (arg === '--shuffle') shuffle = true
    else positional.push(arg)
  }
  if (positional.length !== 2 || !Number.isInteger(length) || length < 1) {
    console.error(
      'Användning: node scripts/build-wordlist.mjs <indata> <utdata.json> [--length 5] [--include fil.json ...] [--shuffle]',
    )
    process.exit(1)
  }
  return { input: positional[0], output: positional[1], length, include, shuffle }
}

export const REASONS = {
  empty: 'tom rad / kommentar',
  uppercase: 'versal (namn/förkortning)',
  hyphen: 'bindestreck/apostrof',
  space: 'mellanslag (flerordsuttryck)',
  digit: 'siffror',
  chars: 'otillåtna tecken (é, ü, /, . …)',
  length: 'fel längd',
}

/**
 * Klassar en rad: `{ word }` om den godkänns, annars `{ reason }` (nyckel i REASONS).
 * `hadLength` anger om raden hade rätt antal tecken – användbart för att se vad filtren
 * faktiskt tar bort bland kandidaterna.
 */
export function classifyEntry(line, length) {
  const raw = String(line).split('\t')[0].trim().normalize('NFC')
  if (!raw || raw.startsWith('#')) return { reason: 'empty', hadLength: false }
  const hadLength = Array.from(raw).length === length
  const lower = raw.toLowerCase()
  if (raw !== lower) return { reason: 'uppercase', hadLength }
  if (/[-‐‑'’]/u.test(raw)) return { reason: 'hyphen', hadLength }
  if (/\s/u.test(raw)) return { reason: 'space', hadLength }
  if (/\p{N}/u.test(raw)) return { reason: 'digit', hadLength }
  if (!ALLOWED.test(lower)) return { reason: 'chars', hadLength }
  if (!hadLength) return { reason: 'length', hadLength }
  return { word: lower }
}

/** Returnerar det normaliserade ordet, eller null om raden ska kastas. */
export function normalizeEntry(line, length) {
  return classifyEntry(line, length).word ?? null
}

function main() {
  const { input, output, length, include, shuffle } = parseArgs(process.argv.slice(2))
  const words = new Set()
  const rejected = Object.fromEntries(Object.keys(REASONS).map((k) => [k, { total: 0, withLength: 0 }]))
  let accepted = 0

  const text = readFileSync(input, 'utf8')
  const lines = input.endsWith('.json') ? JSON.parse(text) : text.split(/\r?\n/)
  if (lines.at(-1) === '') lines.pop() // avslutande radbrytning
  for (const line of lines) {
    const result = classifyEntry(line, length)
    if (result.word) {
      accepted++
      words.add(result.word)
    } else {
      rejected[result.reason].total++
      if (result.hadLength) rejected[result.reason].withLength++
    }
  }
  const unique = words.size

  for (const file of include) {
    for (const w of JSON.parse(readFileSync(file, 'utf8'))) {
      const word = normalizeEntry(w, length)
      if (word) words.add(word)
      else console.warn(`Varning: "${w}" i ${file} uppfyller inte filtret och hoppas över`)
    }
  }

  const sorted = [...words].sort(new Intl.Collator('sv').compare)
  const result = shuffle ? seededShuffle(sorted) : sorted
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
  const pad = (v, n = 8) => String(v).padStart(n)
  console.log(`${pad(lines.length)}  rader lästa från ${input}`)
  console.log(`\nBortfiltrerade (i filtrens ordning)        totalt   varav med ${length} tecken`)
  for (const [key, { total, withLength }] of Object.entries(rejected)) {
    if (total) console.log(`  ${REASONS[key].padEnd(38)} ${pad(total)}   ${pad(key === 'length' ? '–' : withLength, 10)}`)
  }
  console.log(`\n${pad(accepted)}  godkända rader`)
  if (accepted !== unique) console.log(`${pad(accepted - unique)}  dubbletter efter normalisering`)
  console.log(`${pad(unique)}  unika ${length}-bokstavsord`)
  if (include.length) console.log(`${pad(sorted.length)}  efter --include ${include.join(', ')}`)
  console.log(`\n→ ${output}${shuffle ? ` (blandad, seed ${SHUFFLE_SEED})` : ' (alfabetisk)'}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
