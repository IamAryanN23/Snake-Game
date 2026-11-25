import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { SPEED_PRESETS } from '../game/engine/constants.ts'
import type { SpeedPreset } from '../game/engine/types.ts'
import type { TouchControlsMode } from '../state/storage.ts'
import { useGameStore } from '../state/useGameStore.ts'
import { CloseIcon } from './Icons.tsx'

const PRESET_ORDER: readonly SpeedPreset[] = ['relaxed', 'standard', 'turbo']
const TOUCH_MODES: readonly { id: TouchControlsMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'always', label: 'Always' },
  { id: 'off', label: 'Off' },
]

export function SettingsModal() {
  const open = useGameStore((s) => s.settingsOpen)
  const settings = useGameStore((s) => s.settings)
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen)
  const updateSettings = useGameStore((s) => s.updateSettings)
  const resetStats = useGameStore((s) => s.resetStats)
  const [confirmReset, setConfirmReset] = useState(false)

  const close = () => {
    setConfirmReset(false)
    setSettingsOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b09]/80 p-4 backdrop-blur-[2px]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="surface-card w-full max-w-md rounded-3xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] tracking-[0.18em] text-[#2ce6d6] uppercase">
                  Preferences
                </div>
                <h2 id="settings-title" className="mt-0.5 text-xl font-bold text-[#f3faf5]">
                  Arcade Settings
                </h2>
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close settings"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#24382f] bg-[#0f1714] text-[#9eb6a9] transition hover:border-[#2ce6d6]/50 hover:text-white"
              >
                <CloseIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* Speed Preset */}
              <div>
                <div className="mb-2 text-xs font-medium text-[#a3bab0]">Game Pace</div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_ORDER.map((id) => {
                    const active = settings.speedPreset === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updateSettings({ speedPreset: id })}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? 'border-[#8ef743]/70 bg-[#1a2c22] text-[#8ef743]'
                            : 'border-[#22352c] bg-[#0f1714] text-[#95ada0] hover:text-white'
                        }`}
                      >
                        {SPEED_PRESETS[id].label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sound & Volume */}
              <div className="rounded-2xl border border-[#22352c] bg-[#0e1613] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#ecf4ef]">Sound Effects</div>
                    <div className="text-xs text-[#7c9487]">WebAudio feedback via Howler</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.soundEnabled}
                    onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                    className={`relative h-7 w-12 rounded-full transition ${
                      settings.soundEnabled ? 'bg-[#8ef743]' : 'bg-[#24372d]'
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-[#0a120d] transition-transform ${
                        settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-[#8da598]">
                    <span>Volume</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.volume * 100)}
                    disabled={!settings.soundEnabled}
                    onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
                    aria-label="Master volume"
                    className="w-full accent-[#8ef743] disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Board Grid */}
              <div className="flex items-center justify-between rounded-2xl border border-[#22352c] bg-[#0e1613] p-4">
                <div>
                  <div className="text-sm font-medium text-[#ecf4ef]">Grid Lines</div>
                  <div className="text-xs text-[#7c9487]">Subtle 20×20 alignment guides</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showGrid}
                  onClick={() => updateSettings({ showGrid: !settings.showGrid })}
                  className={`relative h-7 w-12 rounded-full transition ${
                    settings.showGrid ? 'bg-[#2ce6d6]' : 'bg-[#24372d]'
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-[#0a120d] transition-transform ${
                      settings.showGrid ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* On-Screen D-Pad */}
              <div>
                <div className="mb-2 text-xs font-medium text-[#a3bab0]">
                  On-Screen Touch D-Pad
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TOUCH_MODES.map((mode) => {
                    const active = settings.showTouchControls === mode.id
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => updateSettings({ showTouchControls: mode.id })}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? 'border-[#2ce6d6]/70 bg-[#142725] text-[#2ce6d6]'
                            : 'border-[#22352c] bg-[#0f1714] text-[#95ada0] hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reset Stats */}
              <div className="flex items-center justify-between border-t border-[#1e2f27] pt-4">
                <span className="text-xs text-[#7d9588]">Saved Records</span>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#ff8566] transition hover:bg-[#ff6b4a]/10"
                  >
                    Reset High Scores
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetStats()
                        setConfirmReset(false)
                      }}
                      className="rounded-lg bg-[#ff6b4a] px-3 py-1.5 text-xs font-semibold text-[#0b100e]"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded-lg px-2 py-1.5 text-xs text-[#8da598] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
