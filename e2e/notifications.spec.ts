import { test, expect } from '@playwright/test'
import { registerUser } from './fixtures/auth'

test.describe('notificações', () => {
  test('abre configurações de notificação e alterna preferência', async ({ page }) => {
    await registerUser(page)
    await page.goto('/settings/notifications')
    await expect(page.getByRole('heading', { name: /Notificações & lembretes/i })).toBeVisible()

    const toggle = page.getByRole('switch', { name: 'Som' })
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    await expect(page.getByRole('switch', { name: 'Som' })).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
    )
  })

  test('envia notificação de teste em modo demo', async ({ page }) => {
    await registerUser(page)
    await page.goto('/settings/notifications')
    await page.getByRole('button', { name: /Enviar notificação de teste/i }).click()
    await expect(page.getByText(/simulada|enviada/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
