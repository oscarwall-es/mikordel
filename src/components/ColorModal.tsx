import { normalizeHex, PALETTE, pageColorsFor } from '../ui/colors'
import { Modal } from './Modal'

interface ColorModalProps {
  open: boolean
  onClose: () => void
  color: string
  onChange: (color: string) => void
}

export function ColorModal({ open, onClose, color, onChange }: ColorModalProps) {
  const current = normalizeHex(color)
  const isCustom = !PALETTE.some((s) => normalizeHex(s.hex) === current)

  return (
    <Modal open={open} onClose={onClose} title="Bakgrundsfärg">
      <p className="mt-3.5 leading-tight text-icon">
        Välj en färg för bakgrunden. Den sparas tills du byter igen. Klarar du ett ord i öva-läget får du en ny
        slumpad färg.
      </p>

      <div role="radiogroup" aria-label="Färger" className="mt-5 grid grid-cols-4 gap-3">
        {PALETTE.map((swatch) => {
          const selected = normalizeHex(swatch.hex) === current
          const { text } = pageColorsFor(swatch.hex)
          return (
            <button
              key={swatch.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={swatch.name}
              onClick={() => onChange(swatch.hex)}
              style={{ backgroundColor: swatch.hex, color: text }}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-bold ring-offset-2 ring-offset-surface transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon ${
                selected ? 'ring-3 ring-text' : 'ring-1 ring-white/15'
              }`}
            >
              {selected && (
                <svg viewBox="0 0 24 24" className="mb-0.5 size-6" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              )}
              {swatch.name}
            </button>
          )
        })}
      </div>

      <label className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-card p-4">
        <span className="font-bold">
          Egen färg
          {isCustom && <span className="ml-2 font-mono text-sm font-normal text-icon">{current}</span>}
        </span>
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
          aria-label="Välj egen färg"
        />
      </label>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 h-[50px] w-full shrink-0 rounded-lg bg-action font-bold tracking-[0.03em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-icon"
      >
        Klar
      </button>
    </Modal>
  )
}
