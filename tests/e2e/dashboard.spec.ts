import { test, expect } from "@playwright/test";

/**
 * Critical operator flow against a freshly built+booted app (see playwright.config).
 * Relies on global-setup having migrated the e2e DB, seeded an admin, and
 * ingested one task via the public API.
 */
const ADMIN_EMAIL = "e2e-admin@example.com";
const ADMIN_PASSWORD = "e2e-password-123";

test("operator can log in, view, edit and delete a task", async ({ page }) => {
  // Log in
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Lands on the dashboard with the seeded task visible
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("e2e-login-task")).toBeVisible();

  // Open detail → timeline present
  await page.getByText("e2e-login-task").click();
  await page.waitForURL("**/dashboard/tasks/**");
  await expect(page.getByText("Timeline")).toBeVisible();

  // Edit the title
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Edited by e2e");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Edited by e2e" })).toBeVisible();

  // Delete it (auto-accept the confirm dialog)
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("e2e-login-task")).not.toBeVisible();
});

test("unauthenticated access redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login**");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
