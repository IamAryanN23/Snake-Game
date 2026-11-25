export type Direction = 'up' | 'down' | 'left' | 'right'

export type SpeedPreset = 'relaxed' | 'standard' | 'turbo'

export type GameStatus = 'ready' | 'playing' | 'paused' | 'gameover' | 'won'

export type LossReason = 'wall' | 'self' | null

export interface GridPoint {
  readonly x: number
  readonly y: number
}

export interface SpeedPresetConfig {
  readonly id: SpeedPreset
  readonly label: string
  readonly description: string
  readonly baseStepMs: number
  readonly minStepMs: number
  readonly stepDecrementMs: number
  readonly pointsPerFood: number
}

export interface EngineConfig {
  readonly gridWidth: number
  readonly gridHeight: number
  readonly speedPreset: SpeedPreset
  readonly obstacles?: readonly GridPoint[]
}

export interface EngineState {
  readonly gridWidth: number
  readonly gridHeight: number
  readonly speedPreset: SpeedPreset
  readonly snake: readonly GridPoint[]
  readonly previousSnake: readonly GridPoint[]
  readonly direction: Direction
  readonly directionQueue: readonly Direction[]
  readonly food: GridPoint | null
  readonly obstacles: readonly GridPoint[]
  readonly pendingGrowth: number
  readonly score: number
  readonly foodEaten: number
  readonly status: GameStatus
  readonly lossReason: LossReason
  readonly elapsedMs: number
  readonly ticks: number
}

export interface EngineSnapshot {
  readonly score: number
  readonly length: number
  readonly foodEaten: number
  readonly speedLevel: number
  readonly stepMs: number
  readonly status: GameStatus
  readonly lossReason: LossReason
  readonly elapsedMs: number
}

export interface StepOutcome {
  readonly state: EngineState
  readonly ateFood: boolean
  readonly turned: boolean
  readonly ended: boolean
}
