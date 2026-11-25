import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { soundEngine } from '../audio/soundEngine.ts'
import type { Direction } from '../game/engine/types.ts'
import { SnakeGameController } from '../game/SnakeGameController.ts'
import { useGameStore } from '../state/useGameStore.ts'
import { GameHud } from './GameHud.tsx'
import { GameOverlays } from './GameOverlays.tsx'
import { TouchControls } from './TouchControls.tsx'

export function GameScreen() {
  const boardContainerRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<SnakeGameController | null>(null)

  const speedPreset = useGameStore((s) => s.settings.speedPreset)
  const showGrid = useGameStore((s) => s.settings.showGrid)
  const showTouchControls = useGameStore((s) => s.settings.showTouchControls)
  const settingsOpen = useGameStore((s) => s.settingsOpen)
  const returnToMenu = useGameStore((s) => s.returnToMenu)

  // Mount Phaser cleanly once for this game session and destroy it on unmount.
  useEffect(() => {
    const parent = boardContainerRef.current
    if (!parent) {
      return
    }

    const initialSettings = useGameStore.getState().settings
    const controller = new SnakeGameController({
      parent,
      speedPreset: initialSettings.speedPreset,
      showGrid: initialSettings.showGrid,
      callbacks: {
        onSnapshot: (snapshot) => {
          useGameStore.getState().syncHudSnapshot(snapshot)
        },
        onEat: (snapshot) => {
          soundEngine.play('eat')
          useGameStore.getState().syncHudSnapshot(snapshot)
        },
        onTurn: () => {
          soundEngine.play('turn')
        },
        onGameOver: (snapshot, preset) => {
          useGameStore.getState().recordRunCompleted(snapshot, preset)
        },
      },
    })

    controllerRef.current = controller

    return () => {
      controller.destroy()
      controllerRef.current = null
    }
  }, [])

  // Sync live preference updates without recreating the Phaser instance.
  useEffect(() => {
    controllerRef.current?.applySettings(speedPreset, showGrid)
  }, [speedPreset, showGrid])

  // Auto-pause active play when opening the Settings dialog.
  useEffect(() => {
    if (settingsOpen && useGameStore.getState().hud.status === 'playing') {
      controllerRef.current?.setPaused(true)
    }
  }, [settingsOpen])

  const handleTogglePause = () => {
    controllerRef.current?.togglePause()
  }

  const handleResume = () => {
    controllerRef.current?.setPaused(false)
  }

  const handleRestart = () => {
    const preset = useGameStore.getState().settings.speedPreset
    soundEngine.play('start')
    useGameStore.getState().resetHudForNewRun(preset)
    controllerRef.current?.restart(preset)
  }

  const handleDirection = (dir: Direction) => {
    controllerRef.current?.enqueueDirection(dir)
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 px-3 py-4 sm:px-6 sm:py-6"
    >
      <GameHud
        onTogglePause={handleTogglePause}
        onRestart={handleRestart}
        onExitMenu={returnToMenu}
      />

      {/* Centered Phaser Board Stage */}
      <div className="relative w-full max-w-[min(88vw,560px)] sm:max-w-[min(74vh,600px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[28px] bg-[#8ef743]/[0.04] blur-2xl"
        />

        <div className="surface-card relative aspect-square w-full overflow-hidden rounded-2xl p-1.5 sm:p-2">
          <div
            ref={boardContainerRef}
            data-testid="phaser-board"
            className="h-full w-full touch-none overflow-hidden rounded-xl bg-[#0f1714]"
          />
          <GameOverlays
            onResume={handleResume}
            onRestart={handleRestart}
            onExitMenu={returnToMenu}
          />
        </div>
      </div>

      <TouchControls mode={showTouchControls} onDirection={handleDirection} />

      <div className="hidden items-center gap-4 text-xs text-[#687e72] md:flex">
        <span>Arrows / WASD</span>
        <span aria-hidden="true">·</span>
        <span>Space to pause</span>
        <span aria-hidden="true">·</span>
        <span>R to restart</span>
      </div>
    </motion.main>
  )
}
