#!/usr/bin/env node
/**
 * Flödestest för Mika-mode-infrastrukturen: knappen i toppmenyn, indikatorn, att läget är av
 * vid start och efter omladdning, att inget sparas, och att spelet går att spela med läget på.
 *
 * Kör:  npm run test:e2e              (startar egen dev-server)
 *       E2E_URL=https://oscarwall-es.github.io/mikordel/ node e2e/mika.e2e.mjs   (publicerad sida)
 */
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const executablePath = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((p) => p && existsSync(p))
if (!executablePath) {
  console.error('Hittar ingen Chrome. Ange sökvägen med CHROME_PATH=/sökväg/till/chrome.')
  process.exit(1)
}

let server = null
let url = process.env.E2E_URL
if (!url) {
  const { createServer } = await import('vite')
  server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'error', server: { port: 0 } })
  await server.listen()
  url = server.resolvedUrls.local[0]
}

const browser = await puppeteer.launch({ executablePath, headless: true })
const context = await browser.createBrowserContext()
const page = await context.newPage()
await page.setViewport({ width: 399, height: 676, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.evaluateOnNewDocument(() => localStorage.setItem('ordel:help-seen:v1', 'true'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** Den synliga Mika-knappen (det finns två; den ena är dold beroende på skärmbredd). */
const visibleButton = () =>
  page.evaluateHandle(() =>
    [...document.querySelectorAll('button[aria-label="Mika-mode"]')].find((b) => b.getClientRects().length > 0),
  )
const state = () =>
  page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[aria-label="Mika-mode"]')]
    const visible = buttons.filter((b) => b.getClientRects().length > 0)
    const indicators = [...document.querySelectorAll('[data-mika-indicator]')]
    return {
      visibleButtons: visible.length,
      pressed: visible[0]?.getAttribute('aria-pressed'),
      indicator: indicators.some((el) => el.getClientRects().length > 0),
      label: indicators[0]?.textContent ?? null,
      side: visible[0] && visible[0].getBoundingClientRect().left < innerWidth / 2 ? 'vänster' : 'höger',
    }
  })
const toggle = async () => {
  await (await visibleButton()).click()
  await sleep(100)
}
const type = async (keys) => {
  for (const key of keys) {
    await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true })), key)
  }
}

let failures = 0
const check = (name, ok, info = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${info ? `  — ${info}` : ''}`)
  if (!ok) failures++
}

try {
  console.log(`Mika-mode · ${url}\n`)
  await page.goto(url, { waitUntil: 'networkidle0' })

  let s = await state()
  check('Knappen syns i toppmenyn, bredvid palettknappen', s.visibleButtons === 1 && s.side === 'höger', JSON.stringify(s))
  const nextToPalette = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-label="Mika-mode"]')].find((x) => x.getClientRects().length > 0)
    return b?.parentElement?.nextElementSibling?.getAttribute('aria-label')
  })
  check('Knappen står direkt före palettknappen', nextToPalette === 'Bakgrundsfärg', nextToPalette)
  check('Av vid start: knappen ej intryckt, ingen indikator', s.pressed === 'false' && !s.indicator)

  await toggle()
  s = await state()
  check('Klick slår på: knappen intryckt och indikatorn syns', s.pressed === 'true' && s.indicator, JSON.stringify(s))
  check('Indikatorn har etiketten "Mika-mode"', /mika-mode/i.test(s.label ?? ''), s.label)

  await type([...'glass', 'Enter'])
  await sleep(2100)
  const tiles = await page.evaluate(() => [...document.querySelectorAll('[role=row]')][0].textContent)
  check('Spelet går att spela med läget på (indikatorn blockerar inte)', tiles.toLowerCase() === 'glass', tiles)

  await page.click('button[aria-label="Så spelar du"]')
  await sleep(150)
  const inDialog = await page.evaluate(() => !!document.querySelector('dialog[open] [data-mika-indicator]'))
  check('Indikatorn syns även ovanpå en öppen modal', inDialog)
  await page.keyboard.press('Escape')
  await sleep(100)

  await toggle()
  s = await state()
  check('Nytt klick slår av: indikatorn försvinner', s.pressed === 'false' && !s.indicator, JSON.stringify(s))

  await toggle()
  await page.reload({ waitUntil: 'networkidle0' })
  s = await state()
  check('Omladdning återställer till av', s.pressed === 'false' && !s.indicator, JSON.stringify(s))

  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage).filter((k) => /mika/i.test(k) || /mika/i.test(localStorage.getItem(k) ?? '')),
    session: sessionStorage.length,
    cookie: document.cookie,
    urlParts: location.search + location.hash,
  }))
  check(
    'Inget om Mika-mode sparas (localStorage, sessionStorage, cookies, URL)',
    stored.local.length === 0 && stored.session === 0 && stored.cookie === '' && stored.urlParts === '',
    JSON.stringify(stored),
  )

  // Smal skärm: knappen flyttar till vänster så att titeln står kvar centrerad
  await page.setViewport({ width: 320, height: 640, deviceScaleFactor: 2 })
  await page.reload({ waitUntil: 'networkidle0' })
  s = await state()
  const title = await page.evaluate(() => {
    const r = document.createRange()
    r.selectNodeContents(document.querySelector('h1'))
    const t = r.getBoundingClientRect()
    return Math.abs((t.left + t.right) / 2 - innerWidth / 2)
  })
  check('320 px: en synlig knapp (till vänster), titeln centrerad', s.visibleButtons === 1 && s.side === 'vänster' && title < 0.5, `${s.side}, avvikelse ${title.toFixed(2)} px`)
  await toggle()
  s = await state()
  check('320 px: knappen slår på läget', s.pressed === 'true' && s.indicator)

  check('Inga fel i konsolen', errors.length === 0, errors.join(' | '))
} catch (e) {
  failures++
  console.error('✗ Testet avbröts:', e)
} finally {
  await browser.close()
  await server?.close()
}

console.log(failures === 0 ? '\nAlla kontroller gröna.' : `\n${failures} kontroll(er) misslyckades.`)
process.exit(failures === 0 ? 0 : 1)
