#!/usr/bin/env node
/**
 * Flödestest för Mika-mode: knappen i toppmenyn, indikatorn, att läget är av vid start och
 * efter omladdning, att inget sparas, att spelet går att spela med läget på, diskoläget
 * (blinkande bakgrund under 3 byten/s, regn, direkt borta vid av, dämpat vid reducerad rörelse)
 * samt Mikas röst och bakgrundsmusik (båda i loop samtidigt och hörs, mute tystar båda via
 * muted – även när volume inte går att ändra som på iOS – och båda stoppas direkt vid av).
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

  // Mikas röst och musiken: båda spelar i loop samtidigt, och båda ger faktiskt ljud (inte tystnad)
  const tracks = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const elements = [...document.querySelectorAll('[data-mika-audio]')]
        setTimeout(async () => {
          const info = Object.fromEntries(
            elements.map((a) => [
              a.dataset.mikaAudio,
              {
                src: a.currentSrc.split('/').pop(),
                paused: a.paused,
                loop: a.loop,
                muted: a.muted,
                volume: a.volume,
                duration: Math.round(a.duration * 100) / 100,
                currentTime: Math.round(a.currentTime * 100) / 100,
                error: a.error?.code ?? null,
              },
            ]),
          )
          // Mät signalnivån per spår: varje element får en egen analysator (ljudet går fortfarande ut)
          try {
            const ctx = new AudioContext()
            await ctx.resume()
            const analysers = elements.map((a) => {
              const source = ctx.createMediaElementSource(a)
              const analyser = ctx.createAnalyser()
              analyser.fftSize = 2048
              source.connect(analyser)
              analyser.connect(ctx.destination)
              return [a.dataset.mikaAudio, analyser]
            })
            const data = new Float32Array(2048)
            const peaks = Object.fromEntries(analysers.map(([id]) => [id, 0]))
            const until = performance.now() + 1500
            while (performance.now() < until) {
              await new Promise((r) => setTimeout(r, 50))
              for (const [id, analyser] of analysers) {
                analyser.getFloatTimeDomainData(data)
                for (const v of data) peaks[id] = Math.max(peaks[id], Math.abs(v))
              }
            }
            for (const [id, peak] of Object.entries(peaks)) info[id].peak = Math.round(peak * 1000) / 1000
          } catch (e) {
            info.analyserError = String(e)
          }
          resolve(info)
        }, 800)
      }),
  )
  const { voice, music } = tracks
  const playing = (t, volume) => !!t && !t.paused && t.loop && !t.muted && t.volume === volume && t.currentTime > 0 && t.error === null
  check('Rösten: spelar i loop på 70 % volym', playing(voice, 0.7), JSON.stringify(voice))
  check('Musiken: spelar i loop på 55 % volym, samtidigt som rösten', playing(music, 0.55) && playing(voice, 0.7), JSON.stringify(music))
  check('Rösten: filen har laddats (cirka 5,6 s)', !!voice && voice.duration > 5 && voice.duration < 6.5, voice && `${voice.duration} s, ${voice.src}`)
  check('Musiken: filen har laddats (cirka 8 s)', !!music && music.duration > 7.5 && music.duration < 8.5, music && `${music.duration} s, ${music.src}`)
  check('Rösten: det hörs något (signalnivå över tystnad)', !!voice && voice.peak > 0.01, voice && `topp ${voice.peak}`)
  check('Musiken: det hörs något (signalnivå över tystnad)', !!music && music.peak > 0.01, music && `topp ${music.peak}`)

  const audioState = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-mika-audio]')].map((a) => [
          a.dataset.mikaAudio,
          { muted: a.muted, volume: a.volume, playing: !a.paused },
        ]),
      ),
    )
  await page.click('[data-mika-indicator] [data-mika-mute]')
  await sleep(100)
  const muted = await audioState()
  check(
    'Mute-knappen mutar båda spåren (muted = true, volym 0)',
    muted.voice?.muted === true && muted.music?.muted === true && muted.voice.volume === 0 && muted.music.volume === 0,
    JSON.stringify(muted),
  )
  await page.click('[data-mika-indicator] [data-mika-mute]')
  await sleep(100)
  const unmuted = await audioState()
  check(
    'Mute-knappen igen: båda spåren på (röst 70 %, musik 55 %)',
    unmuted.voice?.muted === false && unmuted.music?.muted === false && unmuted.voice.volume === 0.7 && unmuted.music.volume === 0.55,
    JSON.stringify(unmuted),
  )
  await page.click('[role=tab]:nth-child(2)')
  await sleep(300)
  const afterTab = await audioState()
  check(
    'Ljudet spelar vidare oförändrat vid flikbyte (kopplat bara till Mika-mode)',
    afterTab.voice?.playing === true && afterTab.music?.playing === true,
    JSON.stringify(afterTab),
  )
  await page.click('[role=tab]:nth-child(1)')
  await sleep(100)

  // Diskoläget: mät färgbytena i webbläsaren med riktiga tidsstämplar
  const disco = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('[data-mika-disco]')
        if (!el) return resolve(null)
        const times = []
        const obs = new MutationObserver(() => times.push(performance.now()))
        obs.observe(el, { attributes: true, attributeFilter: ['data-mika-disco'] })
        const before = getComputedStyle(el).backgroundColor
        setTimeout(() => {
          obs.disconnect()
          resolve({
            times,
            before,
            after: getComputedStyle(el).backgroundColor,
            particles: document.querySelectorAll('[data-mika-particle]').length,
            shapes: new Set([...document.querySelectorAll('[data-mika-particle]')].map((p) => p.dataset.mikaParticle)).size,
          })
        }, 3000)
      }),
  )
  const gaps = disco ? disco.times.slice(1).map((t, i) => t - disco.times[i]) : []
  check('Diskoläge: bakgrunden byter färg över tid', !!disco && disco.times.length >= 3 && disco.before !== disco.after, disco && `${disco.times.length} byten på 3 s, ${disco.before} → ${disco.after}`)
  check(
    'Diskoläge: aldrig mer än 3 byten/s (minst 330 ms mellan byten)',
    gaps.length > 0 && Math.min(...gaps) >= 330,
    `kortaste mellanrum ${Math.round(Math.min(...gaps))} ms`,
  )
  check('Diskoläge: regn av partiklar i flera former syns', !!disco && disco.particles > 0 && disco.shapes >= 5, disco && `${disco.particles} partiklar, ${disco.shapes} former`)
  const underneath = await page.evaluate(() => {
    // Mitt i en tangent: översta elementet ska vara tangenten, inte regnet eller diskolagret
    const key = document.querySelector('button[aria-label="Q"]').getBoundingClientRect()
    const top = document.elementFromPoint(key.left + key.width / 2, key.top + key.height / 2)
    return top?.closest('button')?.getAttribute('aria-label') ?? top?.className
  })
  check('Diskoläge: tangenterna ligger överst (regnet är bakom spelytan)', underneath === 'Q', underneath)

  await type([...'glass', 'Enter'])
  await sleep(2100)
  const tiles = await page.evaluate(() => [...document.querySelectorAll('[role=row]')][0].textContent)
  check('Spelet går att spela med läget på (indikatorn blockerar inte)', tiles.toLowerCase() === 'glass', tiles)
  await page.click('button[aria-label="M"]')
  await page.click('button[aria-label="J"]')
  await sleep(100)
  const clicked = await page.evaluate(() => [...document.querySelectorAll('[role=row]')][1].textContent)
  check('Skärmtangenterna går att klicka under diskoläget', clicked.toLowerCase() === 'mj', clicked)

  await page.click('button[aria-label="Så spelar du"]')
  await sleep(150)
  const inDialog = await page.evaluate(() => !!document.querySelector('dialog[open] [data-mika-indicator]'))
  check('Indikatorn syns även ovanpå en öppen modal', inDialog)
  await page.keyboard.press('Escape')
  await sleep(100)

  const userBg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
  // Behåll referenser till ljudelementen, för att se att de verkligen stoppas (inte bara tas bort)
  await page.evaluate(() => {
    window.__mikaAudio = [...document.querySelectorAll('[data-mika-audio]')]
  })
  await toggle()
  const stopped = await page.evaluate(() => ({
    inDom: document.querySelectorAll('[data-mika-audio]').length,
    tracks: window.__mikaAudio.map((a) => ({ id: a.dataset.mikaAudio, paused: a.paused, currentTime: a.currentTime })),
  }))
  check(
    'Av: både röst och musik stoppas omedelbart',
    stopped.inDom === 0 && stopped.tracks.length === 2 && stopped.tracks.every((t) => t.paused && t.currentTime === 0),
    JSON.stringify(stopped),
  )
  s = await state()
  check('Nytt klick slår av: indikatorn försvinner', s.pressed === 'false' && !s.indicator, JSON.stringify(s))
  const off = await page.evaluate(() => ({
    disco: !!document.querySelector('[data-mika-disco]'),
    particles: document.querySelectorAll('[data-mika-particle]').length,
    bodyStyle: document.body.getAttribute('style') ?? '',
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }))
  check(
    'Av: diskolager, regn och bakgrundsändringar försvinner direkt (ingen kvardröjande övertoning)',
    !off.disco && off.particles === 0 && off.bodyStyle === '' && off.bodyBg === userBg,
    JSON.stringify({ ...off, userBg }),
  )

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

  // iOS Safari-simulering: volume går inte att ändra från JavaScript (alltid 1). Mute måste
  // ändå fungera (via muted), och uppspelningen ska ha startat direkt i klicket.
  const iosPage = await context.newPage()
  await iosPage.setViewport({ width: 390, height: 780, deviceScaleFactor: 2 })
  iosPage.on('pageerror', (e) => errors.push(e.message))
  await iosPage.evaluateOnNewDocument(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', { get: () => 1, set: () => {}, configurable: true })
    // Notera om play() anropas medan klickhändelsen fortfarande pågår (samma gest)
    const originalPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      window.__playDuringClick = window.event?.type === 'click'
      if (window.__playDuringClick) window.__playsDuringClick = (window.__playsDuringClick ?? 0) + 1
      return originalPlay.call(this)
    }
  })
  await iosPage.goto(url, { waitUntil: 'networkidle0' })
  await (
    await iosPage.evaluateHandle(() =>
      [...document.querySelectorAll('button[aria-label="Mika-mode"]')].find((b) => b.getClientRects().length > 0),
    )
  ).click()
  await sleep(600)
  const iosStart = await iosPage.evaluate(() => {
    const els = [...document.querySelectorAll('[data-mika-audio]')]
    return {
      tracks: els.map((a) => a.dataset.mikaAudio).sort().join(','),
      playing: els.length === 2 && els.every((a) => !a.paused),
      playDuringClick: window.__playDuringClick === true,
      playsDuringClick: window.__playsDuringClick ?? 0,
    }
  })
  check(
    'iOS-simulering: röst och musik startar direkt i klicket (samma gest)',
    iosStart.tracks === 'music,voice' && iosStart.playing && iosStart.playDuringClick && iosStart.playsDuringClick === 2,
    JSON.stringify(iosStart),
  )
  await iosPage.click('[data-mika-indicator] [data-mika-mute]')
  await sleep(100)
  const iosMuted = await iosPage.evaluate(() =>
    [...document.querySelectorAll('[data-mika-audio]')].map((a) => ({ id: a.dataset.mikaAudio, muted: a.muted, volume: a.volume })),
  )
  check(
    'iOS-simulering: mute tystar båda spåren fast volymen inte går att ändra (muted = true)',
    iosMuted.length === 2 && iosMuted.every((t) => t.muted === true && t.volume === 1),
    JSON.stringify(iosMuted),
  )
  await iosPage.close()

  // prefers-reduced-motion: inget blink, glest och stilla regn
  const reducedPage = await context.newPage()
  await reducedPage.setViewport({ width: 399, height: 676, deviceScaleFactor: 2 })
  await reducedPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  reducedPage.on('pageerror', (e) => errors.push(e.message))
  await reducedPage.goto(url, { waitUntil: 'networkidle0' })
  await reducedPage.evaluate(() =>
    [...document.querySelectorAll('button[aria-label="Mika-mode"]')].find((b) => b.getClientRects().length > 0).click(),
  )
  const reduced = await reducedPage.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('[data-mika-disco]')
        let changes = 0
        const obs = new MutationObserver(() => changes++)
        obs.observe(el, { attributes: true, attributeFilter: ['data-mika-disco'] })
        setTimeout(() => {
          obs.disconnect()
          const particle = document.querySelector('[data-mika-particle]')
          resolve({
            changes,
            particles: document.querySelectorAll('[data-mika-particle]').length,
            animation: particle ? getComputedStyle(particle).animationName : null,
          })
        }, 2500)
      }),
  )
  check(
    'Reducerad rörelse: ingen blinkning, färre partiklar som inte faller',
    reduced.changes === 0 && reduced.particles > 0 && reduced.particles <= 12 && reduced.animation === 'mika-twinkle',
    JSON.stringify(reduced),
  )
  await reducedPage.close()

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
