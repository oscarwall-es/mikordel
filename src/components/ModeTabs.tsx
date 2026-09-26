import type { GameMode } from '../logic/game'

const TABS: { mode: GameMode; label: string }[] = [
  { mode: 'daily', label: 'Dagens ord' },
  { mode: 'practice', label: 'Öva' },
]

interface ModeTabsProps {
  mode: GameMode
  onChange: (mode: GameMode) => void
}

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div role="tablist" aria-label="Spelläge" className="mx-auto mt-2 grid w-full max-w-[322px] grid-cols-2 gap-2 px-4 min-[354px]:px-0">
      {TABS.map((tab) => {
        const active = tab.mode === mode
        return (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(tab.mode)}
            className={`h-9 rounded-lg shadow-[0_0_0_1px_var(--component-edge)] text-sm font-bold tracking-[0.03em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-icon ${
              active ? 'bg-action text-white' : 'bg-tile text-icon hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
