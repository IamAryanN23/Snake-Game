import { expect, test } from '@playwright/test'

test.describe('Modern Snake Arcade - Milestone 1', () => {
  test('renders main menu, persists settings across reload, and plays Classic Snake', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /^SNAKE$/i })).toBeVisible()
    const playButton = page.getByRole('button', { name: /^PLAY$/i })
    await expect(playButton).toBeVisible()

    // Select Turbo preset and verify it persists after reload
    await page.getByRole('radio', { name: /Turbo/i }).click()
    await expect(page.getByRole('radio', { name: /Turbo/i })).toHaveAttribute('aria-checked', 'true')

    await page.reload()
    await expect(page.getByRole('radio', { name: /Turbo/i })).toHaveAttribute('aria-checked', 'true')

    // Open and close settings
    await page.getByRole('button', { name: /Settings/i }).click()
    await expect(page.getByRole('dialog', { name: /SETTINGS/i })).toBeVisible()
    await page.getByRole('button', { name: /Close settings/i }).click()

    // Launch game and verify Phaser canvas + HUD
    await page.getByRole('button', { name: /^PLAY$/i }).click()
    const canvas = page.locator('[data-testid="phaser-board"] canvas')
    await expect(canvas).toBeVisible()
    await expect(page.getByTestId('hud-score')).toHaveText('0')
    await expect(page.getByTestId('hud-length')).toHaveText('4')

    // Keyboard controls: steer up and pause via Space
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Space')
    await expect(page.getByRole('heading', { name: /^PAUSED$/i })).toBeVisible()

    // Resume via button and verify Turbo snake wraps across edges without wall game-over
    await page.getByRole('button', { name: /^RESUME$/i }).click()
    await expect(page.getByRole('heading', { name: /^PAUSED$/i })).toBeHidden()
    await page.waitForTimeout(2300)
    await expect(page.getByRole('heading', { name: /^GAME OVER$/i })).toBeHidden()

    // Pause and restart cleanly
    await page.keyboard.press('Space')
    await expect(page.getByRole('heading', { name: /^PAUSED$/i })).toBeVisible()
    await page.getByRole('button', { name: /^PLAY AGAIN$/i }).click()
    await expect(page.getByRole('heading', { name: /^PAUSED$/i })).toBeHidden()
    await expect(page.getByTestId('hud-score')).toHaveText('0')
  })

  test('renders responsive touch controls on mobile viewport without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await page.getByRole('button', { name: /^PLAY$/i }).click()
    await expect(page.locator('[data-testid="phaser-board"] canvas')).toBeVisible()
    await expect(page.getByTestId('touch-controls')).toBeVisible()

    // Tap touch D-pad direction
    await page.getByRole('button', { name: /Move down/i }).dispatchEvent('pointerdown')

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(hasOverflow).toBe(false)
  })
})
