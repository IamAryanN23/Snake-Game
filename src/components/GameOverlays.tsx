import { AnimatePresence, motion } from 'motion/react'
import { useGameStore } from '../state/useGameStore.ts'
import { PlayIcon, RestartIcon, TrophyIcon } from './Icons.tsx'

interface GameOverlaysProps {
  readonly onResume: () => void
  readonly onRestart: () => void
  readonly onExitMenu: () => void
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function GameOverlays({ onResume, onRestart, onExitMenu }: GameOverlaysProps) {
  const hud = useGameStore((s) => s.hud)
  const bestScore = useGameStore((s) => s.stats.bestScore)

  const isPaused = hud.status === 'paused'
  const isEnded = hud.status === 'gameover' || hud.status === 'won'

  const endReasonLabel =
    hud.status === 'won'
      ? 'Full board cleared!'
      : hud.lossReason === 'self'
        ? 'Self collision'
        : 'Wall impact'

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          key="pause-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#090e0c]/82 p-5 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card w-full max-w-xs rounded-2xl p-6 text-center"
          >
            <div className="font-mono text-[11px] tracking-[0.2em] text-[#2ce6d6] uppercase">
              Run Paused
            </div>
            <h2 className="mt-1.5 text-2xl font-bold text-[#f3faf5]">Take a Breather</h2>
            <p className="mt-1.5 text-xs text-[#8ba396]">Press Space or P to resume</p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8ef743] font-semibold text-[#0a120d] transition hover:bg-[#9eff57]"
              >
                <PlayIcon className="h-4.5 w-4.5" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                onClick={onRestart}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#263c31] bg-[#16231d] font-medium text-[#e4efe8] transition hover:border-[#2ce6d6]/50"
              >
                <RestartIcon className="h-4 w-4" />
                <span>Restart Run</span>
              </button>

              <button
                type="button"
                onClick={onExitMenu}
                className="inline-flex h-10 items-center justify-center rounded-xl text-sm font-medium text-[#92aba0] transition hover:bg-[#182620] hover:text-white"
              >
                Main Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {isEnded && (
        <motion.div
          key="gameover-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#090e0c]/86 p-5 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card w-full max-w-sm rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-[0.18em] text-[#ff6b4a] uppercase">
                {endReasonLabel}
              </span>
              {hud.isNewRecord && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#2ce6d6]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#2ce6d6]">
                  <TrophyIcon className="h-3 w-3" />
                  New Best
                </span>
              )}
            </div>

            <h2 className="mt-2 text-2xl font-bold text-[#f3faf5]">
              {hud.status === 'won' ? 'Perfect Run' : 'Run Complete'}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-[#22352c] bg-[#0e1613] p-3">
                <div className="font-mono text-[10px] tracking-[0.14em] text-[#7b9487] uppercase">
                  Final Score
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#8ef743] tabular-nums">
                  {hud.score}
                </div>
              </div>

              <div className="rounded-xl border border-[#22352c] bg-[#0e1613] p-3">
                <div className="font-mono text-[10px] tracking-[0.14em] text-[#7b9487] uppercase">
                  Personal Best
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#eef6f1] tabular-nums">
                  {Math.max(bestScore, hud.score)}
                </div>
              </div>

              <div className="rounded-xl border border-[#22352c] bg-[#0e1613] p-3">
                <div className="font-mono text-[10px] tracking-[0.14em] text-[#7b9487] uppercase">
                  Food / Length
                </div>
                <div className="mt-1 font-mono text-base font-semibold text-[#ff8566] tabular-nums">
                  {hud.foodEaten} <span className="text-[#789184]">/</span>{' '}
                  <span className="text-[#2ce6d6]">{hud.length}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#22352c] bg-[#0e1613] p-3">
                <div className="font-mono text-[10px] tracking-[0.14em] text-[#7b9487] uppercase">
                  Duration
                </div>
                <div className="mt-1 font-mono text-base font-semibold text-[#dce8e1] tabular-nums">
                  {formatDuration(hud.elapsedMs)}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8ef743] font-bold text-[#0a120d] transition hover:bg-[#9eff57]"
              >
                <RestartIcon className="h-4.5 w-4.5" />
                <span>Play Again</span>
              </button>

              <button
                type="button"
                onClick={onExitMenu}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-sm font-medium text-[#b8ccc1] transition hover:border-[#2ce6d6]/50 hover:text-white"
              >
                Main Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
