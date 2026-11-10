import { test, expect } from '@playwright/test'
import { registerUser, uniqueEmail } from './fixtures/auth'

test.describe('disciplinas', () => {
  test('não gera rolagem horizontal com títulos longos', async ({ page }) => {
    await registerUser(page, uniqueEmail('subjects'))
    await page.goto('/subjects')

    await page.getByRole('button', { name: /Nova disciplina/i }).click()
    await page.getByLabel('Nome').fill('Introdução à Metodologia Científica e Pesquisa Acadêmica Avançada')
    await page.getByLabel('Código').fill('CODIGO-MUITO-LONGO-1234567890')
    await page.getByLabel('Professor(a)').fill('Professor Doutor Alexandre de Albuquerque Nascimento')
    await page.getByRole('button', { name: /^Salvar$/ }).click()

    await expect(page.getByRole('heading', { name: /Introdução à Metodologia/ })).toBeVisible()

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
