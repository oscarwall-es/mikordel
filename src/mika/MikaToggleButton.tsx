import { useMikaMode } from './useMikaMode'

interface MikaToggleButtonProps {
  /** Samma klasser som toppmenyns övriga ikonknappar, så knappen ser likadan ut när läget är av. */
  className: string
}

/** Slår Mika-mode av/på direkt. Fylld magenta bakgrund när läget är på. */
export function MikaToggleButton({ className }: MikaToggleButtonProps) {
  const { mikaMode, toggleMikaMode } = useMikaMode()
  return (
    <button
      type="button"
      className={mikaMode ? `${className} bg-fuchsia-500! text-white!` : className}
      onClick={toggleMikaMode}
      aria-pressed={mikaMode}
      aria-label="Mika-mode"
      title={mikaMode ? 'Mika-mode är på – klicka för att stänga av' : 'Slå på Mika-mode'}
    >
      {/* Gnistor */}
      <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
        <path d="M10 2.5c.3 0 .55.2.62.49l.86 3.4a4 4 0 0 0 2.93 2.92l3.4.86a.64.64 0 0 1 0 1.24l-3.4.86a4 4 0 0 0-2.93 2.93l-.86 3.4a.64.64 0 0 1-1.24 0l-.86-3.4a4 4 0 0 0-2.93-2.93l-3.4-.86a.64.64 0 0 1 0-1.24l3.4-.86a4 4 0 0 0 2.93-2.92l.86-3.4A.64.64 0 0 1 10 2.5Z" />
        <path d="M18.5 13.5c.2 0 .37.13.42.33l.3 1.2a1.8 1.8 0 0 0 1.3 1.3l1.2.3a.43.43 0 0 1 0 .84l-1.2.3a1.8 1.8 0 0 0-1.3 1.3l-.3 1.2a.43.43 0 0 1-.84 0l-.3-1.2a1.8 1.8 0 0 0-1.3-1.3l-1.2-.3a.43.43 0 0 1 0-.84l1.2-.3a1.8 1.8 0 0 0 1.3-1.3l.3-1.2c.05-.2.22-.33.42-.33Z" />
      </svg>
    </button>
  )
}
