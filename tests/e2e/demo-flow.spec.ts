import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import en from "../../messages/en.json";
import kn from "../../messages/kn.json";

const FIX = (name: string) => path.join(__dirname, "fixtures", name);
const MESSAGES = { en, kn };
type Locale = keyof typeof MESSAGES;

const NUMBER_RE = /KAR-\d{4}-(RTC|MR|LND|LRF|RRT)-\d{4}/;

/** Same-origin responses under /bhoomi/ that came back 404 (missing RSC payloads, chunks, fonts). */
test.beforeEach(async ({ page }) => {
  const missing: string[] = [];
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.origin === "http://localhost:4173" && u.pathname.startsWith("/bhoomi/") && r.status() === 404) {
      missing.push(u.pathname);
    }
  });
  (page as Page & { __missing: string[] }).__missing = missing;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { __missing: string[] }).__missing, "no /bhoomi/ request may return 404").toEqual([]);
});

// ---------- helpers ----------

async function pickLocation(page: Page, names: [string, string, string, string]) {
  const ids = ["#loc-district", "#loc-taluk", "#loc-hobli", "#loc-village"];
  for (let i = 0; i < ids.length; i++) {
    await page.locator(ids[i]).click();
    await page.getByRole("option", { name: new RegExp(`^${names[i]} /`) }).click();
  }
}

/** Pass no phone to rely on the prefilled demo citizen number. */
async function verifyAndSubmit(page: Page, locale: Locale, phone?: string): Promise<string> {
  const w = MESSAGES[locale].wizard;
  if (phone) await page.locator("#otp-phone").fill(phone);
  else await expect(page.locator("#otp-phone")).toHaveValue("9876543210");
  await page.getByRole("button", { name: w.otp.send, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "123456" })).toBeVisible();
  await page.locator("#otp-code").fill("123456");
  await page.getByRole("button", { name: w.otp.verify, exact: true }).click();
  await page.getByRole("button", { name: w.review.submit, exact: true }).click();
  const number = page.getByTestId("request-number");
  await expect(number).toHaveText(NUMBER_RE);
  return (await number.textContent())!.trim();
}

/** Orders a Land Reforms file (no survey number needed) with a typed applicant name. */
async function orderLrf(page: Page, locale: Locale, applicant: string): Promise<string> {
  const w = MESSAGES[locale].wizard;
  await page.goto(`/bhoomi/${locale}/request/?service=LRF_FILE`);
  await pickLocation(page, ["Bengaluru Urban", "Yelahanka", "Jala", "Bagalur"]);
  await page.getByRole("button", { name: w.next, exact: true }).click();
  await page.getByLabel(/Form type/).selectOption("FORM_7");
  await page.getByLabel(/Applicant \/ tenant name/).fill(applicant);
  await page.getByRole("button", { name: w.next, exact: true }).click();
  await page.getByRole("button", { name: w.upload.skip, exact: true }).click();
  await page.getByRole("button", { name: w.next, exact: true }).click(); // digital is the default
  return verifyAndSubmit(page, locale, "9876543210");
}

async function signInOperator(page: Page, url: string, locale: Locale = "en") {
  await page.goto(url);
  const prefix = MESSAGES[locale].admin.signInAs.split("{name}")[0].trim();
  const signIn = page.getByRole("main").getByRole("button", { name: new RegExp("^" + prefix) });
  const actions = page.getByRole("tab", { name: "Actions" });
  const queue = page.locator("#q-search");
  await signIn.or(actions).or(queue).first().waitFor();
  if (await signIn.first().isVisible()) await signIn.first().click();
}

async function searchQueue(page: Page, text: string) {
  await page.locator("#q-search").fill(text);
}

async function applyStatus(page: Page, label: string, runner?: string) {
  await page.getByRole("tab", { name: "Actions" }).click();
  await page.getByLabel("Next status").selectOption({ label });
  if (runner) await page.getByLabel("Runner name").fill(runner);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Status updated").first()).toBeVisible();
}

// ---------- tests ----------

