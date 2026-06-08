import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "https://grantpilot.ngoinfo.org";
const refreshToken = readFileSync(`${process.env.TEMP}/gp_me_rt.txt`, "utf8").trim();

const ROUTES = [
  "/dashboard",
  "/profile",
  "/billing",
  "/reports",
  "/reports/entry",
  "/reports/new",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript((rt) => {
    if (!window.localStorage.getItem("gp_refresh_token")) {
      window.localStorage.setItem("gp_refresh_token", rt);
    }
  }, refreshToken);
  const page = await context.newPage();

  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector("nav", { timeout: 60000 });

  const reportLinks = await page.locator('a[href^="/reports/"]').all();
  const reportHrefs = new Set();
  for (const link of reportLinks) {
    const href = await link.getAttribute("href");
    if (href && /^\/reports\/[0-9a-f-]{36}/.test(href)) reportHrefs.add(href.split("?")[0]);
  }

  const allRoutes = [...ROUTES, ...reportHrefs, ...[...reportHrefs].map((h) => `${h}/facts`), ...[...reportHrefs].map((h) => `${h}/questions`), ...[...reportHrefs].map((h) => `${h}/review`), ...[...reportHrefs].map((h) => `${h}/reading`), ...[...reportHrefs].map((h) => `${h}/done`)];

  const findings = [];
  for (const route of allRoutes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(800);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const navLinks = await page.locator("nav a").all();
    const activeNav = [];
    for (const a of navLinks) {
      const cls = await a.getAttribute("class");
      const label = (await a.innerText()).trim();
      if (cls?.includes("bg-brand-primary")) activeNav.push(label);
    }
    const patterns = [
      /__\w+__/g,
      /\b(DRAFT|DEGRADED|EXTRACTING|AWAITING_REVIEW|GENERATING|COMPLETE)\b/g,
      /\b(gate1|gate2|gate3|none)\b/gi,
      /\b(BLOCK|WARN|UPGRADE_REQUIRED|QUOTA_EXCEEDED|PROFILE_INCOMPLETE)\b/g,
      /\b(MANUAL_REQUIRED|NEEDS_USER_INPUT|GENERATED|FAILED)\b/g,
      /M&E/g,
      /knowledge bank/i,
      /Untitled/g,
      /STOP:/g,
    ];
    const hits = [];
    for (const p of patterns) {
      const m = body.match(p);
      if (m) hits.push(...m);
    }
    findings.push({ route, url, activeNav, hits: [...new Set(hits)], snippet: body.replace(/\s+/g, " ").slice(0, 200) });
  }

  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
}

main();
