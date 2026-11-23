import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-chat-composer]")).toBeVisible();
  });

  // color-contrast is excluded until the brand palette meets 4.5:1.
  test("home page has no serious or critical WCAG A/AA violations", async ({ page }) => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    const blocking = violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("composer controls have accessible names", async ({ page }) => {
    await expect(page.getByRole("textbox", { name: "Message eve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
  });

  // Intentionally broken for a demo: the app renders <html lang="en">.
  test("document declares its language", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });
});
