import { useMikaMode } from './useMikaMode'

/** Ljud av/på för Mika-mode. Syns bara när läget är på (renderas av MikaIndicator). */
export function MikaMuteButton() {
  const { audioMuted, toggleAudioMuted } = useMikaMode()
  return (
    <button
      type="button"
      onClick={toggleAudioMuted}
      aria-pressed={audioMuted}
      aria-label={audioMuted ? 'Slå på Mika-ljudet' : 'Stäng av Mika-ljudet'}
      data-mika-mute=""
      className="pointer-events-auto grid size-7 place-items-center rounded-full bg-fuchsia-500 text-white shadow-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
        {audioMuted ? (
          <path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <path
            d="M15 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </button>
  )
}
