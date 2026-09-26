#!/usr/bin/env node
/**
 * Bygger en JSON-ordlista med svenska ord av exakt N bokstäver ur en rå ordlista.
 *
 * Användning:
 *   node scripts/build-wordlist.mjs <indata> <utdata.json> [--length 5] [--include fil.json ...] [--shuffle]
 *
 * Exempel:
 *   npm run words -- raw/saldo.txt src/data/valid.json --include src/data/answers.json
 *   npm run words -- raw/svarsord.txt src/data/answers.json --shuffle
 *
 * Indata: en JSON-array med ord (om filen slutar på .json), annars en textfil med ett ord per rad. Tål även:
 *   - Hunspell .dic-format ("ord/FLAGGOR", första raden kan vara en ordräkning)
 *   - tab- eller mellanslagsseparerade kolumner (första kolumnen används)
 *   - tomma rader och kommentarer som börjar med #
 *
 * Filtrering:
 *   - ord som börjar med versal räknas som namn och tas bort
 *   - ord med bindestreck, apostrof, siffror, punkt eller mellanslag tas bort
 *   - allt normaliseras till NFC + gemener; Å, Ä, Ö räknas som egna bokstäver
 *   - endast a–z samt å, ä, ö tillåts (ord med t.ex. é eller ü tas bort,
 *     eftersom de inte går att skriva på spelets tangentbord)
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

/** Returnerar det normaliserade ordet, eller null om raden ska kastas. */
export function normalizeEntry(line, length) {
  const raw = line.trim().split(/[\t ]/)[0]?.split('/')[0]
  if (!raw || raw.startsWith('#')) return null
  const word = raw.normalize('NFC')
  // Versal i början = egennamn (Anna, Sverige, ...)
  if (word[0] !== word[0].toLowerCase()) return null
  const lower = word.toLowerCase()
  if (!ALLOWED.test(lower)) return null
  if (Array.from(lower).length !== length) return null
  return lower
}

function main() {
  const { input, output, length, include, shuffle } = parseArgs(process.argv.slice(2))
  const words = new Set()
  const stats = { lines: 0, kept: 0 }

  const text = readFileSync(input, 'utf8')
  const lines = input.endsWith('.json') ? JSON.parse(text) : text.split(/\r?\n/)
  for (const line of lines) {
    stats.lines++
    const word = normalizeEntry(line, length)
    if (word) words.add(word)
  }
  stats.kept = words.size

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
  console.log(
    `${stats.lines} rader lästa, ${stats.kept} unika ${length}-bokstavsord` +
      (include.length ? `, ${sorted.length} efter --include` : '') +
      (shuffle ? `, blandade med seed ${SHUFFLE_SEED}` : '') +
      ` → ${output}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
