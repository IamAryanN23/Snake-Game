import { motion } from 'motion/react'
import { useState, type MouseEvent } from 'react'
import { SPEED_PRESETS } from '../game/engine/constants.ts'
import type { SpeedPreset } from '../game/engine/types.ts'
import { useGameStore } from '../state/useGameStore.ts'
import { PlayIcon, SettingsIcon, VolumeOffIcon, VolumeOnIcon } from './Icons.tsx'
import { AnimatedNumber } from './landing/AnimatedNumber.tsx'
import { InteractiveBackdrop } from './landing/InteractiveBackdrop.tsx'
import { LivePreviewBoard } from './landing/LivePreviewBoard.tsx'
import { TitleSnakeOverlay } from './landing/TitleSnakeOverlay.tsx'
import { usePrefersReducedMotion } from './landing/usePrefersReducedMotion.ts'

const PRESET_ORDER: readonly SpeedPreset[] = ['relaxed', 'standard', 'turbo']

export function MainMenu() {
  const settings = useGameStore((s) => s.settings)
  const stats = useGameStore((s) => s.stats)
  const startPlay = useGameStore((s) => s.startPlay)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen)
  const reducedMotion = usePrefersReducedMotion()

  const [magnet, setMagnet] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const selectedBest = stats.bestByPreset[settings.speedPreset]

  const handlePlayMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 4
    const dy = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 3
    setMagnet({ x: dx, y: dy })
  }

  return (
    <>
      <InteractiveBackdrop />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-between px-5 py-6 sm:px-10 sm:py-10"
      >
        {/* Top utility bar */}
        <header className="flex items-center justify-between">
          <span
            aria-hidden="true"
            className="inline-flex h-2.5 w-2.5 rounded-full bg-[#8ef743] shadow-[0_0_12px_#8ef743]"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#22352c] bg-[#121b17] text-[#a9bfb3] transition hover:border-[#2ce6d6]/50 hover:text-[#ecf4ef] focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
            >
              {settings.soundEnabled ? (
                <VolumeOnIcon className="h-4.5 w-4.5" />
              ) : (
                <VolumeOffIcon className="h-4.5 w-4.5 text-[#6d8277]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#22352c] bg-[#121b17] px-3.5 text-xs font-semibold tracking-wider text-[#cbe0d4] transition hover:border-[#2ce6d6]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
            >
              <SettingsIcon className="h-4 w-4 text-[#2ce6d6]" />
              <span>SETTINGS</span>
            </button>
          </div>
        </header>

        {/* Centerpiece */}
        <section className="my-auto py-8">
          <div className="surface-card surface-card-breathing relative overflow-hidden rounded-3xl p-7 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full bg-[#8ef743]/[0.05] blur-3xl"
            />

            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.85fr] lg:items-center">
              <div>
                <div className="pt-3 pb-1">
                  <TitleSnakeOverlay speedPreset={settings.speedPreset} />
                </div>

                {/* Speed selector */}
                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between text-xs text-[#7f988b]">
                    <span>Speed</span>
                    <span className="tabular-nums text-[#2ce6d6]">
                      BEST {selectedBest}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Speed">
                    {PRESET_ORDER.map((presetKey) => {
                      const preset = SPEED_PRESETS[presetKey]
                      const active = settings.speedPreset === presetKey
                      return (
                        <button
                          key={presetKey}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => updateSettings({ speedPreset: presetKey })}
                          className={`relative overflow-hidden rounded-2xl border px-3.5 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#2ce6d6] ${
                            active
                              ? 'border-[#8ef743]/70 text-[#f3faf5]'
                              : 'border-[#22352c] bg-[#101814] text-[#8da598] hover:border-[#324d40] hover:text-[#dce9e1]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="speed-pill-active"
                              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                              aria-hidden="true"
                              className="absolute inset-0 rounded-2xl bg-[#1a2c22] shadow-[0_0_24px_-10px_rgba(142,247,67,0.45)]"
                            />
                          )}
                          <span className="relative z-10">{preset.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="mt-8 flex items-center gap-4">
                  <motion.button
                    animate={{ x: magnet.x, y: magnet.y }}
                    whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                    onMouseMove={handlePlayMove}
                    onMouseLeave={() => setMagnet({ x: 0, y: 0 })}
                    type="button"
                    onClick={startPlay}
                    className="play-btn-breathing inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#8ef743] px-9 text-base font-bold tracking-wide text-[#0a120d] transition-colors hover:bg-[#9eff57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ef743]"
                  >
                    <PlayIcon className="h-5 w-5" />
                    <span>PLAY</span>
                  </motion.button>
                </div>
              </div>

              {/* Right column: Autonomous live preview & animated stats */}
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-[#1f3128] bg-[#0e1613] p-4">
                  <LivePreviewBoard speedPreset={settings.speedPreset} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#1f3128] bg-[#0e1613] p-4">
                    <div className="text-xs font-medium text-[#7f988b]">BEST</div>
                    <div className="mt-1 text-3xl font-bold tracking-tight text-[#f3faf5] tabular-nums">
                      <AnimatedNumber value={stats.bestScore} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#1f3128] bg-[#0e1613] p-4">
                    <div className="text-xs font-medium text-[#7f988b]">Games</div>
                    <div className="mt-1 text-3xl font-bold tracking-tight text-[#f3faf5] tabular-nums">
                      <AnimatedNumber value={stats.gamesPlayed} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between text-xs text-[#687e72]">
          <span>Arrows or WASD to steer</span>
          <span>Space to pause</span>
        </footer>
      </motion.main>
    </>
  )
}