test("citizen orders, operator clarifies and delivers, citizen downloads the PDF", async ({ page }) => {
  // Citizen: order an Old RTC
  await page.goto("/bhoomi/en/");
  await page.getByRole("link", { name: /Old RTC \(Pahani\)/ }).click();
  await pickLocation(page, ["Bengaluru Urban", "Yelahanka", "Jala", "Bagalur"]);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel(/Survey No/).fill("45");
  await page.getByLabel(/From year/).fill("1975");
  await page.getByLabel(/To year/).fill("1982");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("#file-input").setInputFiles(FIX("deed.jpg"));
  await expect(page.getByText("deed.jpg")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /^Digital copy/ }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const number = await verifyAndSubmit(page, "en", "9876543210");

  // Operator: find it, move to Under review, ask for the father's name
  await signInOperator(page, "/bhoomi/en/admin/");
  await searchQueue(page, number);
  await page.getByRole("link", { name: number }).click();
  await expect(page).toHaveURL(/admin\/request\/\?id=/);
  const workspaceUrl = page.url();
  // Submitted: a needs-reply template cannot move the request, so it is disabled and says why.
  await page.getByRole("tab", { name: "Chat" }).click();
  await expect(page.getByRole("heading", { name: "WhatsApp thread (simulated)" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Multiple entries found for this surname/ })).toBeDisabled();
  await expect(page.getByText(/Not available at "Submitted"/).first()).toBeVisible();
  await applyStatus(page, "Under review");
  await page.getByRole("tab", { name: "Chat" }).click();
  await page.getByRole("button", { name: /Multiple entries found for this surname/ }).click();
  await expect(page.getByText("Message sent. Status changed to Action required.").first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Actions" })).toBeVisible();

  // Citizen: banner on the track page, reply
  await page.goto(`/bhoomi/en/track/?id=${number}`);
  await expect(page.getByText("We need something from you")).toBeVisible();
  await page.getByLabel("Your reply").fill("Father: Chikkanna");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("Reply sent. Your request is back under review.").first()).toBeVisible();

  // Operator: runner, searching, scans, PDF, deliver
  await signInOperator(page, workspaceUrl);
  await page.getByRole("tab", { name: "Chat" }).click();
  await expect(page.getByText("Father: Chikkanna")).toBeVisible();
  await applyStatus(page, "Assigned to runner", "Nagaraj (Yelahanka)");
  await applyStatus(page, "Archive search in progress");
  await page.getByLabel("Add scans").setInputFiles([FIX("scan1.jpg"), FIX("scan2-large.jpg")]);
  await expect(page.getByText("scan2-large.jpg")).toBeVisible();
  await page.getByRole("button", { name: "Generate watermarked PDF" }).click();
  await page.getByRole("button", { name: "Save as final" }).click();
  await expect(page.getByText("Final PDF saved")).toBeVisible();
  // Saving during the search carries the request through Document retrieved to QC, so Deliver is already offered,
  // and the status control no longer offers Record unavailable or Action required.
  await expect(page.getByLabel("Next status").locator("option")).toHaveText(["Choose a status", "Delivered"]);
  await page.getByRole("button", { name: "Deliver", exact: true }).click();
  await expect(page.getByText("Would send via WhatsApp + email (demo)")).toBeVisible();

  // Citizen: delivered, download a real multi-page A4 PDF
  await page.goto(`/bhoomi/en/track/?id=${number}`);
  await expect(page.locator('[data-status="DELIVERED"]')).toHaveText("Delivered");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download" }).first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const file = await download.path();
  const bytes = readFileSync(file);
  expect(bytes.length).toBeGreaterThan(1024);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2); // one page per scan
  for (const p of pdf.getPages()) {
    const { width, height } = p.getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  }
});

test("Kannada order: name typed in Kannada is found in the operator queue", async ({ page }) => {
  const name = "ಚಿಕ್ಕಣ್ಣ ಗೌಡ";
  const number = await orderLrf(page, "kn", name);
  expect(number).toMatch(/-LRF-/);

  await signInOperator(page, "/bhoomi/kn/admin/", "kn");
  await searchQueue(page, name);
  const row = page.getByTestId("queue-row").filter({ hasText: number });
  await expect(row).toHaveCount(1);
  await expect(page.getByTestId("queue-row")).toHaveCount(1);
});

