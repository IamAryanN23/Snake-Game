import Phaser from 'phaser'
import type { Direction, EngineSnapshot, SpeedPreset } from './engine/types.ts'
import { BOARD_PIXELS, SnakeScene, type SceneCallbacks } from './SnakeScene.ts'

export interface ControllerOptions {
  readonly parent: HTMLElement
  readonly speedPreset: SpeedPreset
  readonly showGrid: boolean
  readonly callbacks: SceneCallbacks
}

/**
 * Owns the Phaser.Game instance lifecycle independently of React rendering.
 */
export class SnakeGameController {
  private game: Phaser.Game | null = null
  private scene: SnakeScene | null = null
  private destroyed = false

  constructor(options: ControllerOptions) {
    const scene = new SnakeScene({
      speedPreset: options.speedPreset,
      showGrid: options.showGrid,
      callbacks: options.callbacks,
    })

    this.scene = scene
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: options.parent,
      width: BOARD_PIXELS,
      height: BOARD_PIXELS,
      backgroundColor: '#0f1714',
      antialias: true,
      roundPixels: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: BOARD_PIXELS,
        height: BOARD_PIXELS,
      },
      scene: [scene],
      banner: false,
    })
  }

  enqueueDirection(direction: Direction): void {
    if (!this.destroyed) {
      this.scene?.enqueueDirection(direction)
    }
  }

  togglePause(): void {
    if (!this.destroyed) {
      this.scene?.togglePause()
    }
  }

  setPaused(paused: boolean): void {
    if (!this.destroyed) {
      this.scene?.setPausedState(paused)
    }
  }

  restart(speedPreset?: SpeedPreset): void {
    if (!this.destroyed) {
      this.scene?.restart(speedPreset)
    }
  }

  applySettings(speedPreset: SpeedPreset, showGrid: boolean): void {
    if (!this.destroyed) {
      this.scene?.applySettings(speedPreset, showGrid)
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return
    }
    this.destroyed = true
    if (this.game) {
      // Phaser defers canvas removal until next rAF; remove synchronously so StrictMode remounts stay clean.
      this.game.canvas?.remove()
      this.game.destroy(true)
    }
    this.game = null
    this.scene = null
  }
}

export type { EngineSnapshot }
