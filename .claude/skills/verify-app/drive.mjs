// Drive the home screen and the events flow (create/edit/delete/day view/persistence) in headless Chromium and capture evidence.
// Usage: node drive.mjs <baseUrl> <outDir>   (needs `playwright` resolvable, see SKILL.md Launch)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + "/package.json" : import.meta.url);
const { chromium } = require("playwright");

const [base = "http://127.0.0.1:5173", out = ".verify"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage(); // fresh context = empty localStorage
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base);
await page.waitForSelector('[data-testid="app"][data-ready="true"]'); // ready == usable
const check = async (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) process.exitCode = 1; };

const t = (id) => page.locator(`[data-testid="${id}"]`);
await check("month title shows real month", /\.\s*\d{4}/.test(await t("month-title").innerText()));
await check("sync pill says Synced", (await t("sync-pill").innerText()).includes("Synced"));
await check("no events on a fresh install", (await t("event-card").count()) === 0 && (await t("event-dot").count()) === 0);
await check("task count 1 / 3", (await t("task-count").innerText()).trim() === "1 / 3");
await page.screenshot({ path: `${out}/home.png` });

// --- events: create ---
await t("add-button").click();
await page.screenshot({ path: `${out}/add-sheet.png` });
await t("sheet-save").click();
await check("empty title is rejected", (await t("error-title").count()) === 1 && (await t("event-sheet").count()) === 1);
await t("field-title").fill("Studio session");
await t("field-location").fill("Wynwood");
await t("field-start-time").fill("10:00");
await t("field-end-time").fill("09:00");
await t("sheet-save").click();
await check("end before start is rejected", (await t("error-end").count()) === 1);
await t("field-end-time").fill("11:30");
await t("sheet-save").click();
await check("created event card + dot", (await t("event-card").count()) === 1 && (await t("event-dot").count()) === 1);
await check("card shows time range", (await t("event-card").innerText()).includes("10:00 – 11:30"));
await page.screenshot({ path: `${out}/month.png` });

// --- day view ---
await t("open-day-view").click();
await check("day view shows a block", (await t("day-block").count()) === 1);
await page.screenshot({ path: `${out}/day.png` });
await t("day-block").click();
await check("tapping a block opens the edit sheet", (await t("field-title").inputValue()) === "Studio session");
await t("field-title").fill("Studio session 2");
await t("sheet-save").click();
await check("edit is reflected in day view", (await t("day-block").innerText()).includes("Studio session 2"));
await t("day-back").click();

// --- persistence ---
await page.reload();
await page.waitForSelector('[data-testid="app"][data-ready="true"]');
await check("event persists across reload", (await t("event-card").count()) === 1 && (await t("event-card").innerText()).includes("Studio session 2"));
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("miami.events.v1")));
await check("stored with sync fields", stored.length === 1 && stored[0].deleted === false && !!stored[0].lastModified && stored[0].allDay === false);

// --- all-day multi-day ---
await t("add-button").click();
await t("field-title").fill("Trip");
await t("field-allday").evaluate((el) => el.click());
await check("all-day hides time pickers", (await t("field-start-time").count()) === 0);
await t("sheet-save").click();
await check("two events on the day (all-day sorted first)", (await t("event-card").count()) === 2 && (await t("event-card").first().innerText()).includes("Trip"));

// --- delete with confirm ---
await t("event-card").nth(1).click();
await t("delete-event").click();
await t("delete-confirm-no").click();
await check("keeping cancels delete", (await t("event-card").count()) === 2);
await t("delete-event").click();
await t("delete-confirm-yes").click();
await check("deleted event disappears", (await t("event-card").count()) === 1);
await page.reload();
await page.waitForSelector('[data-testid="app"][data-ready="true"]');
await check("delete persists", (await t("event-card").count()) === 1);

await page.locator('[data-testid="task"]').nth(1).click();
await check("toggling a task updates count to 2 / 3", (await t("task-count").innerText()).trim() === "2 / 3");
const before = await t("month-title").innerText();
await t("next-month").click();
await check("next month changes title", (await t("month-title").innerText()) !== before);
await t("prev-month").click();
await t("tab-tasks").click();
await check("Tasks tab shows placeholder", (await t("screen-tasks").count()) === 1);
await t("tab-notes").click();
await check("Notes tab shows placeholder", (await t("screen-notes").count()) === 1);
await check("no page errors", errors.length === 0);
await browser.close();
