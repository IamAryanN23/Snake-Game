import { motion } from 'motion/react'
import { SPEED_PRESETS } from '../game/engine/constants.ts'
import type { SpeedPreset } from '../game/engine/types.ts'
import { useGameStore } from '../state/useGameStore.ts'
import { PlayIcon, SettingsIcon, TrophyIcon, VolumeOffIcon, VolumeOnIcon } from './Icons.tsx'

const PRESET_ORDER: readonly SpeedPreset[] = ['relaxed', 'standard', 'turbo']

export function MainMenu() {
  const settings = useGameStore((s) => s.settings)
  const stats = useGameStore((s) => s.stats)
  const startPlay = useGameStore((s) => s.startPlay)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen)

  const selectedBest = stats.bestByPreset[settings.speedPreset]

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-between px-4 py-6 sm:px-8 sm:py-10"
    >
      {/* Top utility header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#8ef743] shadow-[0_0_12px_#8ef743]" />
          <span className="font-mono text-xs tracking-[0.22em] text-[#8aa396] uppercase">
            Classic Edition
          </span>
        </div>

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
            aria-label="Open settings"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#22352c] bg-[#121b17] px-3.5 text-sm font-medium text-[#cbe0d4] transition hover:border-[#2ce6d6]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2ce6d6]"
          >
            <SettingsIcon className="h-4 w-4 text-[#2ce6d6]" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Center hero */}
      <section className="my-auto py-8">
        <div className="surface-card relative overflow-hidden rounded-3xl p-6 sm:p-10">
          {/* Subtle decorative animated board preview strip */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 h-56 w-56 rounded-full bg-[#8ef743]/[0.06] blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#24392f] bg-[#16221d] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2ce6d6]" />
                <span className="font-mono text-[11px] tracking-[0.16em] text-[#2ce6d6] uppercase">
                  Fixed-Timestep 60fps Engine
                </span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-[#f3faf5] sm:text-6xl">
                VERDANT
                <span className="block text-[#8ef743]">SNAKE</span>
              </h1>

              <p className="mt-4 max-w-md text-base leading-relaxed text-[#9cb3a6]">
                Precision grid movement, fluid sub-cell interpolation, and escalating tempo.
                Master classic routing across twenty-by-twenty territory.
              </p>

              {/* Speed preset selector */}
              <div className="mt-7">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="font-mono text-xs tracking-[0.16em] text-[#7f988b] uppercase">
                    Pace Preset
                  </span>
                  <span className="font-mono text-xs text-[#2ce6d6] tabular-nums">
                    Best ({SPEED_PRESETS[settings.speedPreset].label}): {selectedBest}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Speed preset">
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
                        className={`rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-[#2ce6d6] ${
                          active
                            ? 'border-[#8ef743]/70 bg-[#1a2c22] text-[#f3faf5] shadow-[0_0_24px_-10px_rgba(142,247,67,0.45)]'
                            : 'border-[#22352c] bg-[#101814] text-[#90a89b] hover:border-[#324d40] hover:text-[#dce9e1]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{preset.label}</span>
                          {active && <span className="h-2 w-2 rounded-full bg-[#8ef743]" />}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[#789184] tabular-nums">
                          {preset.pointsPerFood} pts / orb
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2.5 text-xs text-[#7c9487]">
                  {SPEED_PRESETS[settings.speedPreset].description}
                </p>
              </div>

              {/* Primary CTA */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  onClick={startPlay}
                  className="inline-flex h-13 items-center justify-center gap-3 rounded-2xl bg-[#8ef743] px-7 text-base font-bold text-[#0a120d] shadow-[0_12px_32px_-10px_rgba(142,247,67,0.55)] transition hover:bg-[#9eff57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ef743]"
                >
                  <PlayIcon className="h-5 w-5" />
                  <span>Play Classic</span>
                </motion.button>

                <span className="font-mono text-xs text-[#738a7e]">
                  Arrows / WASD • Swipe
                </span>
              </div>
            </div>

            {/* Right column: Mini visual board emblem + personal records */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-[#22352c] bg-[#0e1613] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-[0.16em] text-[#7c9487] uppercase">
                    Arena Preview
                  </span>
                  <span className="font-mono text-[11px] text-[#ff6b4a]">20 × 20</span>
                </div>

                {/* Stylized clean SVG preview of our dark forest board, lime snake, coral food */}
                <svg
                  viewBox="0 0 240 160"
                  className="w-full rounded-xl border border-[#1f3128] bg-[#0c1310]"
                  aria-hidden="true"
                >
                  <defs>
                    <pattern id="menu-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="#1a2a22"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="240" height="160" fill="url(#menu-grid)" />
                  <motion.path
                    d="M 40 110 H 110 V 70 H 168"
                    fill="none"
                    stroke="#76e835"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0.25, opacity: 0.6 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <circle cx="170" cy="70" r="8.5" fill="#9eff52" />
                  <circle cx="173" cy="67" r="1.7" fill="#0b100e" />
                  <circle cx="173" cy="73" r="1.7" fill="#0b100e" />

                  <motion.circle
                    cx="200"
                    cy="70"
                    r="13"
                    fill="#ff6b4a"
                    fillOpacity="0.18"
                    animate={{ scale: [0.92, 1.12, 0.92] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <circle cx="200" cy="70" r="6.5" fill="#ff6b4a" />
                  <circle cx="198" cy="68" r="2" fill="#ffd5c8" />
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#22352c] bg-[#0e1613] p-4">
                  <div className="flex items-center gap-1.5 text-xs text-[#849d90]">
                    <TrophyIcon className="h-3.5 w-3.5 text-[#2ce6d6]" />
                    <span>Personal Best</span>
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-[#f3faf5] tabular-nums">
                    {stats.bestScore}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#22352c] bg-[#0e1613] p-4">
                  <div className="text-xs text-[#849d90]">Runs / Longest</div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-[#f3faf5] tabular-nums">
                    {stats.gamesPlayed}
                    <span className="ml-1.5 text-sm font-medium text-[#8ef743]">
                      / {stats.longestSnake}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6d8377]">
        <span>Space or P to pause during a run</span>
        <span className="font-mono">Phaser 4 • React 19 • Local Save v1</span>
      </footer>
    </motion.main>
  )
}
