// Drive the home screen in headless Chromium and capture evidence.
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
await check("seeded events for today", (await t("event-card").count()) >= 2);
await check("task count 1 / 3", (await t("task-count").innerText()).trim() === "1 / 3");
await page.screenshot({ path: `${out}/home.png` });

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
