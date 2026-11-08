import { expect, type Page } from '@playwright/test'

export function uniqueEmail(prefix = 'amanda'): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1000)}@teste.com`
}

export async function registerUser(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto('/register')
  await page.getByLabel('Como podemos te chamar?').fill('Amanda')
  await page.getByLabel('Email').fill(email)
  await page.locator('#password').fill('senha1234')
  await page.locator('#passwordConfirm').fill('senha1234')
  await page.getByRole('button', { name: /Criar conta/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  return email
}

export async function loginUser(page: Page, email: string, password = 'senha1234'): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: /Entrar/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
}
