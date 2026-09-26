/**
 * Regn av stjärnor och hjärtan vid vunnen omgång. Rena funktioner – komponenten
 * (components/CelebrationOverlay.tsx) renderar bara det som räknas ut här.
 */
import type { GameStatus } from '../logic/game'

export type ParticleKind = 'star' | 'heart'

export interface Particle {
  kind: ParticleKind
  /** Horisontell startposition i procent av skärmbredden. */
  left: number
  /** Vertikal position i procent – används bara i den reducerade (stillastående) varianten. */
  top: number
  delayMs: number
  durationMs: number
  sizePx: number
  /** Sidledsdrift under fallet, i px. */
  driftPx: number
  /** Total rotation under fallet, i grader. */
  rotateDeg: number
  color: string
}

export const PARTICLE_COUNT = 48
/** Hela effekten är klar inom denna tid (fördröjning + fall). */
export const CELEBRATION_MAX_MS = 3000

const STAR_COLORS = ['#facc15', '#fde047', '#fbbf24']
const HEART_COLORS = ['#f472b6', '#fb7185', '#ef4444']

/** Regnet visas vid varje vunnen omgång, oavsett läge. */
export function shouldCelebrate(status: GameStatus): boolean {
  return status === 'won'
}

const between = (random: () => number, min: number, max: number) => min + random() * (max - min)
const pick = <T,>(random: () => number, items: readonly T[]) => items[Math.floor(random() * items.length)]

export function createParticles(count = PARTICLE_COUNT, random: () => number = Math.random): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    // Varannan stjärna, varannan hjärta – alltid en jämn blandning
    const kind: ParticleKind = i % 2 === 0 ? 'star' : 'heart'
    const delayMs = Math.round(between(random, 0, 600))
    return {
      kind,
      left: between(random, 0, 100),
      top: between(random, 5, 85),
      delayMs,
      // Fördröjning + fall håller sig inom CELEBRATION_MAX_MS
      durationMs: Math.round(between(random, 1600, CELEBRATION_MAX_MS - 600)),
      sizePx: Math.round(between(random, 16, 34)),
      driftPx: Math.round(between(random, -60, 60)),
      rotateDeg: Math.round(between(random, -240, 240)),
      color: pick(random, kind === 'star' ? STAR_COLORS : HEART_COLORS),
    }
  })
}
