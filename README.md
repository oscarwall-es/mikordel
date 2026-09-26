# Mikordel

En svensk Wordle-klon: gissa ett svenskt ord på fem bokstäver på max sex försök. Ett gemensamt
**dagens ord** per kalenderdag, plus ett **övningsläge** med obegränsat antal slumpade ord.

Helt statisk frontend (React + Vite + TypeScript + Tailwind CSS). Spelläge och statistik sparas i
webbläsarens `localStorage`.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm test         # enhetstester (Vitest)
npm run test:e2e # flödestest i headless Chrome (kräver installerad Chrome, ev. CHROME_PATH)
npm run build    # typkontroll + produktionsbygge i dist/
```

## Ordlistor

| Fil | Innehåll | Används till |
|---|---|---|
| `src/data/valid.json` | alla godkända svenska ord på 5 bokstäver, inklusive böjningsformer | validera gissningar |
| `src/data/answers.json` | kurerade, vanliga grundformer i fast blandad ordning | dagens ord och övningsord |

Listorna byggs om med ett kommando. Källfilerna hämtas först till `raw/`, som inte versionshanteras:

```bash
curl -o raw/swe_wordlist_raw.txt https://raw.githubusercontent.com/martinlindhe/wordlist_swedish/master/swe_wordlist
curl -o raw/kelly.xml https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/kelly/kelly.xml

npm run wordlists
```

Kommandot gör tre saker:

1. `valid.json`: alla ord på fem bokstäver ur källfilen plus `scripts/data/extra-words.json`
   (vanliga ord som saknas i källfilen, t.ex. *spjut*).
2. Kandidater till svarsord: Kelly-listans grundformer som också finns i `valid.json`.
3. `answers.json`: kandidaterna minus `scripts/data/answers-exclude.json` (manuellt strukna
   funktionsord som *efter* och *genom*, fortfarande giltiga gissningar), blandade med `--shuffle`.

Manuella ändringar görs i `scripts/data/`, aldrig direkt i `src/data/`, så att en ombyggnad
alltid ger samma resultat. Ord med *é* (t.ex. *moské*) filtreras bort eftersom tangentbordet
saknar é.

### ⚠️ Svarslistans ordning är låst

Dagens ord väljs som `answers[dagar sedan 2024-01-01 % answers.length]`. Ordningen i
`answers.json` avgör alltså vilket ord som är dagens ord, för alla spelare, varje dag.

- **Blandningsmetod:** listan sorteras först alfabetiskt (`Intl.Collator('sv')`) och blandas
  sedan med Fisher–Yates och PRNG:n mulberry32 med det fasta seedet **`20240101`**
  (`SHUFFLE_SEED` i `scripts/build-wordlist.mjs`). Samma ordmängd ger alltid exakt samma
  ordning. `npm run wordlists` ger en byte för byte identisk fil.
- **Kör aldrig om `answers.json` utan `--shuffle`.** Då blir listan alfabetisk, dagens ord blir
  förutsägbart, och sekvensen ändras för alla. Använd `npm run wordlists`, som har flaggan.
- **Ändra aldrig seedet eller blandningsalgoritmen.** Ett test i `scripts/build-wordlist.test.mjs`
  låser båda och slår larm om de ändras.
- **Att lägga till eller ta bort ett svarsord blandar om hela listan**, och dagens ord ändras
  för alla från och med den dagen. Tidigare dagars ord ändras också i efterhand. Gör det
  medvetet och helst sällan.
- Startdatumet (`START_DATE_KEY` i `src/logic/daily.ts`) är låst av samma skäl.

### Källor och licenser

- **Giltiga ord:** [wordlist_swedish](https://github.com/martinlindhe/wordlist_swedish) av Martin
  Lindhe, MIT-licens. Filtrerad till ord på fem bokstäver (a–ö) utan namn, förkortningar,
  bindestreck och siffror.
- **Svarsord:** [Kelly-listan](https://spraakbanken.gu.se/en/resources/kelly), Språkbanken Text,
  Göteborgs universitet, licensierad under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Ändringar: listan är begränsad till
  grundformer på fem bokstäver som även finns i listan över giltiga ord, manuellt granskad och
  blandad i en fast ordning.
