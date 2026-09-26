import { getCurrentStreak, winPercent, type Stats } from '../logic/storage'
import { Modal } from './Modal'

interface StatsModalProps {
  open: boolean
  onClose: () => void
  stats: Stats
  today: string
  /** Antal försök i dagens vunna omgång, för att markera stapeln. */
  todayGuessCount: number | null
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      <span className="text-xs leading-tight text-icon">{label}</span>
    </div>
  )
}

export function StatsModal({ open, onClose, stats, today, todayGuessCount }: StatsModalProps) {
  const { daily, practice } = stats
  const maxCount = Math.max(1, ...daily.distribution)

  return (
    <Modal open={open} onClose={onClose} title="Statistik">
      <section className="mt-5 rounded-xl bg-card p-4" aria-labelledby="stats-daily">
        <h3 id="stats-daily" className="text-xl font-bold">
          Dagens ord
        </h3>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat value={daily.played} label="Spelade" />
          <Stat value={winPercent(daily.played, daily.wins)} label="Vinst %" />
          <Stat value={getCurrentStreak(daily, today)} label="Streak" />
          <Stat value={daily.maxStreak} label="Längsta streak" />
        </div>

        <h4 className="mt-6 font-bold">Antal försök</h4>
        {daily.wins === 0 ? (
          <p className="mt-2 text-icon">Inga vinster än – fördelningen visas här när du vunnit.</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {daily.distribution.map((count, i) => {
              const highlight = todayGuessCount === i + 1
              return (
                <li key={i} className="flex items-center gap-2 text-sm font-bold tabular-nums">
                  <span className="w-3 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div
                      className={`flex h-6 min-w-7 items-center justify-end rounded px-2 ${highlight ? 'bg-correct' : 'bg-key'}`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                      aria-label={`${count} vinster på ${i + 1} försök`}
                    >
                      {count}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="mt-4 rounded-xl bg-card p-4" aria-labelledby="stats-practice">
        <h3 id="stats-practice" className="text-xl font-bold">
          Öva
        </h3>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat value={practice.played} label="Spelade" />
          <Stat value={winPercent(practice.played, practice.wins)} label="Vinst %" />
        </div>
      </section>
    </Modal>
  )
}
