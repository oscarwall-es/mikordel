import { describe, expect, it } from 'vitest'
import { CELEBRATION_MAX_MS, createParticles, PARTICLE_COUNT, shouldCelebrate } from './celebration'

describe('createParticles', () => {
  const particles = createParticles()

  it('skapar en jämn blandning av stjärnor och hjärtan', () => {
    expect(particles).toHaveLength(PARTICLE_COUNT)
    expect(particles.filter((p) => p.kind === 'star')).toHaveLength(PARTICLE_COUNT / 2)
    expect(particles.filter((p) => p.kind === 'heart')).toHaveLength(PARTICLE_COUNT / 2)
  })

  it('hela effekten ryms inom 2–3 sekunder', () => {
    const ends = particles.map((p) => p.delayMs + p.durationMs)
    expect(Math.max(...ends)).toBeLessThanOrEqual(CELEBRATION_MAX_MS)
    expect(Math.min(...particles.map((p) => p.durationMs))).toBeGreaterThanOrEqual(1600)
  })

  it('håller sig inom skärmen även vid extremvärden på slumpen', () => {
    for (const r of [0, 0.999999]) {
      for (const p of createParticles(10, () => r)) {
        expect(p.left).toBeGreaterThanOrEqual(0)
        expect(p.left).toBeLessThan(100)
        expect(p.delayMs + p.durationMs).toBeLessThanOrEqual(CELEBRATION_MAX_MS)
        expect(p.color).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })
})

describe('shouldCelebrate', () => {
  it('firar vinst oavsett läge, men inte förlust eller pågående omgång', () => {
    expect(shouldCelebrate('won')).toBe(true)
    expect(shouldCelebrate('lost')).toBe(false)
    expect(shouldCelebrate('playing')).toBe(false)
    expect(shouldCelebrate('idle')).toBe(false)
  })
})
