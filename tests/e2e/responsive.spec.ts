import { expect, test } from "@playwright/test";
import { openApp } from "./helpers.ts";

test("tablet mostra o catálogo sem overflow horizontal", async ({ page }) => {
  await openApp(page, "/");
  await expect(
    page.getByRole("heading", { name: "SEJA DONO DO FUTURO DA ARTE DIGITAL" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Golden Frequency #071" }),
  ).toBeVisible();
  await page.goto("/nfts/nft_emerald");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
