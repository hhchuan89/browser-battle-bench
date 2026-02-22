import { test, expect } from '@playwright/test'

test.describe('BBB smoke routes', () => {
  test('home renders core CTA', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /Browser Battle Bench/i })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Star/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Enter Arena/i })
    ).toBeVisible()
    await expect(page.getByText(/Quick Battle Snapshot/i)).toBeVisible()
  })

  test('arena renders model selector and start button', async ({ page }) => {
    await page.goto('/arena')
    await expect(page.getByRole('heading', { name: /Arena/i })).toBeVisible()
    await expect(page.locator('select').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Start Battle/i })
    ).toBeVisible()
  })

  test('quick renders entry state', async ({ page }) => {
    await page.goto('/quick')
    await expect(
      page.getByRole('heading', { name: /Quick Battle/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Initialize Engine|Start Quick Battle/i })
    ).toBeVisible()
  })

  test('quick accepts challenge deep link parameters', async ({ page }) => {
    await page.goto(
      '/quick?challenge=1&mode=quick&scenario=quick-battle-30s&model=Llama-3.2-1B-Instruct-q4f16_1-MLC'
    )
    await expect(
      page.getByText(/Challenge loaded: Quick Battle 30s/i)
    ).toBeVisible()
  })

  test('gauntlet renders functional entry state', async ({ page }) => {
    await page.goto('/gauntlet')
    await expect(page.getByRole('heading', { name: /Gauntlet/i })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Initialize Engine|Start Logic Battle/i })
    ).toBeVisible()
  })

  test('gauntlet accepts challenge deep link parameters', async ({ page }) => {
    await page.goto(
      '/gauntlet?challenge=1&mode=gauntlet&scenario=logic-traps-l1&model=Llama-3.2-1B-Instruct-q4f16_1-MLC'
    )
    await expect(page.getByText(/Challenge loaded:/i)).toBeVisible()
  })

  test('stress renders functional entry state', async ({ page }) => {
    await page.goto('/stress')
    await expect(page.getByRole('heading', { name: /Stress Test/i })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Initialize Engine|Start/i })
    ).toBeVisible()
  })

  test('stress accepts challenge deep link parameters', async ({ page }) => {
    await page.goto(
      '/stress?challenge=1&mode=stress&scenario=quick-smoke&model=Llama-3.2-1B-Instruct-q4f16_1-MLC'
    )
    await expect(page.getByText(/Challenge loaded:/i)).toBeVisible()
  })

  test('leaderboard renders local leaderboard panel', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.getByRole('heading', { name: /^🏆\s*Leaderboard$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Local Leaderboard$/i })).toBeVisible()
  })

  test('history renders run-history panel', async ({ page }) => {
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: /^📜\s*History$/i })).toBeVisible()
    await expect(page.getByText(/Run History/i)).toBeVisible()
  })

  test('import route renders strict dual-file importer', async ({ page }) => {
    await page.goto('/import')
    await expect(page.getByRole('heading', { name: /Import Local Run/i })).toBeVisible()
    await expect(page.getByText(/strict dual-file import/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Run Local Precheck/i })).toBeVisible()
  })

  test('diagnostics renders heading', async ({ page }) => {
    await page.goto('/diagnostics')
    await expect(page.getByRole('heading', { name: /Diagnostics/i })).toBeVisible()
  })
})
