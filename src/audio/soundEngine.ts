import { Howl, Howler } from 'howler'

type SoundKey = 'eat' | 'turn' | 'start' | 'gameover' | 'record' | 'ui'

interface ToneNote {
  readonly freq: number
  readonly durationMs: number
  readonly gain: number
  readonly wave?: 'sine' | 'triangle'
  readonly glideToFreq?: number
}

const SAMPLE_RATE = 22050

function encodeWavDataUri(samples: Float32Array): string {
  const numSamples = samples.length
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  const writeStr = (offset: number, str: string): void => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

function synthesizeSequence(notes: readonly ToneNote[]): string {
  const totalSamples = notes.reduce(
    (sum, n) => sum + Math.floor((SAMPLE_RATE * n.durationMs) / 1000),
    0,
  )
  const buffer = new Float32Array(totalSamples)

  let cursor = 0
  for (const note of notes) {
    const count = Math.floor((SAMPLE_RATE * note.durationMs) / 1000)
    const attack = Math.max(1, Math.floor(count * 0.08))
    let phase = 0

    for (let i = 0; i < count; i += 1) {
      const progress = i / count
      const freq = note.glideToFreq
        ? note.freq + (note.glideToFreq - note.freq) * progress
        : note.freq
      phase += (2 * Math.PI * freq) / SAMPLE_RATE

      const raw =
        note.wave === 'triangle'
          ? (2 / Math.PI) * Math.asin(Math.sin(phase))
          : Math.sin(phase)

      const env = i < attack ? i / attack : Math.pow(1 - (i - attack) / Math.max(1, count - attack), 1.8)
      buffer[cursor + i] = raw * note.gain * env
    }
    cursor += count
  }

  return encodeWavDataUri(buffer)
}

class SoundEngine {
  private sounds: Partial<Record<SoundKey, Howl>> = {}
  private initialized = false
  private enabled = true
  private volume = 0.65

  private ensureInit(): void {
    if (this.initialized || typeof window === 'undefined' || typeof btoa === 'undefined') {
      return
    }
    this.initialized = true

    const definitions: Record<SoundKey, readonly ToneNote[]> = {
      eat: [
        { freq: 520, glideToFreq: 780, durationMs: 75, gain: 0.28, wave: 'triangle' },
        { freq: 880, durationMs: 90, gain: 0.22, wave: 'sine' },
      ],
      turn: [{ freq: 240, glideToFreq: 280, durationMs: 26, gain: 0.08, wave: 'sine' }],
      start: [
        { freq: 392, durationMs: 70, gain: 0.2, wave: 'triangle' },
        { freq: 523.25, durationMs: 110, gain: 0.24, wave: 'triangle' },
      ],
      gameover: [
        { freq: 260, glideToFreq: 130, durationMs: 160, gain: 0.28, wave: 'triangle' },
        { freq: 110, glideToFreq: 72, durationMs: 200, gain: 0.22, wave: 'sine' },
      ],
      record: [
        { freq: 523.25, durationMs: 75, gain: 0.22, wave: 'triangle' },
        { freq: 659.25, durationMs: 75, gain: 0.22, wave: 'triangle' },
        { freq: 783.99, durationMs: 150, gain: 0.26, wave: 'sine' },
      ],
      ui: [{ freq: 440, glideToFreq: 510, durationMs: 32, gain: 0.1, wave: 'sine' }],
    }

    try {
      for (const [key, notes] of Object.entries(definitions) as [SoundKey, readonly ToneNote[]][]) {
        this.sounds[key] = new Howl({
          src: [synthesizeSequence(notes)],
          format: ['wav'],
          volume: key === 'turn' ? 0.55 : 0.9,
        })
      }
      this.syncHowler()
    } catch {
      // Safe no-op in headless or restricted audio environments.
    }
  }

  private syncHowler(): void {
    try {
      Howler.mute(!this.enabled)
      Howler.volume(this.volume)
    } catch {
      // Ignore if audio context unavailable
    }
  }

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled
    this.volume = Math.max(0, Math.min(1, volume))
    this.syncHowler()
  }

  play(key: SoundKey): void {
    if (!this.enabled) {
      return
    }
    this.ensureInit()
    try {
      this.sounds[key]?.play()
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundEngine = new SoundEngine()
