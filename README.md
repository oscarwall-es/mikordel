# Ordel

En svensk Wordle-klon: gissa ett svenskt ord på fem bokstäver på max sex försök. Ett gemensamt
**dagens ord** per kalenderdag, plus ett **övningsläge** med obegränsat antal slumpade ord.

Helt statisk frontend (React + Vite + TypeScript + Tailwind CSS). Spelläge och statistik sparas i
webbläsarens `localStorage`.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm test         # enhetstester (Vitest)
npm run build    # typkontroll + produktionsbygge i dist/
```

## Ordlistor

| Fil | Innehåll | Används till |
|---|---|---|
| `src/data/valid.json` | alla godkända svenska ord på 5 bokstäver, inklusive böjningsformer | validera gissningar |
| `src/data/answers.json` | kurerade, vanliga grundformer i fast blandad ordning | dagens ord och övningsord |

Listorna byggs med två skript (källfilerna hämtas till `raw/`, som inte versionshanteras):

```bash
curl -o raw/swe_wordlist_raw.txt https://raw.githubusercontent.com/martinlindhe/wordlist_swedish/master/swe_wordlist
curl -o raw/kelly.xml https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/kelly/kelly.xml

npm run words -- raw/swe_wordlist_raw.txt src/data/valid.json
npm run answers -- raw/kelly.xml src/data/valid.json src/data/answers.candidates.json
```

`answers.candidates.json` granskas manuellt innan den blir `answers.json`.

### Källor och licenser

- **Giltiga ord:** [wordlist_swedish](https://github.com/martinlindhe/wordlist_swedish) av Martin
  Lindhe, MIT-licens. Filtrerad till ord på fem bokstäver (a–ö) utan namn, förkortningar,
  bindestreck och siffror.
- **Svarsord:** [Kelly-listan](https://spraakbanken.gu.se/en/resources/kelly), Språkbanken Text,
  Göteborgs universitet, licensierad under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Ändringar: listan är begränsad till
  grundformer på fem bokstäver som även finns i listan över giltiga ord, manuellt granskad och
  blandad i en fast ordning.
