import { useMikaMode } from './useMikaMode'

/**
 * Avbrottsknappen (idé #4) – ser ut som den tidigare mute-knappen men tystar röst och musik och
 * spelar Mikas avbrott en gång; sedan kommer röst och musik tillbaka av sig själva. Under
 * avbrottet visas kryss-ikonen och knappen är inaktiverad. Syns bara när läget är på
 * (renderas av MikaIndicator).
 */
export function MikaInterruptButton() {
  const { interrupting, startInterrupt } = useMikaMode()
  return (
    <button
      type="button"
      onClick={startInterrupt}
      disabled={interrupting}
      aria-label={interrupting ? 'Mikas avbrott pågår' : 'Avbryt med Mika'}
      data-mika-interrupt={interrupting ? 'pågår' : ''}
      className="pointer-events-auto grid size-7 place-items-center rounded-full bg-fuchsia-500 text-white shadow-lg transition-opacity hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-50 disabled:hover:brightness-100"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
        {interrupting ? (
          <path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <path
            d="M15 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </button>
  )
}
