# User Journey — Language & UI Audit

**Date:** 2026-06-06  
**Scope:** Full authenticated IMPACT-user journey (nav, dashboard, profile, fit-scan, proposal, billing, reports/*)  
**Method:** Source sweep (frontend `ngoinfo-grantpilot-frontend/` + backend `NGOInfo-Grantpilot/app/`) + live rendered walkthrough on `https://grantpilot.ngoinfo.org`  
**Test account:** `pranabksingh@gmail.com` (IMPACT, M&E flag on)  
**Authority:** `docs/design/ME_MODULE_REPORTS_NGO_UI.html` (plain-language status map), `docs/contracts/API_CONTRACT.md` §12, `FIT_SCAN_LANGUAGE_REFERENCE.md`  
**Constraint:** No pipeline runs or new reports created (quota near cap).

---

## Summary

| Group | Critical | High | Medium | Low | Total |
|-------|----------|------|--------|-----|-------|
| **(A) Coder-language / non-business-friendly text** | 1 | 4 | 9 | 3 | **17** |
| **(B) UI / visual defects** | 0 | 3 | 3 | 1 | **7** |
| **(C) Journey / state gaps** | 0 | 3 | 1 | 6 | **10** |
| **(D) Cohesion** | 0 | 0 | 4 | 2 | **6** |
| **Total findings** | **1** | **10** | **17** | **12** | **40** |

**Rendered walkthrough coverage:** `/profile`, `/billing`, `/reports` (+ entry, new), three existing reports (upload, facts, reading, questions, review, done deep-links). `/dashboard` auth session expired during this pass; nav triple-active confirmed by source + prior live observation. States **not observed** (by design): quota-exhausted 429 on create, DEGRADED report UI, Gate 3 review with critic flags, COMPLETE/export/download happy path.

---

## Quick-win clusters

| Cluster | Root cause | Findings bundled | Suggested single fix |
|---------|------------|------------------|----------------------|
| **1 — Report display names** | Backend lifecycle defaults + frontend renders API `template_name` / `funder_name` raw | A-01, A-02, D-01 | Backend: human-facing `display_title` (or map sentinels at persist); frontend: `resolveReportDisplayTitle()` used by `ReportCard`, `ReportsDashboardGlance`, `ReportExportSummary`, `FunderTemplatePicker` |
| **2 — Proposal status labels** | `StatusBadge` fed raw enum in dashboard + proposal detail | A-03, A-04, A-05 | Add `proposal-status-labels.ts` (mirror `report-status-labels.ts`); map `DRAFT` → “Draft”, `DEGRADED` → “Completed with gaps” |
| **3 — “M&E” → “Donor reports”** | Shared copy in `lib/plans.ts`, backend quota/upgrade messages, API contract default | A-06, A-07, A-08, D-02 | One copy pass: `plans.ts`, `MeUpgradeRequired.tsx`, `quota_service.py`, `plan_gate.py` |
| **4 — Status pill component** | `StatusBadge` is text+colour only; prototype uses coloured dot + label | B-02, D-03 | Extend `StatusBadge` or add `ReportStatusChip` with `<span class="ic">` pattern from prototype |
| **5 — Nav active state** | Hash links treated as pathname match | B-01 | `isNavItemActive`: hash items active only when `pathname === '/dashboard' && window.location.hash === '#…'` (client) or drop hash nav in favour of in-page scroll from Dashboard-only link |
| **6 — Report route guards** | Deep URLs don’t redirect; `/done` assumes COMPLETE shape | B-03, C-01, C-02, C-03 | Central guard hook: wrong gate → dispatcher redirect; `/done` redirect if not COMPLETE/DEGRADED + null-safe `generation_summary` |
| **7 — API error surfacing** | `ErrorDisplay` / inline handlers show raw `error.message` from backend | A-09, A-10, A-11 | Frontend error-code map for M&E; backend user-facing message rewrite for gate/critic/quota errors |

---

## (A) Coder-language / non-business-friendly text

| Sev | Surface + route | Exact string / text user sees | Origin | Reachable? | Suggested replacement / fix direction |
|-----|-----------------|------------------------------|--------|------------|--------------------------------------|
| **Critical** | Reports list `/reports`; dashboard glance `/dashboard` | Card title **`__lifecycle_default__`**; meta funder **`__default__`** | **Backend default:** `app/reports/services/donor_report_lifecycle_service.py:31–32` (`_DEFAULT_TEMPLATE_NAME`, `_DEFAULT_FUNDER_NAME`). **Frontend render:** `components/reports/ReportCard.tsx:58–61`, `components/dashboard/ReportsDashboardGlance.tsx:30–32` | **Yes** — live on 2/3 reports for Impact test user (seed/lifecycle residue, but same path as Path C / default-template create) | Map sentinels to “Institutional report” / “Your organisation” at API or a single frontend resolver; never persist `__`-wrapped keys as display titles |
| **High** | Dashboard proposals `#proposals` | Status pill **`DRAFT`**, **`DEGRADED`** | `components/dashboard/ProposalList.tsx:65` — `label={item.status}` | **Yes** | “Draft” / “Completed with gaps” (align proposal contract labels) |
| **High** | Proposal detail `/proposal/{id}` | Header badge **`DRAFT`** / **`DEGRADED`** | `app/(authenticated)/proposal/[id]/page.tsx:418` | **Yes** | Same proposal status map as above |
| **High** | Proposal detail section panel | Badge **`GENERATED`**, **`MANUAL_REQUIRED`**, **`FAILED`**, **`NEEDS_USER_INPUT`** | `components/proposal/SectionContent.tsx:77` — raw `section.generation_status` | **Yes** | Map to “Ready”, “Needs your input”, “Could not generate”, “Needs your answer” |
| **High** | Billing `/billing` (Growth card) | **`No M&E reports`** | `lib/plans.ts:16` → `app/(authenticated)/billing/page.tsx:135` | **Yes** (Growth plan card) | “Donor reports not included” |
| **High** | Billing upgrade surfaces; API 403 when flag on for Free/Growth | **`M&E reporting is available on the Impact plan.`** | **Backend:** `app/reports/api/dependencies/plan_gate.py:16–29`. **Frontend default:** `components/me/MeUpgradeRequired.tsx:18` | **Yes** (Free/Growth users hitting `/reports*`) | “Donor reports are included on the Impact plan.” |
| **Medium** | Report create quota error (429/403) | **`You have used all M&E reports for this billing period.`** | **Backend:** `app/services/quota_service.py:159–161` | **Yes** when quota exhausted (not triggered this audit) | “You’ve used all donor reports for this billing period.” Frontend `ReportsQuotaExhausted.tsx` copy is already plain-language |
| **Medium** | Profile `/profile` | Field label **`M&E Practices`** | `components/profile/ProfileForm.tsx:735, 1040` | **Yes** | “Monitoring & evaluation practices” or “How you track results” (NGO-familiar but spell out on first use) |
| **Medium** | Gate 3 review `/reports/{id}/review` (when reachable) | Critic severity **`Block`** / **`Warning`**; backend **`flag.reason`** shown verbatim under sections | Labels: `components/reports/report-status-labels.ts:240–242`. Render: `lib/report-section-view.ts:143`, `components/reports/gate3/Gate3SectionCard.tsx:62–66` | **Yes** when critic flags present (not observed on test data) | “Must fix before download” / “Please review”; map `reason` codes to plain explanations |
| **Medium** | Gate 2 questions (when reachable) | Section tag falls back to raw **`section_key`** (e.g. `executive_summary`) | `lib/gap-view.ts:40–43` | **Yes** if `section_label` missing in gap payload | Use template section labels only; never show snake_case keys |
| **Medium** | Upload `/reports/{id}/upload` | Document type **`grant letter`**, **`indicator data`**, **`Pending classification`** | `components/reports/ReportDocumentUpload.tsx:22–26, 117–122` — underscore split only | **Yes** after upload + classify | Enum→label map: “Grant award letter”, “Results spreadsheet”, “Photo”, etc. |
| **Medium** | Various error surfaces | Backend messages e.g. **`Knowledge bank failed Gate 1 validation`**, **`Gate 1 human confirmation is required before gap-check`**, **`All BLOCK critic flags must be accepted`**, **`Fact-safety critic must complete`** | **Backend:** `gate1_confirmation_service.py:69`, `gate_preconditions.py:16–69`, `gate3_confirmation_service.py:105–122`. **Frontend:** `ErrorDisplay.tsx:35–36` passes `error.message` through | **Yes** on failed gate/API actions | User-facing rewrite server-side + frontend `error_code` map as belt-and-braces |
| **Medium** | Reading progress `/reports/{id}/reading` (failed job) | Raw **`job.error`** string under “We could not finish reading…” | `components/reports/ReportReadingProgress.tsx:53` | **Yes** on pipeline failure | Show generic copy; log technical detail server-side only |
| **Low** | Dashboard / proposal lists | **`Untitled opportunity`** | `ProposalList.tsx:62`, `proposal/[id]/page.tsx:416` | **Yes** when opportunity title null | “Funding opportunity” or prompt to add title |
| **Low** | Profile past projects | **`Untitled`** | `components/profile/PastProjectCard.tsx:31` | **Yes** | “Unnamed project” |
| **Low** | Dev contract guards (multiple routes) | **`STOP: GET /api/…`** | e.g. `dashboard/page.tsx:169,189`, `proposal/[id]/page.tsx:176` | **No** on happy path — only if API shape drifts | Keep as dev assertions; ensure never shown in production telemetry |

---

## (B) UI / visual defects

| Sev | Surface + route | Defect | Origin | Reachable? | Fix direction |
|-----|-----------------|--------|--------|------------|---------------|
| **High** | Dashboard `/dashboard` | **Dashboard, Fit Scans, and Proposals all show active nav** (purple background) simultaneously | `components/nav/AppNav.tsx:36–39` — `isNavItemActive` returns true for `/dashboard#fit-scans` and `#proposals` whenever `pathname === '/dashboard'` (hash ignored) | **Yes** (confirmed in prior live session; source verified) | Active hash links only when hash matches, or only highlight “Dashboard” for `/dashboard` |
| **High** | Report download `/reports/{id}/done` | **Next.js error boundary:** “Application error: a client-side exception has occurred…” | `components/reports/ReportExportSummary.tsx:74` — reads `report.content_json.generation_summary.total_sections` without guard; non-COMPLETE reports lack summary | **Yes** — all three test reports deep-linked to `/done` crashed in walkthrough | Redirect non-terminal reports to dispatcher; optional-chain + friendly “Not ready to download yet” |
| **High** | Report reading `/reports/{id}/reading` | **Main content empty** (nav shell only) for reports `e41b1641…`, `2a847730…` | Likely `reading/page.tsx:101–103` indefinite **`LoadingSkeleton`** when `job === null` and dispatcher keeps user on `reading` (`lib/report-detail-routing.ts:56–63, 95`) | **Yes** — observed in Playwright walk | If no pollable job, redirect to correct gate subpath (facts/questions/upload) |
| **Medium** | Reports list + dashboard chips | **Status pills lack icon dot**; colour + text only | `components/shared/StatusBadge.tsx:25–30` vs prototype `ME_MODULE_REPORTS_NGO_UI.html:535–599` (`.status .ic`) | **Yes** | Add non-colour-only indicator (dot/check) per prototype |
| **Medium** | Upload `/reports/{id}/upload` | **Duplicate inline stepper** (hard-coded 6 steps) vs shared `ReportsJourneySteps` used elsewhere | `upload/page.tsx:49–64` vs `components/reports/ReportsJourneySteps.tsx` | **Yes** | Use single journey component |
| **Medium** | Billing quota tile | **`Donor Reports`** (capital R) vs dashboard **`Donor reports`** | `components/dashboard/QuotaOverview.tsx:121` vs `report-status-labels.ts:269` | **Yes** | Pick one casing in copy constants |
| **Low** | Reports funnel steps | Checkmark **`✓`** in stepper may render as mojibake in some captures | `ReportsJourneySteps.tsx:41` — Unicode check | **Minor** | Prefer SVG/icon component |

---

## (C) Journey / state gaps

| Sev | Surface + route | Behaviour observed | Origin / notes | Reachable? | Fix direction |
|-----|-----------------|-------------------|----------------|------------|---------------|
| **High** | Gate 2 URL `/reports/{id}/questions` | **“We could not find this report”** for reports not at Gate 2 | `questions/page.tsx:87–88` — 404 from `getGapCheck` → `ReportNotFound`; no stage-aware redirect | **Yes** — bookmark/deep-link on 3/3 test reports | 404 → redirect to dispatcher; friendly “This step isn’t ready yet” |
| **High** | Gate 3 URL `/reports/{id}/review` | Redirect to reading/upload or **empty shell** (not Gate 3 UI) | `review/page.tsx:37–39` + routing when `shouldRenderGate3` false; test reports not at Gate 3 | **Yes** via URL bar | Expected redirect, but reading/upload targets must not be blank (see B-03) |
| **High** | Download URL `/reports/{id}/done` | Hard crash (see B-02) instead of redirect | No status guard on `done/page.tsx` | **Yes** | Dispatcher should never land non-COMPLETE users on `/done` |
| **Medium** | Report hub `/reports/{id}` | Upload-stage report (`3182a86f…`) correctly → upload; facts-stage (`e41b1641…`) → facts **works** | Dispatcher `app/(authenticated)/reports/[id]/page.tsx` + `report-detail-routing.ts` | **Yes** | Keep; fix reading/deep-link edge cases |
| **Low** | Quota exhausted (429) on create | **Not observed** — quota near cap but create not attempted | `ReportsQuotaExhausted.tsx` exists; backend `quota_service.py:193–206` | Not observed | Verify on staging with exhausted quota |
| **Low** | DEGRADED report | **Not observed** — no DEGRADED donor report on account | `ReportDegradedNotice.tsx` ready | Not observable without pipeline run | Accept copy when state exists |
| **Low** | Gate 3 full review + critic UI | **Not observed** | Gate 3 implemented (`Gate3DraftReview.tsx`) | Not observable without completed synthesis | — |
| **Low** | Export / DOCX download success | **Not observed** — no COMPLETE report | `ReportExportSummary.tsx` | Not observable | — |
| **Low** | Dashboard `/dashboard` | **Not re-verified** this pass (auth token expired) | — | Assumed working from prior session | Re-run walk with fresh test-mode token |
| **Low** | Fit-scan detail | **Not deep-walked** this pass; list uses plain recommendation labels | `lib/fit-scan-labels.ts` | Likely OK | Spot-check subscores only |

---

## (D) Cohesion

| Sev | Area | Observation | Origin | Reachable? | Fix direction |
|-----|------|-------------|--------|------------|---------------|
| **Medium** | Reports as third pillar | Nav order, copy (“Your donor reports”), Path C, funnel header align with prototype when flag on | `AppNav.tsx:28–29`, `reports/page.tsx`, `PATH_C_LABEL` | **Yes** | Good baseline; fix sentinel titles (cluster 1) so cards match polish of Fit Scan/Proposal |
| **Medium** | Terminology split | Product says **“Donor reports”** in reports UX but **“M&E”** on billing/plan/API errors | See A-06–A-08 | **Yes** | Single customer term: “Donor reports” |
| **Medium** | Dashboard glance vs list | Same report shows **`__lifecycle_default__`** on both surfaces | `ReportsDashboardGlance.tsx:30` | **Yes** | Shared display-title resolver |
| **Medium** | Status chip parity | Reports use plain labels; proposals/fit-scans mixed (fit-scan OK, proposals raw) | `report-status-labels.ts` vs `ProposalList.tsx` | **Yes** | Apply label maps across all three pillars |
| **Low** | Upload step UX | Upload page omits `ReportsFunnelHeader` journey sync used on facts/questions/review | `upload/page.tsx` vs other funnel pages | **Yes** | Unify funnel chrome |
| **Low** | Unused dev component | **`Development placeholder`** in `ReportGatePlaceholder.tsx:10` | Not imported in app routes | **No** | Remove or keep internal-only |

---

## Rendered walkthrough log (2026-06-06)

| Route | Rendered outcome | Language hits |
|-------|------------------|---------------|
| `/dashboard` | Redirect to login (session expired this pass) | — |
| `/profile` | Profile form loads | `M&E Practices` |
| `/billing` | Impact plan, quota bars, plain copy | None |
| `/reports` | 3 cards, plain status chips (“Draft ready”, “Needs your review”) | `__lifecycle_default__`, `__default__` in titles/meta |
| `/reports/entry`, `/reports/new` | Path C + funnel step 3 plain copy | None |
| `/reports/3182a86f…` | Upload step (correct) | None |
| `/reports/e41b1641…/facts` | Gate 1 “Review the project facts” (good) | None |
| `/reports/e41b1641…`, `2a847730…` (hub) | Redirect to `/reading`; body empty | — |
| `/reports/*/questions` | Report not found | Misleading for wrong stage |
| `/reports/*/review` | Redirect away / empty | Gate 3 not reachable on test data |
| `/reports/*/done` | **Client exception** | Next.js generic error (not user-friendly) |

**Existing reports (API state, no new creates):**

| Report ID | Template | Status / gate | Expected step |
|-----------|----------|---------------|---------------|
| `3182a86f-81c4-4c25-bf74-1500a892f390` | FCDO Annual Review | DRAFT / none | Upload ✓ |
| `e41b1641-71e6-4ae5-8b0d-d4927b74bdef` | `__lifecycle_default__` | DRAFT / gate1 | Facts ✓; reading empty |
| `2a847730-4264-4a7d-8f84-bbfc68a081d5` | `__lifecycle_default__` | DRAFT / none | Reading empty |

---

## Source sweep notes

- **Sentinel placeholders:** Backend `_DEFAULT_TEMPLATE_NAME` / `_DEFAULT_FUNDER_NAME` are the only `__…__` strings reaching production UI today (confirmed live).
- **Raw enums:** Reports module maps status correctly via `resolveReportListStatusChip`; proposals and proposal sections do not.
- **`STOP:` strings:** Present in dashboard, billing, proposal pages as contract guards — not user-facing on current API.
- **`ReportGatePlaceholder`:** Contains “Development placeholder” but is **not mounted** in routes.
- **Backend user-visible defaults:** Upgrade and quota messages use “M&E”; gate/critic validation messages are engineer-facing but surface through `ErrorDisplay` when actions fail.

---

## Recommended fix order (await go-ahead)

1. **Cluster 1** — Report display titles (critical user trust issue on list + dashboard).  
2. **Cluster 5 + 6** — Nav active state + route guards (/done crash, reading blank, questions 404).  
3. **Cluster 2** — Proposal status/section labels.  
4. **Cluster 3** — M&E → Donor reports terminology.  
5. **Cluster 4** — Status pill icons.  
6. **Cluster 7** — API error message hygiene.

*End of audit — no code changes applied.*
