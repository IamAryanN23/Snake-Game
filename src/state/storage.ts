import type { SpeedPreset } from '../game/engine/types.ts'

export const STORAGE_KEY = 'verdant-snake-save'
export const SCHEMA_VERSION = 1 as const

export type TouchControlsMode = 'auto' | 'always' | 'off'

export interface UserSettings {
  readonly speedPreset: SpeedPreset
  readonly soundEnabled: boolean
  readonly volume: number
  readonly showGrid: boolean
  readonly showTouchControls: TouchControlsMode
}

export interface PlayerStats {
  readonly bestScore: number
  readonly bestByPreset: Record<SpeedPreset, number>
  readonly gamesPlayed: number
  readonly totalFoodEaten: number
  readonly longestSnake: number
}

export interface PersistedData {
  readonly version: typeof SCHEMA_VERSION
  readonly settings: UserSettings
  readonly stats: PlayerStats
}

export const DEFAULT_SETTINGS: UserSettings = {
  speedPreset: 'standard',
  soundEnabled: true,
  volume: 0.7,
  showGrid: true,
  showTouchControls: 'auto',
}

export const DEFAULT_STATS: PlayerStats = {
  bestScore: 0,
  bestByPreset: {
    relaxed: 0,
    standard: 0,
    turbo: 0,
  },
  gamesPlayed: 0,
  totalFoodEaten: 0,
  longestSnake: 4,
}

export function createDefaultPersistedData(): PersistedData {
  return {
    version: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    stats: {
      ...DEFAULT_STATS,
      bestByPreset: { ...DEFAULT_STATS.bestByPreset },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSpeedPreset(value: unknown): value is SpeedPreset {
  return value === 'relaxed' || value === 'standard' || value === 'turbo'
}

function isTouchControlsMode(value: unknown): value is TouchControlsMode {
  return value === 'auto' || value === 'always' || value === 'off'
}

function toNonNegInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback
  }
  return Math.floor(value)
}

function sanitizeSettings(raw: unknown): UserSettings {
  if (!isRecord(raw)) {
    return { ...DEFAULT_SETTINGS }
  }
  const volume =
    typeof raw.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.max(0, Math.min(1, raw.volume))
      : DEFAULT_SETTINGS.volume

  return {
    speedPreset: isSpeedPreset(raw.speedPreset) ? raw.speedPreset : DEFAULT_SETTINGS.speedPreset,
    soundEnabled:
      typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    volume,
    showGrid: typeof raw.showGrid === 'boolean' ? raw.showGrid : DEFAULT_SETTINGS.showGrid,
    showTouchControls: isTouchControlsMode(raw.showTouchControls)
      ? raw.showTouchControls
      : DEFAULT_SETTINGS.showTouchControls,
  }
}

function sanitizeStats(raw: unknown): PlayerStats {
  if (!isRecord(raw)) {
    return {
      ...DEFAULT_STATS,
      bestByPreset: { ...DEFAULT_STATS.bestByPreset },
    }
  }

  const rawByPreset = isRecord(raw.bestByPreset) ? raw.bestByPreset : {}
  const bestByPreset: Record<SpeedPreset, number> = {
    relaxed: toNonNegInt(rawByPreset.relaxed, 0),
    standard: toNonNegInt(rawByPreset.standard, 0),
    turbo: toNonNegInt(rawByPreset.turbo, 0),
  }

  const maxPresetBest = Math.max(bestByPreset.relaxed, bestByPreset.standard, bestByPreset.turbo)
  const bestScore = Math.max(toNonNegInt(raw.bestScore, 0), maxPresetBest)

  return {
    bestScore,
    bestByPreset,
    gamesPlayed: toNonNegInt(raw.gamesPlayed, 0),
    totalFoodEaten: toNonNegInt(raw.totalFoodEaten, 0),
    longestSnake: Math.max(DEFAULT_STATS.longestSnake, toNonNegInt(raw.longestSnake, 4)),
  }
}

export function loadPersistedData(storage?: Storage): PersistedData {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  if (!target) {
    return createDefaultPersistedData()
  }

  try {
    const rawText = target.getItem(STORAGE_KEY)
    if (!rawText) {
      return createDefaultPersistedData()
    }
    const parsed: unknown = JSON.parse(rawText)
    if (!isRecord(parsed) || parsed.version !== SCHEMA_VERSION) {
      return createDefaultPersistedData()
    }

    return {
      version: SCHEMA_VERSION,
      settings: sanitizeSettings(parsed.settings),
      stats: sanitizeStats(parsed.stats),
    }
  } catch {
    return createDefaultPersistedData()
  }
}

export function savePersistedData(data: PersistedData, storage?: Storage): void {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  if (!target) {
    return
  }
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore quota or private-browsing storage errors gracefully.
  }
}
