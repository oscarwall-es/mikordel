import { useContext } from 'react'
import { MikaModeContext, type MikaModeValue } from './mikaMode'

/**
 * Mika-mode: en global brytare för knasiga extrafunktioner.
 *
 *   const { mikaMode, toggleMikaMode } = useMikaMode()
 *
 * ─── Byggmönster för Mika-mode-funktioner ──────────────────────────────────────────
 *
 * Grundregel: när mikaMode är false ska appen se ut och bete sig EXAKT som utan
 * Mika-mode, pixel för pixel. Därför:
 *
 * 1. Lägg koden för en ny funktion i src/mika/ (komponenter, hooks, CSS, rena hjälpfunktioner).
 *
 * 2. Koppla in den som villkorad EXTRA kod ovanpå befintliga komponenter:
 *
 *      const { mikaMode } = useMikaMode()
 *      ...
 *      {mikaMode && <MikaFlygandeKatter />}
 *
 *    eller, när ett beteende ska bytas ut:
 *
 *      if (mikaMode) {
 *        // knasigt beteende
 *      } else {
 *        // vanligt beteende – EXAKT som innan, oförändrat
 *      }
 *
 *    Den vanliga grenen får aldrig skrivas om, snyggas till eller få nya klasser/props.
 *
 * 3. Rör aldrig src/logic/ eller src/data/. Spellogiken och ordlistorna känner inte till
 *    Mika-mode (ett test i src/mika/mikaMode.test.tsx kontrollerar att de inte importerar
 *    något härifrån). Behöver en funktion t.ex. andra ord eller regler, gör en egen variant
 *    i src/mika/ och välj den villkorat – ändra inte originalet.
 *
 * 4. Inget i Mika-mode får sparas mellan besök. Behöver en funktion state, håll det i
 *    React-state som nollställs vid omladdning.
 *
 * 5. Skriv tester som visar att funktionen syns när mikaMode är true och att ingenting
 *    ändras när den är false. Befintliga tester ska vara gröna utan att ändras – behöver
 *    ett befintligt test ändras har den vanliga grenen påverkats.
 */
export function useMikaMode(): MikaModeValue {
  return useContext(MikaModeContext)
}
