import { expect, test } from "@playwright/test";

test("shows the login page with demo credentials", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Entrar no jogo" })).toBeVisible();
  await expect(page.getByText("player", { exact: true })).toBeVisible();
  await expect(page.getByText("player123", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar com keycloak/i })).toBeVisible();
});
