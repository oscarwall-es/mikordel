/**
 * Bakgrundsfärg: palett, kontrastberäkning och slumpning. Rena funktioner utan React,
 * plus en liten, fristående persistens (medvetet skild från spelets storage.ts).
 */

export interface Swatch {
  name: string
  hex: string
}

/** Standardfärgen – samma slate-800 som skärmdumparna. */
export const DEFAULT_BACKGROUND = '#1e293b'

export const PALETTE: readonly Swatch[] = [
  { name: 'Skiffer', hex: DEFAULT_BACKGROUND },
  { name: 'Midnatt', hex: '#1e1b4b' },
  { name: 'Hav', hex: '#0c4a6e' },
  { name: 'Skog', hex: '#14532d' },
  { name: 'Plommon', hex: '#581c87' },
  { name: 'Vinröd', hex: '#4c0519' },
  { name: 'Sand', hex: '#f5e6c8' },
  { name: 'Rosa', hex: '#fbcfe8' },
]

/** Färger som komponenterna ovanpå bakgrunden redan har (se @theme i index.css). */
const COMPONENT_COLORS = ['#334155', '#475569', '#0f172a', '#16a34a', '#6d28d9', '#0369a1']

const LIGHT_TEXT = '#f1f5f9' // slate-100
const LIGHT_MUTED = '#cbd5e1' // slate-300
const DARK_TEXT = '#0f172a' // slate-900
const DARK_MUTED = '#334155' // slate-700

/**
 * Under detta kontrastförhållande mot bakgrunden får rutor och tangenter en tunn kant.
 * Originaldesignen (Skiffer) har själv 1,22 mellan svarta rutor och bakgrund, så gränsen
 * betyder: kant bara när en färg skiljer komponenterna åt sämre än originalet gör.
 */
export const MIN_COMPONENT_CONTRAST = 1.2
/** WCAG AA för normal text. */
const MIN_TEXT_CONTRAST = 4.5

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

export function normalizeHex(hex: string): string {
  return hex.toLowerCase()
}

/** WCAG 2 relativ luminans, 0 (svart) – 1 (vitt). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 kontrastförhållande, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export interface PageColors {
  background: string
  /** Text direkt på bakgrunden (titeln). */
  text: string
  /** Ikoner direkt på bakgrunden. */
  muted: string
  /** Kant runt rutor/tangenter när de annars smälter ihop med bakgrunden, annars 'transparent'. */
  componentEdge: string
  /**
   * Ytterring runt den aktiva rutan. Dess ljusa ram syns mot mörk bakgrund men flyter ihop
   * med en ljus – då ringas den in med den mörka textfärgen, annars 'transparent'.
   */
  activeRing: string
}

/** Räknar ut läsbara färger för en given bakgrund: ljus eller mörk text, efter vad som kontrasterar mest. */
export function pageColorsFor(background: string): PageColors {
  const bg = isHexColor(background) ? normalizeHex(background) : DEFAULT_BACKGROUND
  let light = contrastRatio(bg, LIGHT_TEXT) >= contrastRatio(bg, DARK_TEXT)
  let text = light ? LIGHT_TEXT : DARK_TEXT
  // Slate-tonerna passar designen, men för vissa mellantoner räcker de inte till AA. Då
  // används det bästa av rent vitt och svart – ett av dem ger alltid minst 4,58:1.
  if (contrastRatio(bg, text) < MIN_TEXT_CONTRAST) {
    light = contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000')
    text = light ? '#ffffff' : '#000000'
  }
  let muted = light ? LIGHT_MUTED : DARK_MUTED
  if (contrastRatio(bg, muted) < 3) muted = text
  const lowContrast = COMPONENT_COLORS.some((c) => contrastRatio(bg, c) < MIN_COMPONENT_CONTRAST)
  return {
    background: bg,
    text,
    muted,
    componentEdge: lowContrast ? `color-mix(in srgb, ${text} 35%, transparent)` : 'transparent',
    activeRing: light ? 'transparent' : text,
  }
}

/** Slumpar en färg ur paletten som inte är den nuvarande – aldrig samma färg två gånger i rad. */
export function pickRandomColor(
  current: string,
  random: () => number = Math.random,
  palette: readonly Swatch[] = PALETTE,
): string {
  const candidates = palette.filter((s) => normalizeHex(s.hex) !== normalizeHex(current))
  const pool = candidates.length > 0 ? candidates : palette
  return pool[Math.floor(random() * pool.length)].hex
}

// ---------------------------------------------------------------------------
// Persistens
// ---------------------------------------------------------------------------

/** Samma prefix som spelets övriga nycklar. */
export const BACKGROUND_KEY = 'ordel:background:v1'

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadBackgroundColor(store: KeyValueStore | null = defaultStore()): string {
  try {
    const saved = store?.getItem(BACKGROUND_KEY)
    return isHexColor(saved) ? normalizeHex(saved) : DEFAULT_BACKGROUND
  } catch {
    return DEFAULT_BACKGROUND
  }
}

export function saveBackgroundColor(color: string, store: KeyValueStore | null = defaultStore()): void {
  if (!isHexColor(color)) return
  try {
    store?.setItem(BACKGROUND_KEY, normalizeHex(color))
  } catch {
    // Blockerad eller full lagring – färgen gäller då bara den här sessionen.
  }
}
