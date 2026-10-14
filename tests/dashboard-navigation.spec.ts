import { test, expect, type Page } from "@playwright/test";
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
async function login(page: Page, id: string) {
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: base },
        data: { id },
      })
    ).status(),
  ).toBe(200);
}
test("deal-desk counters open matching records and preserve filters, paging and history", async ({
  page,
}) => {
  await login(page, "demo-role-super_admin-5");
  for (const [title, tab, status, heading] of [
    ["awaiting review", "listings", "submitted", "Asset submissions"],
    ["active deals", "offers", "accepted", "Transactions"],
    ["participants", "users", "", "Users & permissions"],
    ["new enquiries", "enquiries", "new", "Enquiries"],
  ]) {
    await page.goto("/back-office");
    const card = page.getByRole("link", {
      name: new RegExp("^View " + title + ":"),
    });
    await expect(card).toBeVisible();
    const count = Number(await card.locator("b").innerText());
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp("tab=" + tab + (status ? "&status=" + status : "")),
    );
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    const r = await page.request.get(
      `/api/platform/admin?tab=${tab}&status=${status}`,
    );
    expect(r.status()).toBe(200);
    const records = (await r.json())[tab];
    expect(records.length).toBe(Math.min(50, count));
    if (status) {
      expect(
        records.every((record: { status: string }) => record.status === status),
      ).toBe(true);
      await expect(
        page.getByLabel("Status filter", { exact: true }),
      ).toHaveValue(status);
    }
    await page.reload();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.locator(".stats .stat-link")).toHaveCount(4);
  }
  await page.goto("/back-office?tab=users");
  await expect(page.locator(".admin-content tbody tr")).toHaveCount(50);
  await page.getByRole("button", { name: "Next", exact: false }).click();
  await expect(page).toHaveURL(/tab=users&page=1/);
  await expect(page.locator(".admin-content tbody tr")).toHaveCount(17);
  await page.reload();
  await expect(page.locator(".admin-content tbody tr")).toHaveCount(17);
  await page
    .locator(".admin-sidebar")
    .getByRole("link", { name: "Asset review", exact: true })
    .click();
  await expect(page).toHaveURL(/tab=listings$/);
  await expect(page.getByLabel("Status filter", { exact: true })).toHaveValue(
    "",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/back-office");
  await expect(page.locator(".stats .stat-link")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("workspace counters open all or filtered owned records and allow opening details", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/platform/records/listings")).status()).toBe(
    401,
  );
  for (const [title, id, view, status, statsKey] of [
    ["your listings", "demo-owner-03", "listings", "", "listings"],
    ["awaiting review", "demo-owner-03", "listings", "submitted", "review"],
    ["open offers", "demo-buyer-01", "offers", "pending", "offers"],
    ["active transactions", "demo-buyer-01", "offers", "accepted", "deals"],
  ]) {
    await login(page, id);
    await page.goto("/dashboard");
    const dashboard = await (
      await page.request.get("/api/platform/dashboard")
    ).json();
    const card = page.getByRole("link", {
      name: new RegExp("^View " + title + ":"),
    });
    await expect(card).toBeVisible();
    expect(Number(await card.locator("b").innerText())).toBe(
      Number(dashboard.stats[statsKey]),
    );
    await card.click();
    await expect(page).toHaveURL(
      new RegExp("/dashboard/" + view + (status ? "\\?status=" + status : "$")),
    );
    await expect(page.getByLabel("Status filter", { exact: true })).toHaveValue(
      status,
    );
    const response = await page.request.get(
      `/api/platform/records/${view}?status=${status}`,
    );
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.total).toBe(Number(dashboard.stats[statsKey]));
    if (status)
      expect(
        data[view].every(
          (record: { status: string }) => record.status === status,
        ),
      ).toBe(true);
    if (view === "listings")
      expect(
        data.listings.every(
          (record: { owner_id: string }) => record.owner_id === id,
        ),
      ).toBe(true);
    else
      expect(
        data.offers.every(
          (record: { buyer_id: string; owner_id: string }) =>
            record.buyer_id === id || record.owner_id === id,
        ),
      ).toBe(true);
    await expect(page.locator("main tbody tr")).toHaveCount(
      Math.min(30, data.total),
    );
    if (data.total) {
      await page
        .getByRole("link", {
          name: view === "listings" ? "Open listing" : "Open deal room",
          exact: false,
        })
        .first()
        .click();
      await expect(page).toHaveURL(
        view === "listings"
          ? /\/dashboard\/listings\/[a-f0-9-]+$/
          : /\/dashboard\/deals\/[a-f0-9-]+$/,
      );
      await expect(page.locator("main h1")).toContainText("DEMO");
      await page.goBack();
      await expect(
        page.getByLabel("Status filter", { exact: true }),
      ).toHaveValue(status);
    }
    await page.reload();
    await expect(page.getByLabel("Status filter", { exact: true })).toHaveValue(
      status,
    );
  }
  await page.goto("/dashboard/listings?status=submitted");
  await expect(
    page.getByText("No records match this view.", { exact: true }),
  ).toBeVisible();
});
