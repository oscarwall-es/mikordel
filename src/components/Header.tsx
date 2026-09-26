interface HeaderProps {
  onHelp: () => void
  onStats: () => void
}

const iconButton =
  'grid size-10 place-items-center rounded-full text-icon hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-icon'

export function Header({ onHelp, onStats }: HeaderProps) {
  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center px-2 pt-1">
      <button type="button" className={iconButton} onClick={onHelp} aria-label="Så spelar du">
        {/* Frågetecken i fylld cirkel */}
        <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-.9 13.8a1.35 1.35 0 1 1 2.7 0 1.35 1.35 0 0 1-2.7 0Zm-1.35-7.45c.55-.95 1.4-1.6 2.6-1.6 1.7 0 2.9 1.1 2.9 2.55 0 1.2-.7 1.85-1.35 2.3-.6.4-.85.65-.85 1.2v.2h-2.1v-.35c0-1.25.65-1.85 1.3-2.3.55-.38.9-.63.9-1.15 0-.5-.4-.85-.95-.85-.5 0-.9.25-1.2.75l-1.25-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <h1 className="text-center font-mono text-4xl tracking-wide text-icon">Ordel</h1>

      <button type="button" className={iconButton} onClick={onStats} aria-label="Statistik">
        {/* Stapeldiagram, tre staplar */}
        <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
          <rect x="3" y="12" width="5" height="9" rx="1.5" />
          <rect x="9.5" y="7" width="5" height="14" rx="1.5" />
          <rect x="16" y="2.5" width="5" height="18.5" rx="1.5" />
        </svg>
      </button>
    </header>
  )
}