test("advocate bulk-orders under a matter and sees the vault", async ({ page }) => {
  const matter = "Devanahalli 15-Acre Title Verification";
  await page.goto("/bhoomi/en/pro/");
  await page.getByRole("main").getByRole("button", { name: /Sign in as/ }).first().click();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: matter }) });
  const counter = card.getByText(/^\d+ requests?$/);
  await expect(counter).toBeVisible();
  const before = Number((await counter.textContent())!.match(/\d+/)![0]);

  await page.getByRole("link", { name: "New bulk order" }).click();
  await page.locator("#bulk-village").click();
  await page.locator("[cmdk-item]").first().click();
  await page.locator("#bulk-matter").selectOption({ label: matter });
  await page.getByLabel("Paste from Excel").fill("301\t1\t1980\r\n302\t2\t1981-1985\r\n303\t\t1990\r\n");
  await page.getByRole("button", { name: "Add pasted rows" }).click();
  await page.getByRole("button", { name: /^Create 3 requests$/ }).click();

  await expect(page.getByRole("heading", { name: "3 requests created" })).toBeVisible();
  const created = page.getByRole("link", { name: NUMBER_RE });
  await expect(created).toHaveCount(3);

  await page.getByRole("link", { name: "View this matter" }).click();
  await expect(page.getByRole("heading", { name: matter })).toBeVisible();
  await page.getByRole("link", { name: "All matters" }).click();
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: matter }) })
      .getByText(`${before + 3} requests`, { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Document vault" }).click();
  const downloads = page.getByRole("button", { name: /^Download / });
  await expect(downloads.first()).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), downloads.first().click()]);
  expect(dl.suggestedFilename().length).toBeGreaterThan(0);
});

test("Reset demo data restores the seeded queue and removes new requests", async ({ page }) => {
  const results = page.getByText(/^\d+ requests?$/);
  await signInOperator(page, "/bhoomi/en/admin/");
  await expect(results).toBeVisible();
  const seeded = await results.textContent();

  const number = await orderLrf(page, "en", "Reset Probe");
  await signInOperator(page, "/bhoomi/en/admin/");
  await expect(results).not.toHaveText(seeded!);
  await searchQueue(page, number);
  await expect(page.getByTestId("queue-row")).toHaveCount(1);

  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Yes, reset" }).click();
  await expect(page.getByText("Demo data restored").first()).toBeVisible();

  await signInOperator(page, "/bhoomi/en/admin/");
  await expect(results).toHaveText(seeded!);
  await searchQueue(page, number);
  await expect(page.getByText("No requests match these filters.")).toBeVisible();
});

test("root URL redirects to the English site", async ({ page }) => {
  await page.goto("/bhoomi/");
  await expect(page).toHaveURL(/\/bhoomi\/en\/$/);
});

test("switching delivery from Physical back to Digital still submits", async ({ page }) => {
  await page.goto("/bhoomi/en/request/?service=LRF_FILE");
  await pickLocation(page, ["Bengaluru Urban", "Yelahanka", "Jala", "Bagalur"]);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel(/Form type/).selectOption("FORM_7A");
  await page.getByLabel(/Applicant \/ tenant name/).fill("Toggle Probe");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();

  await page.getByRole("radio", { name: /^Printed copy/ }).check();
  await page.getByLabel(/Address line 1/).fill("12 MG R");
  await page.getByRole("radio", { name: /^Digital copy/ }).check();
  await expect(page.getByLabel(/Address line 1/)).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const number = await verifyAndSubmit(page, "en", "9876543210");
  expect(number).toMatch(NUMBER_RE);
});

