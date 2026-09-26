import { useReducer } from 'react'
import { GameView } from './components/GameView'
import { Header } from './components/Header'
import { getDailyWord } from './logic/daily'
import { createGameReducer, createGameState } from './logic/game'
import { ANSWERS, isValidWord } from './logic/words'

const gameReducer = createGameReducer(isValidWord)

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, () =>
    createGameState('daily', getDailyWord(new Date(), ANSWERS)),
  )

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <Header onHelp={() => {}} onStats={() => {}} />
      <GameView game={game} dispatch={dispatch} keyboardActive />
    </div>
  )
}
