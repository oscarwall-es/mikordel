#!/usr/bin/env node
/**
 * Flödestest i en riktig webbläsare: första besöket, återställning efter omladdning, vinst,
 * blockerat omspel, statistik, flikbyte, övningsläge, gammalt sparat läge och bakgrundsfärg.
 *
 * Kör:  npm run test:e2e
 *
 * Startar en egen Vite-dev-server på en ledig port och styr en headless Chrome via
 * puppeteer-core (ingen nedladdad webbläsare – den installerade Chrome används).
 * Sökväg till Chrome kan anges med CHROME_PATH.
 *
 * Dagens ord räknas ut med appens egen src/logic/daily.ts (Node kör TypeScript direkt), så
 * testet fungerar oavsett vilket datum det körs.
 */
import { existsSync, readFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'
import { getDailyWord } from '../src/logic/daily.ts'
import { pickPracticeWord } from '../src/logic/practice.ts'

const root = new URL('..', import.meta.url).pathname
const readJson = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const ANSWERS = readJson('../src/data/answers.json')
const VALID = readJson('../src/data/valid.json')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!executablePath) {
  console.error('Hittar ingen Chrome. Ange sökvägen med CHROME_PATH=/sökväg/till/chrome.')
  process.exit(1)
}

// Ord att spela med: dagens facit, samt giltiga gissningar som aldrig kan vara facit
// (böjningsformer som finns i valid.json men inte i answers.json).
const answer = getDailyWord(new Date(), ANSWERS)
const answerSet = new Set(ANSWERS)
const fillers = VALID.filter((w) => !answerSet.has(w) && w !== answer).slice(0, 8)
const [filler1, filler2] = fillers
const losingGuesses = fillers.slice(2, 8)

const server = await createServer({ root, logLevel: 'error', server: { port: 0, strictPort: false } })
await server.listen()
const url = server.resolvedUrls.local[0]

const browser = await puppeteer.launch({ executablePath, headless: true })
// `let`: avsnitt 7 byter till en egen sida med låst slump, och hjälpfunktionerna följer med.
let page = await browser.newPage()
await page.setViewport({ width: 399, height: 676, deviceScaleFactor: 2 })

const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const REVEAL_MS = 2100 // flip-animationen för en hel rad + marginal

/** Skickar tangenttryck som keydown-händelser, som det fysiska tangentbordet. */
const type = async (keys) => {
  for (const key of keys) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true })), key)
  }
}
const guess = async (word) => {
  await type(word)
  await type(['Enter'])
  await sleep(REVEAL_MS)
}
const openDialog = () => page.evaluate(() => document.querySelector('dialog[open] h2')?.textContent ?? null)
const tiles = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role=row]')]
      .map((r) => [...r.children].map((t) => t.textContent || '.').join(''))
      .filter((r) => r !== '.....')
      .join(' ')
      .toUpperCase(),
  )
const coloredKeys = () =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('[aria-label=Tangentbord] button')].filter((b) =>
        (b.getAttribute('aria-label') ?? '').includes(','),
      ).length,
  )
const flipping = () => page.evaluate(() => document.getAnimations().filter((a) => a.animationName === 'flip').length)
/** Klickar på en knapp med viss text – inuti öppen dialog om det finns en, annars på sidan. */
const clickText = (text) =>
  page.evaluate(
    (t) => [...(document.querySelector('dialog[open]') ?? document).querySelectorAll('button')].find((b) => b.textContent === t)?.click(),
    text,
  )
const storage = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)
const reload = () => page.reload({ waitUntil: 'networkidle0' })

