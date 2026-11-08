import { test, expect } from '@playwright/test'
import { registerUser } from './fixtures/auth'

test.describe('atividades', () => {
  test('lista tarefas e cria uma nova', async ({ page }) => {
    await registerUser(page)
    await page.goto('/activities')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible()

    await page.getByRole('button', { name: /Nova atividade/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /Tarefa/i }).first().click()
    await expect(page).toHaveURL(/\/activities\/new\?type=task/)
    await page.locator('#title').fill('Tarefa E2E')
    await page.getByRole('button', { name: /Salvar tarefa/i }).click()
    await expect(page).toHaveURL(/\/activities/, { timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Tarefa E2E' }).first()).toBeVisible()
  })

  test('busca filtra tarefas', async ({ page }) => {
    await registerUser(page)
    await page.goto('/activities')
    const search = page.getByLabel('Buscar atividades')
    await search.fill('derivadas')
    await page.waitForTimeout(400)
    await expect(page.getByText('Revisar derivadas e integrais')).toBeVisible()
    await search.fill('zzzz-inexistente')
    await page.waitForTimeout(400)
    await expect(page.getByText(/Nenhuma atividade por aqui/i)).toBeVisible()
  })
})
