import { useReducer } from 'react'
import { Board } from './components/Board'
import { Header } from './components/Header'
import { getDailyWord } from './logic/daily'
import { createGameReducer, createGameState } from './logic/game'
import { ANSWERS, isValidWord } from './logic/words'

const gameReducer = createGameReducer(isValidWord)

export default function App() {
  const [game] = useReducer(gameReducer, undefined, () =>
    createGameState('daily', getDailyWord(new Date(), ANSWERS)),
  )
  const acceptsInput = game.status === 'idle' || game.status === 'playing'

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <Header onHelp={() => {}} onStats={() => {}} />
      <main className="flex flex-1 items-center justify-center px-4 py-2">
        <Board
          guesses={game.guesses}
          currentGuess={game.currentGuess}
          acceptsInput={acceptsInput}
          revealRow={null}
          shakeKey={game.error?.id ?? null}
        />
      </main>
    </div>
  )
}
