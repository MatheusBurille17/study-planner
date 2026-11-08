import { test, expect } from '@playwright/test'
import { registerUser, uniqueEmail } from './fixtures/auth'

test.describe('autenticação', () => {
  test('exibe formulário de login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Bem-vinda de volta|Que bom te ver/i })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
  })

  test('registra nova conta e acessa dashboard', async ({ page }) => {
    const email = uniqueEmail('cadastro')
    await registerUser(page, email)
    await expect(page.getByRole('heading', { name: /Bom dia|Boa tarde|Boa noite/i })).toBeVisible()
  })

  test('impede acesso ao dashboard sem sessão', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('faz logout e retorna ao login', async ({ page }) => {
    const email = uniqueEmail('logout')
    await registerUser(page, email)
    await page.goto('/profile')
    await page.getByRole('button', { name: /Sair da conta/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
  })
})
