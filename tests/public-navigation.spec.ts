import { test, expect } from "@playwright/test";
import { services } from "../lib/site-content";

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

test("public website links resolve, including all new service and resource pages", async ({
  page,
  request,
}) => {
  const pending = [
    "/",
    "/services",
    "/distribution",
    "/how-it-works",
    "/about",
    "/contact",
    "/faq",
    "/partners",
    "/guides/asset-owners",
    "/guides/buyers",
    ...services.map((service) => `/services/${service.slug}`),
  ];
  const seen = new Set<string>();
  while (pending.length) {
    const path = pending.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("main:visible h1")).toHaveCount(1);
    const links = await page
      .locator('a[href^="/"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")!),
      );
    for (const href of links) {
      if (
        /^\/(auth|dashboard|back-office|exchange|submit-asset)(\/|$|\?)/.test(
          href,
        )
      )
        continue;
      if (!seen.has(href)) pending.push(href);
    }
    const anchors = await page
      .locator('a[href^="#"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")!.slice(1)),
      );
    for (const anchor of anchors)
      expect(
        await page.evaluate((id) => !!document.getElementById(id), anchor),
        `${path}#${anchor}`,
      ).toBe(true);
  }
  expect(seen.size).toBeGreaterThanOrEqual(17);
  for (const path of ["/services/unknown", "/guides/unknown"])
    expect((await request.get(path)).status(), path).toBe(404);
});

test("homepage cards and floating quick menu navigate to specific destinations", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cards = page.locator(".service-card a");
  const targets = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(targets).toEqual([
    "/services/mining-asset-facilitation",
    "/services/minerals-exchange",
    "/services/operations-processing-export",
  ]);
  await cards.first().click();
  await expect(page).toHaveURL(/\/services\/mining-asset-facilitation$/);
  await expect(
    page.getByRole("heading", {
      name: "Mining asset facilitation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main menu" })
      .getByRole("link", { name: "Services", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  const trigger = page.getByRole("button", { name: "Quick menu" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page.locator("main:visible h1").click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const menu = page.getByRole("navigation", {
    name: "Quick menu",
    exact: true,
  });
  const destinations = await menu
    .getByRole("link")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")!),
    );
  for (const href of destinations.filter((item) => item !== "/submit-asset")) {
    if (!(await menu.isVisible())) await trigger.click();
    await menu.locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("main:visible h1")).toHaveCount(1);
    await expect(menu).toBeHidden();
  }
});

test("mobile menu links close on navigation; standalone asset funnel stays separate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: "Toggle menu" });
  const nav = page.getByRole("navigation", { name: "Main menu" });
  await toggle.click();
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(nav).toBeHidden();
  for (const [title, path] of [
    ["Services", "/services"],
    ["Products", "/distribution"],
    ["Exchange", "/exchange"],
    ["How it works", "/how-it-works"],
    ["About", "/about"],
    ["Contact", "/contact"],
    ["Home", "/"],
  ]) {
    await toggle.click();
    await nav.getByRole("link", { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(nav).toBeHidden();
  }
  await page.getByRole("button", { name: "Quick menu" }).click();
  await page
    .getByRole("navigation", { name: "Quick menu" })
    .getByRole("link", { name: "Submit your asset" })
    .click();
  await expect(page).toHaveURL(/\/submit-asset$/);
  await expect(page.locator(".asset-funnel")).toBeVisible();
  await expect(
    page.locator(
      ".site-header:visible, .site-footer:visible, .quick-menu:visible",
    ),
  ).toHaveCount(0);
});

test("product enquiries preserve their context, privacy and workspace links work", async ({
  page,
}) => {
  await page.goto("/distribution", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("link", { name: /^Enquire about rice/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Enquiry topic" }),
  ).toHaveValue("Rice");
  await expect(
    page.getByRole("textbox", { name: "How can we help?" }),
  ).toHaveValue(/rice/);
  let payload: Record<string, unknown> = {};
  await page.route("**/api/platform/enquiries", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.getByRole("textbox", { name: "Your name" }).fill("Website test");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("test@example.org");
  await page
    .getByRole("textbox", { name: "How can we help?" })
    .fill("Please discuss retail bags for delivery to Maseru.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Your enquiry is with Tafari." }),
  ).toBeVisible();
  expect(payload.message).toBe(
    "[Rice]\nPlease discuss retail bags for delivery to Maseru.",
  );
  await page.goto("/contact?topic=unrecognised", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("textbox", { name: "Enquiry topic" }),
  ).toHaveValue("General enquiry");
  await expect(
    page.getByRole("link", { name: "privacy notice", exact: true }),
  ).toHaveAttribute("href", "/privacy");
  await expect(
    page.getByRole("link", { name: "Use your workspace" }),
  ).toHaveAttribute("href", "/dashboard");
});
