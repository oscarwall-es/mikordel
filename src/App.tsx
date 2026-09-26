import { useCallback, useReducer, useState } from 'react'
import { GameView } from './components/GameView'
import { Header } from './components/Header'
import { HelpModal } from './components/HelpModal'
import { ResultModal } from './components/ResultModal'
import { StatsModal } from './components/StatsModal'
import { getDailyWord, getDayNumber, toDateKey } from './logic/daily'
import { createGameReducer, createGameState } from './logic/game'
import { buildShareText } from './logic/share'
import { loadStats } from './logic/storage'
import { ANSWERS, isValidWord } from './logic/words'

const gameReducer = createGameReducer(isValidWord)

type ModalName = 'help' | 'stats' | 'result' | null

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, () =>
    createGameState('daily', getDailyWord(new Date(), ANSWERS)),
  )
  const [modal, setModal] = useState<ModalName>(null)
  const closeModal = () => setModal(null)
  const showResult = useCallback(() => setModal('result'), [])

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} />
      <GameView
        game={game}
        dispatch={dispatch}
        keyboardActive={modal === null}
        onRevealComplete={showResult}
        finishedActions={
          <button
            type="button"
            onClick={showResult}
            className="h-10 rounded-lg bg-action px-5 font-bold tracking-[0.03em] uppercase"
          >
            Visa resultat
          </button>
        }
      />
      <HelpModal open={modal === 'help'} onClose={closeModal} />
      <StatsModal
        open={modal === 'stats'}
        onClose={closeModal}
        stats={loadStats()}
        today={toDateKey(new Date())}
        todayGuessCount={game.status === 'won' ? game.guesses.length : null}
      />
      <ResultModal
        open={modal === 'result'}
        onClose={closeModal}
        game={game}
        shareText={buildShareText(game, getDayNumber(new Date()))}
        onNextWord={closeModal}
        onPracticeMore={closeModal}
      />
    </div>
  )
}
