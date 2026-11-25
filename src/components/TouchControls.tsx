import type { Direction } from '../game/engine/types.ts'
import type { TouchControlsMode } from '../state/storage.ts'
import { ChevronIcon } from './Icons.tsx'

interface TouchControlsProps {
  readonly mode: TouchControlsMode
  readonly onDirection: (direction: Direction) => void
}

export function TouchControls({ mode, onDirection }: TouchControlsProps) {
  if (mode === 'off') {
    return null
  }

  const visibilityClass = mode === 'always' ? 'flex' : 'flex md:hidden'

  const buttonClass =
    'flex h-13 w-16 touch-manipulation select-none items-center justify-center rounded-2xl border border-[#253a30] bg-[#131e19] text-[#dbe9e1] active:scale-95 active:border-[#8ef743] active:bg-[#1a2c22] active:text-[#8ef743] transition'

  return (
    <div
      data-testid="touch-controls"
      className={`${visibilityClass} flex-col items-center gap-2 pt-1`}
      aria-label="Touch directional controls"
    >
      <button
        type="button"
        aria-label="Move up"
        onPointerDown={(e) => {
          e.preventDefault()
          onDirection('up')
        }}
        className={buttonClass}
      >
        <ChevronIcon direction="up" className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Move left"
          onPointerDown={(e) => {
            e.preventDefault()
            onDirection('left')
          }}
          className={buttonClass}
        >
          <ChevronIcon direction="left" className="h-6 w-6" />
        </button>

        <button
          type="button"
          aria-label="Move down"
          onPointerDown={(e) => {
            e.preventDefault()
            onDirection('down')
          }}
          className={buttonClass}
        >
          <ChevronIcon direction="down" className="h-6 w-6" />
        </button>

        <button
          type="button"
          aria-label="Move right"
          onPointerDown={(e) => {
            e.preventDefault()
            onDirection('right')
          }}
          className={buttonClass}
        >
          <ChevronIcon direction="right" className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
