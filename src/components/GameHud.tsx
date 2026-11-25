import { useGameStore } from '../state/useGameStore.ts'
import {
  BackIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SettingsIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from './Icons.tsx'

interface GameHudProps {
  readonly onTogglePause: () => void
  readonly onRestart: () => void
  readonly onExitMenu: () => void
}

export function GameHud({ onTogglePause, onRestart, onExitMenu }: GameHudProps) {
  const hud = useGameStore((s) => s.hud)
  const settings = useGameStore((s) => s.settings)
  const bestScore = useGameStore((s) => s.stats.bestScore)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen)

  const displayBest = Math.max(bestScore, hud.score)
  const isPaused = hud.status === 'paused'
  const isEnded = hud.status === 'gameover' || hud.status === 'won'

  return (
    <header className="w-full">
      <div className="surface-card flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitMenu}
            aria-label="Back to main menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#a7bfb2] transition hover:border-[#2ce6d6]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            <BackIcon className="h-4.5 w-4.5" />
          </button>
          <span className="hidden text-sm font-bold tracking-tight text-[#f0f8f3] sm:inline">
            SNAKE
          </span>
        </div>

        {/* Center: Prominent Score & Best */}
        <div className="flex items-baseline gap-6 sm:gap-8">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium text-[#799184]">SCORE</span>
            <span
              data-testid="hud-score"
              className="text-2xl font-bold tracking-tight text-[#8ef743] tabular-nums sm:text-3xl"
            >
              {hud.score}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium text-[#799184]">BEST</span>
            <span
              data-testid="hud-best"
              className="text-2xl font-bold tracking-tight text-[#eef6f1] tabular-nums sm:text-3xl"
            >
              {displayBest}
            </span>
          </div>

          <div className="hidden items-baseline gap-2 sm:flex">
            <span className="text-[11px] font-medium text-[#799184]">Length</span>
            <span
              data-testid="hud-length"
              className="text-xl font-bold tracking-tight text-[#2ce6d6] tabular-nums"
            >
              {hud.length}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePause}
            disabled={isEnded}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#cbe0d4] transition hover:border-[#8ef743]/60 hover:text-[#8ef743] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart game"
            title="Restart (R)"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#cbe0d4] transition hover:border-[#2ce6d6]/60 hover:text-[#2ce6d6] focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            <RestartIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#cbe0d4] transition hover:border-[#2ce6d6]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            {settings.soundEnabled ? (
              <VolumeOnIcon className="h-4 w-4" />
            ) : (
              <VolumeOffIcon className="h-4 w-4 text-[#6d8277]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#cbe0d4] transition hover:border-[#2ce6d6]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