let failures = 0
const check = (name, ok, info = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${info ? `  — ${info}` : ''}`)
  if (!ok) failures++
}

try {
  console.log(`Dagens ord: ${answer} · fyllnadsord: ${fillers.join(', ')} · ${url}\n`)
  await page.goto(url, { waitUntil: 'networkidle0' })

  // 1. Första besöket
  check('Första besöket: hjälpen visas automatiskt', (await openDialog()) === 'Så spelar du')
  await clickText('Spela')
  await sleep(100)
  check('SPELA stänger hjälpen', (await openDialog()) === null)
  await reload()
  check('Hjälpen visas inte igen efter omladdning', (await openDialog()) === null)

  // 2. Påbörjad omgång återställs
  await guess(filler1)
  await guess(filler2)
  await type(answer.slice(0, 2))
  await reload()
  const expectedRows = `${filler1} ${filler2}`.toUpperCase()
  check('Påbörjad omgång återställs efter omladdning', (await tiles()) === expectedRows, await tiles())
  check('Återställda rader vänds inte igen', (await flipping()) === 0)
  check('Tangentbordet har kvar färgerna', (await coloredKeys()) > 0, `${await coloredKeys()} färgade tangenter`)
  check(
    'Sparat läge: gissningarna',
    JSON.stringify((await storage('ordel:daily:v1'))?.guesses) === JSON.stringify([filler1, filler2]),
  )

  // 3. Vinst, omladdning och blockerat omspel
  await guess(answer)
  await sleep(400)
  check('Vinst → resultatet visas', (await openDialog()) === 'Snyggt!')
  const daily = (await storage('ordel:stats:v1'))?.daily
  check(
    'Statistik registrerad (1 spelad, 1 vinst, streak 1, vinst på 3 försök)',
    daily?.played === 1 && daily.wins === 1 && daily.currentStreak === 1 && daily.distribution[2] === 1,
    JSON.stringify(daily),
  )
  await reload()
  check('Omladdning samma dag → resultatet visas direkt', (await openDialog()) === 'Snyggt!')
  await page.keyboard.press('Escape')
  await sleep(100)
  await type('abc')
  check('Går inte att spela om (inmatning ignoreras)', (await tiles()) === `${expectedRows} ${answer.toUpperCase()}`, await tiles())
  check('Resultatet räknas inte två gånger', (await storage('ordel:stats:v1'))?.daily.played === 1)
  check(
    'Vinst i dagens ord byter inte bakgrundsfärg',
    (await page.evaluate(() => localStorage.getItem('ordel:background:v1'))) === '#1e293b',
  )

  await page.click('button[aria-label=Statistik]')
  await sleep(150)
  const bars = await page.evaluate(() =>
    [...document.querySelectorAll('dialog[open] li div div')].map((d) => d.className.includes('bg-correct')),
  )
  check('Statistiken markerar dagens stapel (3 försök)', bars[2] === true && bars.filter(Boolean).length === 1)
  await page.keyboard.press('Escape')
  await sleep(100)

  // 4. Övningsläget
  await clickText('Öva mer')
  await sleep(100)
  const activeTab = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]')?.textContent)
  check('"Öva mer" byter till övningsfliken', activeTab === 'Öva')
  check('Övningsplanen är tom och tangentbordet ofärgat', (await tiles()) === '' && (await coloredKeys()) === 0)

  const practiceAnswers = []
  for (let round = 0; round < 7; round++) {
    for (const w of losingGuesses) await guess(w)
    await sleep(400)
    practiceAnswers.push(await page.evaluate(() => document.querySelector('dialog[open] div[aria-label]')?.getAttribute('aria-label')))
    if (round === 0) {
      const buttons = await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')].map((b) => b.textContent))
      check('Övningsomgång slut → resultat med "Nästa ord"', buttons.includes('Nästa ord'))
    }
    await clickText('Nästa ord')
    await sleep(150)
    if (round === 0) check('"Nästa ord" nollställer plan och tangentbord', (await tiles()) === '' && (await coloredKeys()) === 0)
  }
  const repeatWithin5 = practiceAnswers.some((w, i) => practiceAnswers.slice(Math.max(0, i - 5), i).includes(w))
  check('Inget övningsord upprepas inom 5 omgångar', !repeatWithin5, practiceAnswers.join(', '))
  check('Övningsordet är aldrig dagens ord', !practiceAnswers.includes(answer.toUpperCase()))
  const stats = await storage('ordel:stats:v1')
  check(
    'Övningsstatistik separat från dagens ord',
    stats?.practice.played === 7 && stats.practice.wins === 0 && stats.daily.played === 1,
    JSON.stringify(stats?.practice),
  )

  // 5. Sparat läge från en annan dag ignoreras
  await page.evaluate(() =>
    localStorage.setItem('ordel:daily:v1', JSON.stringify({ date: '2000-01-01', answer: 'skola', guesses: ['stark'] })),
  )
  await reload()
  check('Sparad omgång från en annan dag ignoreras → ny omgång', (await tiles()) === '' && (await openDialog()) === null)

  // 6. Färgväljare och bakgrundsfärg
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const titleColor = () => page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)
  const TRANSITION_MS = 800 // bakgrunden tonar över på 600 ms
  await sleep(TRANSITION_MS)
  check('Standardbakgrund är Skiffer', (await bodyBg()) === 'rgb(30, 41, 59)', await bodyBg())
  await page.click('button[aria-label=Bakgrundsfärg]')
  await sleep(150)
  check('Palettknappen öppnar färgväljaren', (await openDialog()) === 'Bakgrundsfärg')
  await page.click('dialog[open] [role=radio][aria-label=Hav]')
  await sleep(TRANSITION_MS)
  check('Vald färg (Hav) blir bakgrund', (await bodyBg()) === 'rgb(12, 74, 110)', await bodyBg())
  check(
    'Vald färg markeras i väljaren',
    await page.evaluate(() => document.querySelector('[role=radio][aria-label=Hav]')?.getAttribute('aria-checked') === 'true'),
  )
  check('Ljus titel på mörk färg', (await titleColor()) === 'rgb(241, 245, 249)', await titleColor())
  await page.click('dialog[open] [role=radio][aria-label=Sand]')
  await sleep(TRANSITION_MS)
  check('Mörk titel på ljus färg (Sand)', (await titleColor()) === 'rgb(15, 23, 42)', await titleColor())
  const savedColor = await page.evaluate(() => localStorage.getItem('ordel:background:v1'))
  check('Färgen sparas i localStorage', savedColor === '#f5e6c8', savedColor)
  await clickText('Klar')
  await reload()
  await sleep(TRANSITION_MS)
  check('Färgen finns kvar efter omladdning', (await bodyBg()) === 'rgb(245, 230, 200)', await bodyBg())

  // 7. Vunnen övningsrunda byter bakgrundsfärg. Egen kontext där Math.random är låst till 0,
  // så att övningsordet går att räkna ut med appens egen pickPracticeWord.
  const mainPage = page
  const context = await browser.createBrowserContext()
  page = await context.newPage()
  await page.setViewport({ width: 399, height: 676, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.evaluateOnNewDocument(() => {
    Math.random = () => 0
    localStorage.setItem('ordel:help-seen:v1', 'true')
  })
  await page.goto(url, { waitUntil: 'networkidle0' })
  const practiceWord = pickPracticeWord(ANSWERS, [answer], () => 0)
  // Välj Rosa manuellt först, för att se att färgbytet skriver över det manuella valet
  await page.click('button[aria-label=Bakgrundsfärg]')
  await sleep(150)
  await page.click('dialog[open] [role=radio][aria-label=Rosa]')
  await clickText('Klar')
  await page.click('[role=tab]:nth-child(2)')
  await sleep(100)
  await guess(losingGuesses[0])
  await sleep(300)
  check('Gissning utan vinst i öva-läget byter inte färg', (await page.evaluate(() => localStorage.getItem('ordel:background:v1'))) === '#fbcfe8')
  await guess(practiceWord)
  await sleep(TRANSITION_MS)
  const afterWin = await page.evaluate(() => localStorage.getItem('ordel:background:v1'))
  check('Vunnen övningsrunda → resultat visas', (await openDialog()) === 'Snyggt!')
  check('Vunnen övningsrunda byter bakgrundsfärg (skriver över manuellt val)', afterWin !== '#fbcfe8' && /^#[0-9a-f]{6}$/.test(afterWin ?? ''), `Rosa → ${afterWin}`)
  check('Ny bakgrund syns på sidan', (await bodyBg()) !== 'rgb(251, 207, 232)', await bodyBg())
  await page.close()
  await context.close()
  page = mainPage

  check('Inga fel i konsolen', errors.length === 0, errors.join(' | '))
} catch (e) {
  failures++
  console.error('✗ Testet avbröts:', e)
} finally {
  await browser.close()
  await server.close()
}

console.log(failures === 0 ? '\nAlla kontroller gröna.' : `\n${failures} kontroll(er) misslyckades.`)
process.exit(failures === 0 ? 0 : 1)
