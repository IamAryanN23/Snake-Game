export const BOARD_PALETTE = {
  background: 0x0f1714,
  cellAlt: 0x131e19,
  gridLine: 0x1e3028,
  border: 0x253a30,
  cornerAccent: 0x2ce6d6,
  foodCore: 0xff6b4a,
  foodGlow: 0xff8a6b,
  foodHighlight: 0xffd5c8,
  snakeHead: 0x9eff52,
  snakeMid: 0x76e835,
  snakeTail: 0x2e8c45,
  snakeEye: 0x0b100e,
  snakeEyeGlint: 0xeaffdc,
  cyanAccent: 0x2ce6d6,
  impactRing: 0xff5449,
} as const

export function lerpColor(fromHex: number, toHex: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  const r1 = (fromHex >> 16) & 0xff
  const g1 = (fromHex >> 8) & 0xff
  const b1 = fromHex & 0xff

  const r2 = (toHex >> 16) & 0xff
  const g2 = (toHex >> 8) & 0xff
  const b2 = toHex & 0xff

  const r = Math.round(r1 + (r2 - r1) * clamped)
  const g = Math.round(g1 + (g2 - g1) * clamped)
  const b = Math.round(b1 + (b2 - b1) * clamped)

  return (r << 16) | (g << 8) | b
}
