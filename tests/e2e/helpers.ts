import { expect, type Page } from '@playwright/test'

declare global {
  interface Window {
    __KURIO_READY__?: boolean
  }
}

export async function openApp(page: Page, path = '/', scenario = 'default') {
  await page.addInitScript((nextScenario) => {
    if (sessionStorage.getItem('kurio.testBooted')) return
    sessionStorage.setItem('kurio.testBooted', '1')
    localStorage.setItem('kurio.boot', JSON.stringify({ reset: true, scenario: nextScenario }))
  }, scenario)
  await page.goto(path)
  await page.waitForFunction(() => window.__KURIO_READY__ === true)
}

export async function login(page: Page, email = 'ana@kurio.test', password = 'colecao123') {
  await page.goto('/login')
  const main = page.getByRole('main')
  await main.getByLabel('E-mail', { exact: true }).fill(email)
  await main.getByLabel('Senha', { exact: true }).fill(password)
  await main.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/sort=recent/)
}

export async function confirmPurchase(page: Page) {
  await page.goto('/pagamento')
  const main = page.getByRole('main')
  await expect(main.getByLabel('E-mail', { exact: true })).toHaveValue('ana@kurio.test')
  const review = main.getByRole('button', { name: 'Revisar pedido' })
  await expect(review).toBeEnabled()
  await main.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(main.getByText('Carteira conectada.')).toBeVisible()
  await review.click()
  await main.getByRole('button', { name: 'Confirmar compra' }).click()
}

export async function emit(page: Page, event: string, payload: unknown) {
  await page.evaluate(
    async ({ event, payload }) => {
      await fetch('/api/dev/emit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event, payload }),
      })
    },
    { event, payload },
  )
}

export async function setScenario(page: Page, scenario: string) {
  await page.evaluate((next) => localStorage.setItem('kurio.scenario', next), scenario)
}
