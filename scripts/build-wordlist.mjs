#!/usr/bin/env node
/**
 * Bygger en JSON-ordlista med svenska ord av exakt N bokstäver ur en rå ordlista.
 *
 * Användning:
 *   node scripts/build-wordlist.mjs <indata> <utdata.json> [--length 5] [--include fil.json ...]
 *
 * Exempel:
 *   npm run words -- raw/saldo.txt src/data/valid.json --include src/data/answers.json
 *
 * Indata: en textfil med ett ord per rad. Tål även:
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
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ALLOWED = /^[a-zåäö]+$/u

function parseArgs(argv) {
  const positional = []
  const include = []
  let length = 5
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--length') length = Number(argv[++i])
    else if (arg === '--include') include.push(argv[++i])
    else positional.push(arg)
  }
  if (positional.length !== 2 || !Number.isInteger(length) || length < 1) {
    console.error(
      'Användning: node scripts/build-wordlist.mjs <indata> <utdata.json> [--length 5] [--include fil.json ...]',
    )
    process.exit(1)
  }
  return { input: positional[0], output: positional[1], length, include }
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
  const { input, output, length, include } = parseArgs(process.argv.slice(2))
  const words = new Set()
  const stats = { lines: 0, kept: 0 }

  for (const line of readFileSync(input, 'utf8').split(/\r?\n/)) {
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
  writeFileSync(output, JSON.stringify(sorted, null, 2) + '\n')
  console.log(
    `${stats.lines} rader lästa, ${stats.kept} unika ${length}-bokstavsord` +
      (include.length ? `, ${sorted.length} efter --include` : '') +
      ` → ${output}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
