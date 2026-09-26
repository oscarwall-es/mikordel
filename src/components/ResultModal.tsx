import { useEffect, useState } from 'react'
import { MAX_GUESSES, toLetters } from '../logic/evaluate'
import type { GameState } from '../logic/game'
import { copyText } from './clipboard'
import { Modal } from './Modal'
import { STATUS_BG } from './tiles'

interface ResultModalProps {
  open: boolean
  onClose: () => void
  game: GameState
  shareText: string
  /** Övningsläge: starta en ny omgång. */
  onNextWord: () => void
  /** Dagens ord: byt till övningsläget. */
  onPracticeMore: () => void
}

function msUntilMidnight(now: Date): number {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

function Countdown() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const total = Math.max(0, Math.floor(msUntilMidnight(now) / 1000))
  const hh = String(Math.floor(total / 3600)).padStart(2, '0')
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return (
    <p className="text-center text-icon">
      Nytt ord om <span className="font-mono font-bold text-text">{`${hh}:${mm}:${ss}`}</span>
    </p>
  )
}

const buttonBase =
  'h-[50px] w-full rounded-lg font-bold tracking-[0.03em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-icon'

export function ResultModal({ open, onClose, game, shareText, onNextWord, onPracticeMore }: ResultModalProps) {
  const won = game.status === 'won'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useEffect(() => {
    if (copyState === 'idle') return
    const timer = setTimeout(() => setCopyState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copyState])

  const title = won ? 'Snyggt!' : 'Tyvärr!'
  const summary = won
    ? `Du klarade ${game.mode === 'daily' ? 'dagens ord' : 'ordet'} på ${game.guesses.length} av ${MAX_GUESSES} försök.`
    : `Du hittade inte ${game.mode === 'daily' ? 'dagens ord' : 'ordet'} den här gången.`

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mt-3.5 leading-tight">{summary}</p>

      <section className="mt-4 rounded-xl bg-card p-4" aria-label="Resultat">
        <p className="text-sm text-icon">Ordet var</p>
        <div className="mt-2 flex gap-2" aria-label={game.answer.toUpperCase()}>
          {toLetters(game.answer).map((letter, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`${won ? 'bg-correct' : 'bg-key'} grid size-12 place-items-center rounded-lg text-3xl font-bold uppercase`}
            >
              {letter}
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm text-icon">Ditt resultat</p>
        <div className="mt-2 grid w-fit gap-1" aria-hidden="true">
          {game.guesses.map((guess, r) => (
            <div key={r} className="flex gap-1">
              {guess.statuses.map((status, c) => (
                <div key={c} className={`${STATUS_BG[status]} size-5 rounded-sm`} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 space-y-3">
        {game.mode === 'daily' && <Countdown />}
        <button
          type="button"
          className={`${buttonBase} ${game.mode === 'practice' ? 'bg-key' : 'bg-action'}`}
          onClick={async () => setCopyState((await copyText(shareText)) ? 'copied' : 'failed')}
        >
          {copyState === 'copied' ? 'Kopierat!' : copyState === 'failed' ? 'Kunde inte kopiera' : 'Kopiera resultat'}
        </button>
        {game.mode === 'practice' ? (
          <button type="button" className={`${buttonBase} bg-action`} onClick={onNextWord}>
            Nästa ord
          </button>
        ) : (
          <button type="button" className={`${buttonBase} bg-key`} onClick={onPracticeMore}>
            Öva mer
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {copyState === 'copied' ? 'Resultatet är kopierat' : ''}
      </span>
    </Modal>
  )
}
