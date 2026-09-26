import { useCallback, useReducer, useState, type ReactNode } from 'react'
import { GameView } from './components/GameView'
import { Header } from './components/Header'
import { HelpModal } from './components/HelpModal'
import { ModeTabs } from './components/ModeTabs'
import { ResultModal } from './components/ResultModal'
import { StatsModal } from './components/StatsModal'
import { getDailyWord, getDayNumber, toDateKey } from './logic/daily'
import { createGameReducer, createGameState, type GameAction, type GameMode, type GameState } from './logic/game'
import { pickPracticeWord, pushRecent } from './logic/practice'
import { buildShareText } from './logic/share'
import { loadStats } from './logic/storage'
import { ANSWERS, isValidWord } from './logic/words'

const gameReducer = createGameReducer(isValidWord)

type ModalName = 'help' | 'stats' | 'result' | null

const isFinished = (g: GameState) => g.status === 'won' || g.status === 'lost'

const actionButton = 'h-10 rounded-lg px-5 font-bold tracking-[0.03em] uppercase'

export default function App() {
  const [now] = useState(() => new Date())
  const today = toDateKey(now)

  const [daily, dispatchDaily] = useReducer(gameReducer, undefined, () =>
    createGameState('daily', getDailyWord(now, ANSWERS)),
  )

  // Övningsläget: de senaste orden i sessionen (inte localStorage). Dagens ord räknas in
  // från start så att man inte får det som övningsord samma dag.
  const [recent, setRecent] = useState<string[]>(() => [daily.answer])
  const [practice, dispatchPractice] = useReducer(gameReducer, undefined, () =>
    createGameState('practice', pickPracticeWord(ANSWERS, [daily.answer])),
  )
  const [practiceRound, setPracticeRound] = useState(0)

  const [mode, setMode] = useState<GameMode>('daily')
  const [modal, setModal] = useState<ModalName>(null)
  const closeModal = () => setModal(null)
  const showResult = useCallback(() => setModal('result'), [])

  const game = mode === 'daily' ? daily : practice
  const dispatch = (action: GameAction) => (mode === 'daily' ? dispatchDaily : dispatchPractice)(action)

  const startNextPracticeWord = () => {
    // practice.answer kan saknas i recent om man aldrig spelat klart en omgång
    const seen = pushRecent(recent, practice.answer)
    const word = pickPracticeWord(ANSWERS, seen)
    setRecent(pushRecent(seen, word))
    dispatchPractice({ type: 'newGame', mode: 'practice', answer: word })
    setPracticeRound((r) => r + 1)
    setMode('practice')
    setModal(null)
  }

  const goPractice = () => {
    setMode('practice')
    setModal(null)
  }

  let finishedActions: ReactNode = null
  if (isFinished(game)) {
    finishedActions = (
      <>
        <button type="button" onClick={showResult} className={`${actionButton} bg-key`}>
          Visa resultat
        </button>
        {mode === 'daily' ? (
          <button type="button" onClick={goPractice} className={`${actionButton} bg-action`}>
            Öva mer
          </button>
        ) : (
          <button type="button" onClick={startNextPracticeWord} className={`${actionButton} bg-action`}>
            Nästa ord
          </button>
        )}
      </>
    )
  }

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} />
      <ModeTabs mode={mode} onChange={setMode} />
      <GameView
        // Ny instans per läge och övningsomgång, så animationstillståndet börjar om
        key={mode === 'daily' ? 'daily' : `practice-${practiceRound}`}
        game={game}
        dispatch={dispatch}
        keyboardActive={modal === null}
        onRevealComplete={showResult}
        finishedActions={finishedActions}
      />
      <HelpModal open={modal === 'help'} onClose={closeModal} />
      <StatsModal
        open={modal === 'stats'}
        onClose={closeModal}
        stats={loadStats()}
        today={today}
        todayGuessCount={daily.status === 'won' ? daily.guesses.length : null}
      />
      <ResultModal
        open={modal === 'result'}
        onClose={closeModal}
        game={game}
        shareText={buildShareText(game, getDayNumber(now))}
        onNextWord={startNextPracticeWord}
        onPracticeMore={goPractice}
      />
    </div>
  )
}