test("demo script: demo citizen prefilled, role switcher out to operator and back shows the new request", async ({ page }) => {
  const w = MESSAGES.en.wizard;
  await page.goto("/bhoomi/en/request/?service=LRF_FILE");
  await pickLocation(page, ["Bengaluru Urban", "Yelahanka", "Jala", "Bagalur"]);
  await page.getByRole("button", { name: w.next, exact: true }).click();
  await page.getByLabel(/Form type/).selectOption("FORM_7");
  await page.getByLabel(/Applicant \/ tenant name/).fill("Role Switch Probe");
  await page.getByRole("button", { name: w.next, exact: true }).click();
  await page.getByRole("button", { name: w.upload.skip, exact: true }).click();
  await page.getByRole("button", { name: w.next, exact: true }).click();
  await expect(page.getByText(/sample citizen Ramesh Gowda is 9876543210/)).toBeVisible();
  const number = await verifyAndSubmit(page, "en"); // phone is prefilled; nothing typed

  const controls = page.getByRole("region", { name: "Demo controls" });
  await controls.getByRole("button", { name: "Operator", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/admin\/$/);
  await expect(page.locator("#q-search")).toBeVisible();

  await controls.getByRole("button", { name: "Citizen", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/track\/$/);
  await expect(controls.getByText("Signed in as Ramesh Gowda")).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(number) })).toBeVisible();
});

test("language toggle keeps the query string on the success page and the operator workspace", async ({ page }) => {
  const number = await orderLrf(page, "en", "Toggle Query Probe");
  const toggle = page.getByRole("banner").getByRole("button", { name: /Language/ });

  // Success page: ?id= survives the switch to Kannada and back.
  await toggle.click();
  await expect(page).toHaveURL(`http://localhost:4173/bhoomi/kn/request/success/?id=${number}`);
  await expect(page.getByTestId("request-number")).toHaveText(number);
  await page.getByRole("banner").getByRole("button", { name: /ಭಾಷೆ/ }).click();
  await expect(page).toHaveURL(`http://localhost:4173/bhoomi/en/request/success/?id=${number}`);
  await expect(page.getByTestId("request-number")).toHaveText(number);

  // Operator workspace: the request stays open after the switch.
  await signInOperator(page, "/bhoomi/en/admin/");
  await searchQueue(page, number);
  await page.getByRole("link", { name: number }).click();
  await expect(page).toHaveURL(/admin\/request\/\?id=/);
  await expect(page.getByRole("tab", { name: "Actions" })).toBeVisible();
  await toggle.click();
  await expect(page).toHaveURL(/\/bhoomi\/kn\/admin\/request\/\?id=/);
  await expect(page.getByRole("tab", { name: MESSAGES.kn.admin.ws.tabs.actions })).toBeVisible();
  await expect(page.getByText(MESSAGES.kn.admin.ws.notFoundTitle)).toHaveCount(0);
});

test("landing page shows demo controls without opening the store; role switch and Reset start it on click", async ({ page }) => {
  await page.goto("/bhoomi/en/");
  const controls = page.getByRole("region", { name: "Demo controls" });
  await expect(controls.getByRole("button", { name: "Citizen", exact: true })).toBeVisible();
  await expect(controls.getByText("Not signed in")).toBeVisible();
  // Give any (unwanted) idle-time start a chance to run, then confirm no database exists yet.
  await page.waitForTimeout(2000);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toEqual([]);

  await controls.getByRole("button", { name: "Citizen", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/track\/$/);
  await expect(controls.getByText("Signed in as Ramesh Gowda")).toBeVisible();
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toContain("hale-dakhale");

  // Reset from a fresh landing load (store not yet started in this page load).
  await page.goto("/bhoomi/en/");
  await expect(controls.getByText("Signed in as Ramesh Gowda")).toBeVisible();
  await controls.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("button", { name: "Yes, reset" }).click();
  await expect(page.getByText("Demo data restored")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(controls.getByText("Not signed in")).toBeVisible();
});

test("language toggle keeps the draft after changing service from a service card", async ({ page }) => {
  await page.goto("/bhoomi/en/request/?service=LRF_FILE");
  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await expect(page).not.toHaveURL(/service=/);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("radio", { name: /^Old RTC/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 2 of 6")).toBeVisible();

  await page.getByRole("banner").getByRole("button", { name: /Language/ }).click();
  await expect(page).toHaveURL(/\/bhoomi\/kn\/request\/$/);
  await page.getByRole("banner").getByRole("button", { name: /ಭಾಷೆ/ }).click();
  await expect(page).toHaveURL(/\/bhoomi\/en\/request\/$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Old RTC/ })).toHaveAttribute("aria-checked", "true");
});
