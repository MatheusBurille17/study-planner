import { test, expect } from '@playwright/test'
import { registerUser } from './fixtures/auth'

test.describe('calendário', () => {
  test('abre visão mensal e alterna para semanal/diária', async ({ page }) => {
    await registerUser(page)
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Calendário' })).toBeVisible()
    await expect(page.getByRole('grid')).toBeVisible()
    await page.waitForTimeout(500)

    await page.getByRole('tab', { name: 'Semana' }).click()
    await expect(page.getByLabel('Visão semanal')).toBeVisible()
    await page.getByRole('tab', { name: 'Dia' }).click()
    await expect(page.getByLabel('Visão diária')).toBeVisible()
  })

  test('aplica filtro de provas', async ({ page }) => {
    await registerUser(page)
    await page.goto('/calendar')
    await page.getByRole('button', { name: 'Provas' }).click()
    await expect(page).toHaveURL(/filter=tasks|filter=exams|subject=|date=/)
  })
})
