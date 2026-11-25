import { create } from 'zustand'
import { soundEngine } from '../audio/soundEngine.ts'
import { INITIAL_SNAKE_LENGTH, SPEED_PRESETS } from '../game/engine/constants.ts'
import type { EngineSnapshot, SpeedPreset } from '../game/engine/types.ts'
import {
  DEFAULT_STATS,
  loadPersistedData,
  savePersistedData,
  SCHEMA_VERSION,
  type PlayerStats,
  type UserSettings,
} from './storage.ts'

export type AppScreen = 'menu' | 'playing'

export interface HudState extends EngineSnapshot {
  readonly isNewRecord: boolean
}

interface GameStoreState {
  screen: AppScreen
  settingsOpen: boolean
  settings: UserSettings
  stats: PlayerStats
  hud: HudState
  startPlay: () => void
  returnToMenu: () => void
  setSettingsOpen: (open: boolean) => void
  updateSettings: (partial: Partial<UserSettings>) => void
  syncHudSnapshot: (snapshot: EngineSnapshot) => void
  resetHudForNewRun: (preset?: SpeedPreset) => void
  recordRunCompleted: (snapshot: EngineSnapshot, preset: SpeedPreset) => boolean
  resetStats: () => void
}

const initialPersisted = loadPersistedData()
soundEngine.configure(initialPersisted.settings.soundEnabled, initialPersisted.settings.volume)

function createInitialHud(preset: SpeedPreset): HudState {
  return {
    score: 0,
    length: INITIAL_SNAKE_LENGTH,
    foodEaten: 0,
    speedLevel: 1,
    stepMs: SPEED_PRESETS[preset].baseStepMs,
    status: 'playing',
    lossReason: null,
    elapsedMs: 0,
    isNewRecord: false,
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'menu',
  settingsOpen: false,
  settings: initialPersisted.settings,
  stats: initialPersisted.stats,
  hud: createInitialHud(initialPersisted.settings.speedPreset),

  startPlay: () => {
    const preset = get().settings.speedPreset
    soundEngine.play('start')
    set({
      screen: 'playing',
      settingsOpen: false,
      hud: createInitialHud(preset),
    })
  },

  returnToMenu: () => {
    soundEngine.play('ui')
    set({ screen: 'menu', settingsOpen: false })
  },

  setSettingsOpen: (open) => {
    soundEngine.play('ui')
    set({ settingsOpen: open })
  },

  updateSettings: (partial) => {
    const current = get()
    const nextSettings: UserSettings = { ...current.settings, ...partial }
    soundEngine.configure(nextSettings.soundEnabled, nextSettings.volume)
    savePersistedData({
      version: SCHEMA_VERSION,
      settings: nextSettings,
      stats: current.stats,
    })
    set({ settings: nextSettings })
  },

  resetHudForNewRun: (preset) => {
    const activePreset = preset ?? get().settings.speedPreset
    set({ hud: createInitialHud(activePreset) })
  },

  syncHudSnapshot: (snapshot) => {
    const prev = get().hud
    if (
      prev.score === snapshot.score &&
      prev.length === snapshot.length &&
      prev.foodEaten === snapshot.foodEaten &&
      prev.speedLevel === snapshot.speedLevel &&
      prev.stepMs === snapshot.stepMs &&
      prev.status === snapshot.status &&
      prev.lossReason === snapshot.lossReason
    ) {
      return
    }
    set({
      hud: {
        ...snapshot,
        isNewRecord: prev.isNewRecord,
      },
    })
  },

  recordRunCompleted: (snapshot, preset) => {
    const current = get()
    const isNewRecord = snapshot.score > current.stats.bestScore && snapshot.score > 0
    const nextPresetBest = Math.max(current.stats.bestByPreset[preset], snapshot.score)

    const nextStats: PlayerStats = {
      bestScore: Math.max(current.stats.bestScore, snapshot.score),
      bestByPreset: {
        ...current.stats.bestByPreset,
        [preset]: nextPresetBest,
      },
      gamesPlayed: current.stats.gamesPlayed + 1,
      totalFoodEaten: current.stats.totalFoodEaten + snapshot.foodEaten,
      longestSnake: Math.max(current.stats.longestSnake, snapshot.length),
    }

    savePersistedData({
      version: SCHEMA_VERSION,
      settings: current.settings,
      stats: nextStats,
    })

    set({
      stats: nextStats,
      hud: {
        ...snapshot,
        isNewRecord,
      },
    })

    if (isNewRecord) {
      soundEngine.play('record')
    } else {
      soundEngine.play('gameover')
    }

    return isNewRecord
  },

  resetStats: () => {
    const current = get()
    const cleanStats: PlayerStats = {
      ...DEFAULT_STATS,
      bestByPreset: { ...DEFAULT_STATS.bestByPreset },
    }
    savePersistedData({
      version: SCHEMA_VERSION,
      settings: current.settings,
      stats: cleanStats,
    })
    set({ stats: cleanStats })
  },
}))
