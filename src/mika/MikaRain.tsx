import { useState, type CSSProperties } from 'react'
import { createRainParticles, type RainShape } from './rain'

const PATHS: Record<RainShape, string> = {
  heart: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.9 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z',
  star: 'M12 2.5l2.94 6.1 6.56.9-4.78 4.62 1.17 6.58L12 17.6l-5.89 3.1 1.17-6.58L2.5 9.5l6.56-.9L12 2.5z',
  circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  triangle: 'M12 3 22 20H2L12 3z',
  bolt: 'M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.5L13.5 2z',
  note: 'M9 17.5V5.2L20 3v11.7a3 3 0 1 1-2-2.83V7.1l-7 1.4v9a3 3 0 1 1-2-2.83z',
}

interface MikaRainProps {
  reducedMotion: boolean
}

/**
 * Kontinuerligt regn av hjärtan, stjärnor, cirklar, trianglar, blixtar och noter bakom spelytan.
 * Med reducerade animationer: färre symboler som står still och bara tonar långsamt (se mika.css).
 * Monteras om (ny key) när rörelseinställningen ändras, så antalet partiklar följer med.
 */
export function MikaRain({ reducedMotion }: MikaRainProps) {
  const [particles] = useState(() => createRainParticles(reducedMotion))
  return (
    <div aria-hidden="true" data-mika-rain="" className="mika-layer mika-rain">
      {particles.map((p, i) => (
        <span
          key={i}
          data-mika-particle={p.shape}
          className="mika-particle"
          style={
            {
              left: `${p.left}%`,
              '--top': `${p.top}%`,
              width: p.sizePx,
              height: p.sizePx,
              color: p.color,
              animationDuration: `${p.durationMs}ms`,
              animationDelay: `${p.delayMs}ms`,
              '--drift': `${p.driftPx}px`,
              '--rotate': `${p.rotateDeg}deg`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
            <path d={PATHS[p.shape]} />
          </svg>
        </span>
      ))}
    </div>
  )
}
