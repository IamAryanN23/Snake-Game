import { beforeEach, describe, expect, it } from 'vitest'
import {
  createDefaultPersistedData,
  loadPersistedData,
  savePersistedData,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from './storage.ts'

describe('storage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns clean defaults when storage is empty', () => {
    const data = loadPersistedData()
    expect(data).toEqual(createDefaultPersistedData())
  })

  it('round-trips valid persisted settings and stats', () => {
    const custom = {
      version: SCHEMA_VERSION,
      settings: {
        speedPreset: 'turbo' as const,
        soundEnabled: false,
        volume: 0.45,
        showGrid: false,
        showTouchControls: 'always' as const,
      },
      stats: {
        bestScore: 340,
        bestByPreset: { relaxed: 120, standard: 240, turbo: 340 },
        gamesPlayed: 8,
        totalFoodEaten: 42,
        longestSnake: 19,
      },
    }

    savePersistedData(custom)
    expect(loadPersistedData()).toEqual(custom)
  })

  it('recovers safely from corrupted JSON and mismatched schema versions', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-valid-json')
    expect(loadPersistedData()).toEqual(createDefaultPersistedData())

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, settings: { speedPreset: 'turbo' } }),
    )
    expect(loadPersistedData()).toEqual(createDefaultPersistedData())
  })

  it('sanitizes out-of-range or invalid fields without losing valid ones', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        settings: {
          speedPreset: 'invalid-mode',
          soundEnabled: false,
          volume: 99,
          showGrid: 'yes',
          showTouchControls: 'always',
        },
        stats: {
          bestScore: -50,
          bestByPreset: { relaxed: 100, standard: -5, turbo: 250 },
          gamesPlayed: 3,
          totalFoodEaten: 14,
          longestSnake: 1,
        },
      }),
    )

    const loaded = loadPersistedData()
    expect(loaded.settings.speedPreset).toBe('standard')
    expect(loaded.settings.soundEnabled).toBe(false)
    expect(loaded.settings.volume).toBe(1)
    expect(loaded.settings.showGrid).toBe(true)
    expect(loaded.settings.showTouchControls).toBe('always')
    expect(loaded.stats.bestScore).toBe(250)
    expect(loaded.stats.longestSnake).toBe(4)
  })
})
