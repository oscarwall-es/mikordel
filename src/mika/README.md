# src/mika – Mika-mode

Här samlas allt som hör till **Mika-mode**: en global brytare (gnistknappen i toppmenyn) för
knasiga extrafunktioner. När läget är av ser och beter sig spelet exakt som vanligt.

| Fil | Innehåll |
|---|---|
| `mikaMode.ts` | Context och standardvärde (`false`) |
| `MikaModeProvider.tsx` | Håller flaggan i React-state – sparas aldrig, av vid varje omladdning |
| `useMikaMode.ts` | Hooken `useMikaMode()` och **byggmönstret** för nya funktioner (läs kommentaren) |
| `MikaToggleButton.tsx` | Knappen i toppmenyn |
| `MikaIndicator.tsx` | Ram och etikett som visar att läget är på, med avbrottsknappen |
| `MikaInterruptButton.tsx` | Avbrottsknappen: tystar röst och musik och spelar Mikas avbrott en gång |
| `audio.ts`, `audioPlayer.ts` | Ljudspåren (röst, musik, avbrott) och spelaren (iOS-säker: start i klicket, tystnad via `muted`) |
| `MikaEffects.tsx`, `MikaDisco.tsx`, `MikaRain.tsx`, `disco.ts`, `rain.ts` | Diskoläget |
| `mikaMode.test.tsx` | Tester för flaggan, knappen, indikatorn och att spellogiken är opåverkad |

## Lägga till en ny knasig funktion

1. Skapa komponenten/hooken/effekten här i `src/mika/`.
2. Koppla in den villkorat där den ska synas: `{mikaMode && <MinFunktion />}` eller
   `if (mikaMode) { … } else { /* vanligt beteende, orört */ }`.
3. Rör aldrig `src/logic/` eller `src/data/`, och skriv aldrig om den vanliga grenen.
4. Spara inget mellan besök.
5. Testa att funktionen syns när läget är på och att inget ändras när det är av.
   Befintliga tester ska vara gröna utan ändringar.
