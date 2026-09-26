import { useReducer, useState } from 'react'
import { GameView } from './components/GameView'
import { Header } from './components/Header'
import { HelpModal } from './components/HelpModal'
import { getDailyWord } from './logic/daily'
import { createGameReducer, createGameState } from './logic/game'
import { ANSWERS, isValidWord } from './logic/words'

const gameReducer = createGameReducer(isValidWord)

type ModalName = 'help' | 'stats' | null

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, () =>
    createGameState('daily', getDailyWord(new Date(), ANSWERS)),
  )
  const [modal, setModal] = useState<ModalName>(null)
  const closeModal = () => setModal(null)

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} />
      <GameView game={game} dispatch={dispatch} keyboardActive={modal === null} />
      <HelpModal open={modal === 'help'} onClose={closeModal} />
    </div>
  )
}
