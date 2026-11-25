import { AnimatePresence } from 'motion/react'
import { GameScreen } from './components/GameScreen.tsx'
import { MainMenu } from './components/MainMenu.tsx'
import { SettingsModal } from './components/SettingsModal.tsx'
import { useGameStore } from './state/useGameStore.ts'

export function App() {
  const screen = useGameStore((s) => s.screen)

  return (
    <div className="arcade-backdrop min-h-dvh w-full">
      <AnimatePresence mode="wait">
        {screen === 'menu' ? <MainMenu key="menu" /> : <GameScreen key="game" />}
      </AnimatePresence>
      <SettingsModal />
    </div>
  )
}

export default App
