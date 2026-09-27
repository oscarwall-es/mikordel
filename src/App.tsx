import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { ColorModal } from './components/ColorModal'
import { MikaIndicator } from './mika/MikaIndicator'
import { GameView } from './components/GameView'
import { Header } from './components/Header'
import { HelpModal } from './components/HelpModal'
import { ModeTabs } from './components/ModeTabs'
import { ResultModal } from './components/ResultModal'
import { StatsModal } from './components/StatsModal'
import { getDailyWord, getDayNumber, toDateKey } from './logic/daily'
import { createGameReducer, createGameState, type GameAction, type GameMode, type GameState } from './logic/game'
import { pushRecent } from './logic/practice'
import { buildShareText } from './logic/share'
import {
  hasSeenHelp,
  loadDailyState,
  loadStats,
  markHelpSeen,
  recordResult,
  saveDailyState,
  type GameResult,
} from './logic/storage'
import { ANSWERS, isValidWord } from './logic/words'
import { shouldCelebrate } from './ui/celebration'
import { pickRandomColor, shouldAutoChangeColor } from './ui/colors'
import { nextPracticeWord } from './practiceWords'
import { useBackgroundColor } from './ui/useBackgroundColor'

const gameReducer = createGameReducer(isValidWord)

type ModalName = 'help' | 'stats' | 'result' | 'colors' | null

const isFinished = (g: GameState) => g.status === 'won' || g.status === 'lost'

function toResult(game: GameState, date: string): GameResult {
  const base = { won: game.status === 'won', guessCount: game.guesses.length }
  return game.mode === 'daily' ? { ...base, mode: 'daily', date } : { ...base, mode: 'practice' }
}

/** Dagens omgång: återställd från localStorage om den påbörjats i dag, annars en ny. */
function initDaily(now: Date): GameState {
  const saved = loadDailyState(toDateKey(now))
  return saved
    ? createGameState('daily', saved.answer, saved.guesses)
    : createGameState('daily', getDailyWord(now, ANSWERS))
}

const actionButton = 'h-10 rounded-lg px-5 font-bold tracking-[0.03em] uppercase'

export default function App() {
  const [now] = useState(() => new Date())
  const today = toDateKey(now)

  const [daily, dispatchDaily] = useReducer(gameReducer, now, initDaily)

  // Övningsläget: de senaste orden i sessionen (inte localStorage). Dagens ord är
  // undantaget hela dagen via nextPracticeWord.
  const [recent, setRecent] = useState<string[]>([])
  const [practice, dispatchPractice] = useReducer(gameReducer, undefined, () =>
    createGameState('practice', nextPracticeWord(ANSWERS, daily.answer, [])),
  )
  const [practiceRound, setPracticeRound] = useState(0)

  const [mode, setMode] = useState<GameMode>('daily')
  const [backgroundColor, setBackgroundColor] = useBackgroundColor()
  // Räknas upp vid varje vinst; ny key på CelebrationOverlay spelar upp effekten igen.
  const [celebration, setCelebration] = useState(0)
  const endCelebration = useCallback(() => setCelebration(0), [])
  // Redan klart för i dag → visa resultatet direkt. Första besöket → visa hjälpen.
  const [modal, setModal] = useState<ModalName>(() =>
    isFinished(daily) ? 'result' : hasSeenHelp() ? null : 'help',
  )
  const closeModal = () => {
    if (modal === 'help') markHelpSeen()
    setModal(null)
  }

  // --- Persistens. Reducern är sanningskällan; effekterna speglar den till localStorage. ---

  // Spara dagens gissningar efter varje giltig gissning, så omladdning återställer omgången.
  useEffect(() => {
    saveDailyState({ date: today, answer: daily.answer, guesses: daily.guesses.map((g) => g.word) })
  }, [today, daily.answer, daily.guesses])

  // Registrera dagens resultat. recordResult ignorerar ett andra resultat för samma datum,
  // så det är ofarligt att detta även körs när en redan avslutad omgång återställs.
  useEffect(() => {
    if (isFinished(daily)) recordResult(toResult(daily, today))
  }, [daily, today])

  // Övningsomgångar sparas inte och har inget datum – räkna varje omgång exakt en gång.
  const recordedPracticeRound = useRef<number | null>(null)
  useEffect(() => {
    if (isFinished(practice) && recordedPracticeRound.current !== practiceRound) {
      recordedPracticeRound.current = practiceRound
      recordResult(toResult(practice, today))
    }
  }, [practice, practiceRound, today])

  // Nytt dagens ord vid midnatt: ladda om när fliken blir synlig igen en senare dag.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && toDateKey(new Date()) !== today) window.location.reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [today])
  const showResult = useCallback(() => setModal('result'), [])

  const game = mode === 'daily' ? daily : practice

  // Körs när sista raden i en omgång vänts klart (inte när en avslutad omgång återställs).
  const handleRevealComplete = useCallback(() => {
    setModal('result')
    // Regn av stjärnor och hjärtan vid varje vinst, i båda lägena
    if (shouldCelebrate(game.status)) setCelebration((n) => n + 1)
    // Vunnen övningsrunda → ny slumpad bakgrund, som också skriver över det manuella valet.
    if (shouldAutoChangeColor(game.mode, game.status)) setBackgroundColor((current) => pickRandomColor(current))
  }, [game.mode, game.status, setBackgroundColor])
  const dispatch = (action: GameAction) => (mode === 'daily' ? dispatchDaily : dispatchPractice)(action)

  const startNextPracticeWord = () => {
    // practice.answer kan saknas i recent om man aldrig spelat klart en omgång
    const seen = pushRecent(recent, practice.answer)
    const word = nextPracticeWord(ANSWERS, daily.answer, seen)
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
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} onColors={() => setModal('colors')} />
      <ModeTabs mode={mode} onChange={setMode} />
      <GameView
        // Ny instans per läge och övningsomgång, så animationstillståndet börjar om
        key={mode === 'daily' ? 'daily' : `practice-${practiceRound}`}
        game={game}
        dispatch={dispatch}
        keyboardActive={modal === null}
        onRevealComplete={handleRevealComplete}
        finishedActions={finishedActions}
      />
      {/* Modalerna monteras bara när de är öppna, så statistiken läses färskt och nedräkningen inte tickar i onödan */}
      {modal === 'help' && <HelpModal open onClose={closeModal} />}
      {modal === 'colors' && (
        <ColorModal open onClose={closeModal} color={backgroundColor} onChange={setBackgroundColor} />
      )}
      {modal === 'stats' && (
        <StatsModal
          open
          onClose={closeModal}
          stats={loadStats()}
          today={today}
          todayGuessCount={daily.status === 'won' ? daily.guesses.length : null}
        />
      )}
      {modal === 'result' && (
        <ResultModal
          open
          onClose={closeModal}
          game={game}
          shareText={buildShareText(game, getDayNumber(now))}
          onNextWord={startNextPracticeWord}
          onPracticeMore={goPractice}
        />
      )}
      <MikaIndicator />
      {/* Sist, så att popovern öppnas efter resultatdialogen och hamnar ovanför den */}
      {celebration > 0 && <CelebrationOverlay key={celebration} onDone={endCelebration} />}
    </div>
  )
}
