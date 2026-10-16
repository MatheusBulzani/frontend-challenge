import { expect, test } from '@playwright/test'
import { confirmPurchase, login, openApp } from './helpers.ts'

test('catálogo no drawer, detalhe e compra', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Filtros' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /^Música/ }).click()
  await expect(page).toHaveURL(/category=M%C3%BAsica|category=Música/)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Golden Beat #207' })).toBeVisible()

  await page.goto('/nfts/nft_emerald')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.getByRole('button', { name: 'Favoritar' }).click()
  await expect(page).toHaveURL(/\/login/)

  await login(page)
  await confirmPurchase(page)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
})

test('menu, perfil e carteiras cabem na largura', async ({ page }) => {
  await openApp(page, '/')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('link', { name: 'Criadores' })).toBeVisible()
  await dialog.getByRole('link', { name: 'Criadores' }).click()
  await expect(page.getByRole('heading', { name: 'Área indisponível' })).toBeVisible()

  await login(page)
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await page.goto('/carteiras')
  await expect(page.getByRole('heading', { name: 'Carteiras' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})
