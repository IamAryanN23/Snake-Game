import { SPEED_PRESETS } from '../game/engine/constants.ts'
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
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
        {/* Left: Back & Mode Label */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onExitMenu}
            aria-label="Back to main menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#a7bfb2] transition hover:border-[#2ce6d6]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            <BackIcon className="h-4.5 w-4.5" />
          </button>
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#f0f8f3]">Classic</div>
            <div className="font-mono text-[11px] text-[#7b9487]">
              {SPEED_PRESETS[settings.speedPreset].label} • Lv {hud.speedLevel}
            </div>
          </div>
        </div>

        {/* Center: Live Telemetry */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-[#799184] uppercase">
              Score
            </div>
            <div
              data-testid="hud-score"
              className="font-mono text-xl font-bold text-[#8ef743] tabular-nums sm:text-2xl"
            >
              {hud.score}
            </div>
          </div>

          <div className="h-7 w-px bg-[#22352c]" aria-hidden="true" />

          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-[#799184] uppercase">
              Best
            </div>
            <div
              data-testid="hud-best"
              className="font-mono text-xl font-bold text-[#eef6f1] tabular-nums sm:text-2xl"
            >
              {displayBest}
            </div>
          </div>

          <div className="hidden h-7 w-px bg-[#22352c] sm:block" aria-hidden="true" />

          <div className="hidden sm:block">
            <div className="font-mono text-[10px] tracking-[0.16em] text-[#799184] uppercase">
              Length
            </div>
            <div
              data-testid="hud-length"
              className="font-mono text-xl font-bold text-[#2ce6d6] tabular-nums sm:text-2xl"
            >
              {hud.length}
            </div>
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
            aria-label="Open settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#cbe0d4] transition hover:border-[#2ce6d6]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
