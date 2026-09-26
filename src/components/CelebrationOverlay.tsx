import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CELEBRATION_MAX_MS, createParticles, type Particle } from '../ui/celebration'

interface CelebrationOverlayProps {
  /** Anropas när effekten är klar, så att föräldern kan avmontera den. */
  onDone: () => void
}

function Shape({ kind }: { kind: Particle['kind'] }) {
  return kind === 'star' ? (
    <svg viewBox="0 0 24 24" className="size-full" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.94 6.1 6.56.9-4.78 4.62 1.17 6.58L12 17.6l-5.89 3.1 1.17-6.58L2.5 9.5l6.56-.9L12 2.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-full" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.9 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  )
}

/**
 * Stjärnor och hjärtan som regnar över skärmen i 2–3 sekunder. Fristående och återanvändbar:
 * montera den (med en ny `key` för varje vinst) så spelas effekten upp en gång.
 *
 * Visas som popover i webbläsarens top layer, så den hamnar ovanför resultatrutan
 * (en modal <dialog>) som öppnas samtidigt. Med prefers-reduced-motion faller inget –
 * symbolerna tonar i stället stilla in och ut på plats.
 */
export function CelebrationOverlay({ onDone }: CelebrationOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [particles] = useState(() => createParticles())

  useEffect(() => {
    const el = ref.current
    try {
      el?.showPopover()
    } catch {
      // Popover saknas (äldre webbläsare): effekten visas ändå, bara under eventuella dialoger.
    }
    const timer = setTimeout(onDone, CELEBRATION_MAX_MS + 100)
    return () => {
      clearTimeout(timer)
      try {
        el?.hidePopover()
      } catch {
        // redan stängd
      }
    }
  }, [onDone])

  return (
    <div
      ref={ref}
      popover="manual"
      aria-hidden="true"
      data-celebration=""
      className="pointer-events-none fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          data-particle={p.kind}
          className="absolute block drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)] motion-safe:top-0 motion-safe:animate-celebrate-fall motion-reduce:top-(--top) motion-reduce:animate-celebrate-fade"
          style={
            {
              left: `${p.left}%`,
              '--top': `${p.top}%`,
              width: p.sizePx,
              height: p.sizePx,
              color: p.color,
              animationDelay: `${p.delayMs}ms`,
              animationDuration: `${p.durationMs}ms`,
              '--drift': `${p.driftPx}px`,
              '--rotate': `${p.rotateDeg}deg`,
            } as CSSProperties
          }
        >
          <Shape kind={p.kind} />
        </span>
      ))}
    </div>
  )
}
