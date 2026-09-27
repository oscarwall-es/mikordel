import { MikaToggleButton } from '../mika/MikaToggleButton'

interface HeaderProps {
  onHelp: () => void
  onStats: () => void
  onColors: () => void
}

// Ikoner och titel ligger direkt på den valbara bakgrunden och använder därför on-page-färgerna.
const iconButton =
  'grid size-9 place-items-center rounded-full text-on-page-muted hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-current'

export function Header({ onHelp, onStats, onColors }: HeaderProps) {
  return (
    // Lika breda sidokolumner så titeln står centrerad fast högersidan har två knappar
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-2">
      <div className="flex justify-start gap-1">
        <button type="button" className={iconButton} onClick={onHelp} aria-label="Så spelar du">
          {/* Frågetecken i fylld cirkel */}
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-.9 13.8a1.35 1.35 0 1 1 2.7 0 1.35 1.35 0 0 1-2.7 0Zm-1.35-7.45c.55-.95 1.4-1.6 2.6-1.6 1.7 0 2.9 1.1 2.9 2.55 0 1.2-.7 1.85-1.35 2.3-.6.4-.85.65-.85 1.2v.2h-2.1v-.35c0-1.25.65-1.85 1.3-2.3.55-.38.9-.63.9-1.15 0-.5-.4-.85-.95-.85-.5 0-.9.25-1.2.75l-1.25-.75Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {/* Under 375 px får titeln inte plats med tre knappar till höger – då står Mika-knappen här */}
        <span className="hidden max-[375px]:contents">
          <MikaToggleButton className={iconButton} />
        </span>
      </div>

      <h1 className="text-center font-mono text-[25px] font-medium tracking-wide text-on-page">Mikordel</h1>

      <div className="flex justify-end gap-1">
        <span className="contents max-[375px]:hidden">
          <MikaToggleButton className={iconButton} />
        </span>
        <button type="button" className={iconButton} onClick={onColors} aria-label="Bakgrundsfärg">
          {/* Målarpalett */}
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12 2.25C6.615 2.25 2.25 6.29 2.25 11.25c0 4.97 4.37 9 9.75 9 1.24 0 2.1-.93 2.1-2.07 0-.54-.2-1-.52-1.36-.3-.35-.48-.78-.48-1.27 0-1.1.9-1.95 2-1.95h2.3c2.85 0 5.1-2.28 5.1-5.1 0-3.97-4.36-7.25-9.75-7.25ZM7.5 12.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm3-4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm4.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm3 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button type="button" className={iconButton} onClick={onStats} aria-label="Statistik">
          {/* Stapeldiagram, tre staplar */}
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
            <rect x="2" y="12.5" width="5.5" height="8" rx="1.5" />
            <rect x="9.25" y="8" width="5.5" height="12.5" rx="1.5" />
            <rect x="16.5" y="3.5" width="5.5" height="17" rx="1.5" />
          </svg>
        </button>
      </div>
    </header>
  )
}
