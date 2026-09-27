import { MikaInterruptButton } from './MikaInterruptButton'
import { useMikaMode } from './useMikaMode'

/**
 * Omisskännlig markering när Mika-mode är på: en tunn magenta ram runt hela fönstret och en
 * liten etikett nere till vänster (tomt utrymme bredvid SPELA-knappen), med avbrottsknappen
 * bredvid. Ramen och etiketten släpper igenom klick; bara avbrottsknappen är klickbar.
 *
 * Renderar ingenting alls när läget är av. Monteras både i appen och inuti varje modal, så
 * att den syns även ovanpå dialoger (som ligger i webbläsarens top layer).
 */
export function MikaIndicator() {
  const { mikaMode } = useMikaMode()
  if (!mikaMode) return null
  return (
    <div data-mika-indicator="" className="pointer-events-none fixed inset-0 z-40">
      <div aria-hidden="true" className="absolute inset-0 border-[3px] border-fuchsia-500" />
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <div
          aria-hidden="true"
          className="rounded-full bg-fuchsia-500 px-2.5 py-1 text-[11px] leading-none font-bold tracking-wider text-white uppercase shadow-lg"
        >
          ✦ Mika-mode
        </div>
        <MikaInterruptButton />
      </div>
    </div>
  )
}
