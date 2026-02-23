# frontend_dev.md

**Scope:** Frontend development execution plan for GrantPilot UI on `https://grantpilot.ngoinfo.org`
**Canonical authorities (do not override):**
- `FRONTEND_ARCHITECTURE_SPEC.md`
- `LAUNCH_JOURNEYS_SPEC.md`
- `BRAND_AND_FRONTEND_SPEC.md`
- `API_CONTRACT.md` (single source of truth — one file shared across backend and frontend)
- `GUARDRAILS_RUNTIME_AND_SECURITY.md`

---

## Strategic context (read before touching any code)

We are in a 48-hour launch window. The goal is a working product based on our design principles. Every step below has been scoped to that constraint.

**Core journeys that must work perfectly at launch (non-negotiable):**
- J1: WordPress → `/start` → Auth → Fit Scan result
- J2: Free user → first proposal (one-time evaluation)
- J3/J4: Paid user → proposal generation + export (DOCX)
- J7: Error recovery (no dead ends, no blame)

**Deferred to post-launch (do not build now):**
- Stripe customer portal / billing history (Stripe's own UI handles this)
- Proposal regeneration polish (basic regen button ships; full J5 UX deferred)
- Dashboard pagination and filtering
- Responsive/mobile optimisation
- Unit tests for components

---

## Non-negotiables

### Contract-first governance
- If any implementation choice conflicts with `FRONTEND_ARCHITECTURE_SPEC.md` or `LAUNCH_JOURNEYS_SPEC.md`: **STOP** and report the conflict. No improvisation.
- All API calls and error handling must conform to `API_CONTRACT.md` response shapes and status codes.
- Security posture must conform to `GUARDRAILS_RUNTIME_AND_SECURITY.md`.

### Deployment discipline
- **One step = one Cursor task = one PR/commit = one deploy.**
- No multi-step mega-PRs. Each step must be independently deployable and testable.
- Always verify on `https://grantpilot.ngoinfo.org` before marking a step done.

### Environment invariants
- `NEXT_PUBLIC_API_BASE_URL` is the only required frontend runtime env var.
- Never add backend secrets to the frontend (Stripe secret key, DB creds, OpenAI keys, OAuth client secret, JWT signing keys).
- No auth tokens in localStorage. Tokens live in React context (in-memory) only.

---

## Definition of Done (global)

A step is "done" only when it works on production (`https://grantpilot.ngoinfo.org`) with:
- Correct loading states (skeleton or spinner)
- Correct empty states (informative, not blank)
- Correct error states (non-blaming, actionable, per J7 principles)
- No console errors
- No token leakage or unsafe storage
- Matches the relevant sections of `FRONTEND_ARCHITECTURE_SPEC.md` and `LAUNCH_JOURNEYS_SPEC.md`

---

## Cursor execution format (required for every step)

Cursor must produce for each step:

1. **Plan (1 screen):** Files to touch, routes/components to add or modify, API endpoints involved
2. **Implementation:** Minimal diff — no refactors outside the step scope
3. **Verification checklist:** Manual test cases with expected results
4. **STOP condition:** Explicit statement of what would block shipping due to contract conflicts

---

## Pre-work (before Step 1 — not a deploy)

Before the first commit, Cursor must audit the current frontend state and confirm:
- Route map matches `FRONTEND_ARCHITECTURE_SPEC.md` Section 8
- `NEXT_PUBLIC_API_BASE_URL` is set and pointing to the correct Railway backend URL
- No secrets in frontend env vars
- No auth tokens in localStorage (grep for `localStorage` across the codebase)
- Auth provider exists and tokens are stored in React context

Output the audit findings as a short written report. Fix any blockers before proceeding to Step 1. This is not a commit.

---

## Step plan (locked for 48-hour launch)

Steps are grouped into phases. Complete each phase before starting the next.

---

### Phase A — Foundation (auth + shell + shared primitives)

**A-1: Auth flows end-to-end**
_Scope:_ `/login`, `/auth/callback`, `/auth/magic-link` pages + `AuthProvider` context
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Sections 3.1–3.3, 4.1
_Depends on:_ Pre-work complete, backend auth endpoints live
_Key behaviours:_
- Google OAuth button initiates `GET /api/auth/google/start` → redirect → code exchange at `/auth/callback`
- Magic link form calls `POST /api/auth/magic-link/request` → confirmation message → `/auth/magic-link?token=...` consumes token
- On success: tokens stored in AuthProvider context (React state, not localStorage)
- Token response shape (from `API_CONTRACT.md` Section 3.3): `{ access_token, refresh_token, token_type, expires_in, user: { id, email, full_name, plan } }` — store `user` in context alongside tokens for plan-aware UI rendering
- Redirect intent (`?next=` or sessionStorage) preserved through OAuth redirect and restored post-auth
- Logout clears context and redirects to `/login`

_Exit check:_ Both auth paths complete without console errors; post-login redirect works; logout works

---

**A-2: Authenticated shell + navigation**
_Scope:_ Authenticated layout (`(authenticated)/layout.tsx`), `AuthGuard`, minimal nav
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3, AuthGuard pattern
_Depends on:_ A-1
_Key behaviours:_
- All routes under `(authenticated)/` redirect unauthenticated users to `/login?next={current_path}`
- Nav items: Dashboard · Profile · Billing (links only; pages built in later steps)
- 401 response from any API call triggers silent token refresh (one attempt), then redirect to `/login` if refresh fails

_Exit check:_ Direct URL access to `/dashboard` while logged out redirects correctly; post-login lands on intended page

---

**A-3: Shared UX primitives + QuotaGate**
_Scope:_ `ErrorDisplay`, `LoadingSkeleton`, `StatusBadge`, `QuotaGate` components
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 4, Section 5 (quota messaging table)
_Depends on:_ A-2
_Key behaviours:_
- `ErrorDisplay`: standard non-blaming error UI, extracts `error_code` + `message` from API error envelope (see `API_CONTRACT.md` Section 1); never shows raw stack or technical jargon
- `LoadingSkeleton`: grey placeholder blocks matching expected page layout
- `StatusBadge`: coloured pill for statuses. Proposal statuses are: `DRAFT` (green/complete), `DEGRADED` (amber/warning). Fit Scan recommendations: `RECOMMENDED` (green), `APPLY_WITH_CAVEATS` (amber), `NOT_RECOMMENDED` (red/soft). Section statuses: `GENERATED` (green), `FAILED` (red), `MANUAL_REQUIRED` (grey).
- `QuotaGate`: wraps any gated CTA; receives entitlements via props (fetched by parent); renders children if quota available, renders plan-appropriate upgrade CTA if exhausted — messaging per `FRONTEND_ARCHITECTURE_SPEC.md` Section 5 quota tables
- **QuotaGate never calls the backend itself.** It renders based on entitlements passed to it from the page.
- 429 response from API client: display "You've hit a rate limit. Please wait a moment and try again."
- 5xx response: "We're experiencing a temporary issue. Please try again shortly."

_Exit check:_ Manually trigger each error state by mocking API responses; upgrade messaging renders for correct plan tier

---

### Phase B — Core acquisition funnel

**B-1: NGO Profile page (create + update + completeness bar)**
_Scope:_ `/profile` page + `ProfileForm`, `CompletenessBar`, `PastProjectCard`, `TagInput` components
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.6
_Depends on:_ A-3
_Key behaviours:_
- On load: `GET /api/ngo-profile` — if 404 (no profile yet), render empty form
- Save: `POST` (create) or `PUT` (update) depending on whether profile exists
- After save: re-fetch `GET /api/ngo-profile/completeness` and update completeness bar
- Completeness bar shows percentage with a simple label ("Your profile is 70% complete")
- If redirected here from `/start` with context (e.g., `?from=start&opportunity_id=...`), show contextual prompt: "Complete your profile to run your Fit Scan"
- Unsaved changes: browser warn on navigate away (standard `beforeunload`)

_Exit check:_ Create profile from scratch; update profile; completeness bar updates correctly after each save

---

**B-2: `/start` handoff + Fit Scan initiation**
_Scope:_ `/start` page (public route), fit scan initiation state machine
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.4, `LAUNCH_JOURNEYS_SPEC.md` J1
_Depends on:_ B-1
_Key behaviours:_
- Accepts `?opportunity_id={uuid}` from WordPress CTA link
- **Opportunity validation:** Call `GET /api/funding-opportunities/{opportunity_id}` (see `API_CONTRACT.md` Section 7.1) to validate the opportunity exists and is active. If 404 or `is_active=false` → friendly message + link to NGOInfo.org browse page. Use the response's `title` and `donor_organization` to display the opportunity header context throughout the flow.
- Stores `opportunity_id` in sessionStorage before auth redirect (survives OAuth)
- Post-auth: restores `opportunity_id` from sessionStorage
- Profile completeness check: `GET /api/ngo-profile/completeness` — if incomplete, redirect to `/profile?from=start&opportunity_id={id}` with contextual message
- Quota check via `GET /api/me/entitlements` — if Fit Scan quota exhausted, show QuotaGate (no scan initiated)
- If all checks pass: show "Checking your fit…" loading screen → `POST /api/fit-scans` → redirect to `/fit-scan/{id}`
- AI timeout (no result in 30s): show retry option, do not consume quota

_Exit check:_ Full J1 flow from a simulated WordPress deep link: invalid ID → error; unauthenticated → login → return to start; incomplete profile → profile redirect; quota exhausted → upgrade CTA; success → fit scan result

---

**B-3: Fit Scan result page**
_Scope:_ `/fit-scan/[id]` page + `RecommendationBanner`, `ScoreBar`, `RiskFlagList` components
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.5, `LAUNCH_JOURNEYS_SPEC.md` J1 outcomes
_Depends on:_ B-2
_Key behaviours:_
- `GET /api/fit-scans/{id}` on load; show skeleton while loading
- Display `opportunity_title` from response as page header context (e.g., "Fit Scan for: {opportunity_title}")
- Recommendation banner: green (RECOMMENDED), amber (APPLY_WITH_CAVEATS), red/soft (NOT_RECOMMENDED)
- Score bars: visual progress bars (0–100) with colour thresholds — green ≥70, amber 40–69, red <40
- Risk flags: severity icon + description from API response; HIGH = red, MEDIUM = amber, LOW = grey
- CTA logic (from `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.5):
  - RECOMMENDED or APPLY_WITH_CAVEATS → "Draft Proposal with GrantPilot AI →" → `/proposal/new?opportunity_id={id}&fit_scan_id={scan_id}`
  - NOT_RECOMMENDED → "Browse Other Opportunities →" → links to NGOInfo.org
- Free plan with fit scan consumed: show subtle upgrade CTA below primary CTA

_Exit check:_ Verify all three recommendation outcomes render correctly; score bars reflect API values; CTAs navigate correctly

---

### Phase C — Value delivery (proposals)

**C-1: Proposal generation page**
_Scope:_ `/proposal/new` page + `GenerationProgress` component
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.7, `LAUNCH_JOURNEYS_SPEC.md` J2, J3, J4
_Depends on:_ B-3
_Key behaviours:_
- URL: `/proposal/new?opportunity_id={uuid}&fit_scan_id={uuid}`
- Pre-flight: verify auth + show opportunity title (from `GET /api/funding-opportunities/{id}` or from fit scan response if cached in state) and fit scan summary card
- Free plan: show one-time evaluation notice explicitly before user can proceed: "This is your one-time evaluation proposal." + confirm button
- Quota check via entitlements: if exhausted, show QuotaGate instead of generate button
- On user confirmation: `POST /api/proposals { funding_opportunity_id, fit_scan_id }`
- Generation loading screen: rotating progress copy ("Analysing funder requirements...", "Writing executive summary...", "Drafting approach section...", "This usually takes 30–60 seconds")
- On success: redirect to `/proposal/{id}`
- On total failure: show error with retry option; quota is not consumed on failure (per J7)

_Exit check:_ Free user confirmation flow; generation loading renders; success redirects; failure shows retry without quota loss message

---

**C-2: Proposal viewer + export**
_Scope:_ `/proposal/[id]` page + `SectionNav`, `SectionContent`, `AssumptionsList`, `GenerationProgress` (reused for per-section status)
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Sections 3.8–3.9, `LAUNCH_JOURNEYS_SPEC.md` J5, J6
_Depends on:_ C-1
_Key behaviours:_
- `GET /api/proposals/{id}` on load; skeleton while loading
- Display `opportunity_title` from response as page header context
- **Section rendering from `content_json.sections[]`** (see `API_CONTRACT.md` Section 9.2 for full typed schema):
  - Section nav: sidebar or tabs showing each section's `label` with its status badge based on `generation_status`: `GENERATED` (green), `FAILED` (red), `MANUAL_REQUIRED` (grey)
  - `GENERATED` sections: render `content.text` with section heading from `label`; show `content.assumptions` in a clearly labelled "Assumptions" panel; show `content.evidence_used` if non-empty
  - `FAILED` sections: show "This section could not be generated." with retry option (triggers full regeneration — see below)
  - `MANUAL_REQUIRED` sections: show "This section requires manual input. AI generation is not available for this item." — no retry button
  - If `constraints_applied.word_limit` is present, show subtle note: "Word limit: {word_limit}" with indicator of whether it was respected
- **Regeneration (MVP — full proposal only):** Single "Regenerate Proposal" button (NOT per-section buttons). Calls `POST /api/proposals/{id}/regenerate` with body `{ "mode": "FULL" }`. This re-runs ALL `GENERATED` and `FAILED` sections; `MANUAL_REQUIRED` sections stay as-is. Show spinner; on success, reload proposal detail; on failure, show error. Display "Regenerations remaining: {3 - regeneration_count}" for Growth/Impact.
  - Free plan: "Regeneration isn't available on the Free plan" with upgrade CTA (no button shown)
  - Limit reached (`regeneration_count >= 3`): "You've used all regenerations for this proposal" (no button shown)
- **Export:** "Export Proposal" button → readiness check modal (lists any `FAILED` or `MANUAL_REQUIRED` sections as warnings, not blockers) → user confirms → `POST /api/proposals/{id}/export { "format": "DOCX" }` → trigger DOCX download via blob URL; multiple downloads of same version do not re-consume quota (per J6)
- "Evaluation Copy" watermark label for Free plan proposals (check `user.plan` from AuthProvider context)

_Exit check:_ Proposal loads with correct sections rendered by `generation_status`; FAILED section shows correctly; regeneration fires and updates content; export downloads a valid DOCX; regeneration limits enforce correctly per plan; Free plan regen blocked correctly

---

### Phase D — Home base

**D-1: Dashboard**
_Scope:_ `/dashboard` page + `QuotaOverview`, `FitScanList`, `ProposalList` components
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.11
_Depends on:_ A-3, B-1, C-2
_Key behaviours:_
- Parallel API calls on load: `GET /api/me/entitlements`, `GET /api/ngo-profile/completeness`, `GET /api/fit-scans`, `GET /api/proposals`
- Quota overview: Fit Scans used / limit + Proposals used / limit + reset date (paid) or upgrade CTA (Free near limit)
- Profile completeness snapshot: bar with percentage + "Complete your profile →" link if incomplete
- **Recent Fit Scans:** last 5 from `GET /api/fit-scans?limit=5`. Each item shows `opportunity_title` (or "Untitled opportunity" fallback if null), `overall_recommendation` as a coloured badge, and `created_at` as relative time. Each links to `/fit-scan/{id}`. Empty state: "No fit scans yet. Start by checking fit for a funding opportunity on NGOInfo.org →"
- **Recent Proposals:** last 5 from `GET /api/proposals?limit=5`. Each item shows `opportunity_title` (or "Untitled opportunity" fallback), `status` badge, `generation_summary` as "{generated}/{total_items} sections generated", and `created_at` as relative time. Each links to `/proposal/{id}`. Empty state: "No proposals yet."
- Post-login landing page (redirect here after auth if no `?next=` intent)
- **MVP note:** No pagination UI. List endpoints return the most recent items only (no offset/cursor support).

_Exit check:_ Dashboard loads all data concurrently; empty states render correctly for new users; links navigate correctly; list items display opportunity_title

---

### Phase E — Monetisation entry points

**E-1: Billing page + checkout + success/cancel**
_Scope:_ `/billing` page, `/billing/success`, `/billing/cancel` pages
_Spec authority:_ `FRONTEND_ARCHITECTURE_SPEC.md` Section 3.10
_Depends on:_ A-2
_Key behaviours:_
- `/billing`: `GET /api/me/entitlements` on load → show current plan and quota summary
  - Free plan: plan comparison (Growth $39/mo vs Impact $79/mo) + upgrade CTAs → `POST /api/billing/checkout { "plan": "GROWTH" }` or `{ "plan": "IMPACT" }` → receive `{ checkout_url }` → redirect to Stripe Checkout via `window.location.href`
  - Paid plans: show active plan details + "Manage Billing →" → `GET /api/billing/portal` → receive `{ portal_url }` → open in new tab (Stripe handles all billing history, invoice download, payment method updates, cancellation)
- `/billing/success`: confirm plan upgrade with friendly message + "Go to Dashboard →" link
- `/billing/cancel`: "No worries" message + return to Dashboard + gentle reminder of plan options

_Exit check:_ Checkout redirect fires correctly in Stripe test mode; success and cancel pages render; Stripe portal link opens

---

### Phase F — Pre-launch validation

**F-1: End-to-end smoke test (checklist, not a deploy)**
_Spec authority:_ `LAUNCH_JOURNEYS_SPEC.md` J1–J6

Run this matrix before declaring launch-ready:

| Journey | Plan | Must pass |
|---------|------|-----------|
| J1: WP deep link → Fit Scan | Free | Full flow: invalid ID, unauthenticated, incomplete profile, quota exhausted, success |
| J2: First proposal | Free | One-time notice → generate → view → export DOCX |
| J3: Ongoing workflow | Growth | Fit Scan → proposal → regen (up to limit) → export |
| J4: Consultant-grade | Impact | Same as J3 with richer profile data |
| J5: Regen limits | Growth | Regen allowed up to limit; blocked beyond; Free blocked entirely |
| J6: Export | Any paid | Export triggers download; second download of same version does not re-consume quota |
| J7: Error recovery | Any | 401 → re-auth; 5xx → retry option shown; AI timeout → retry without quota loss |

Edge states to verify across all journeys:
- New user with no profile
- Profile partially complete (below completeness threshold)
- Quota exhausted on each resource type
- Backend returns 401 / 403 / 422 / 429 / 500 (use mock or devtools)

---

## Component and file structure

Follows `FRONTEND_ARCHITECTURE_SPEC.md` Section 8 exactly. No new routes or components outside that structure without updating the spec first.

Key shared components and their ownership:

| Component | Used in steps | Source of entitlements |
|-----------|--------------|----------------------|
| `QuotaGate` | B-2, C-1, C-2, E-1 | Passed as props from parent page fetch |
| `ErrorDisplay` | All | Receives parsed API error object |
| `LoadingSkeleton` | All | No data dependency |
| `StatusBadge` | B-3, C-2, D-1 | Enum value from API response |
| `AuthGuard` | A-2 | React context |

---

## API client contract

The API client (`lib/api-client.ts`) must:
- Attach `Authorization: Bearer {access_token}` from AuthProvider context on every authenticated request
- On 401: attempt one silent token refresh via `POST /api/auth/refresh`; if refresh fails, redirect to `/login?next={current_path}`
- On 429: surface to UI as rate limit message (do not retry automatically)
- On 5xx: surface to UI as temporary error message
- Parse error responses using `error_code` + `message` fields from API error envelope per `API_CONTRACT.md` Section 1
- Never log tokens to console
- For binary responses (DOCX export): handle `Content-Type: application/vnd.openxmlformats...` by creating a blob URL and triggering download, NOT by parsing as JSON

---

## Key API response shapes (quick reference for Cursor)

These are summaries — `API_CONTRACT.md` is the full authority.

**Proposal statuses:** `DRAFT` (generation complete, usable), `DEGRADED` (generated with missing inputs, placeholders used). There is no `GENERATING` status — generation is synchronous.

**Section generation_status values:** `GENERATED`, `FAILED`, `MANUAL_REQUIRED`.

**Fit Scan recommendations:** `RECOMMENDED`, `APPLY_WITH_CAVEATS`, `NOT_RECOMMENDED`.

**Fit Scan model ratings:** `STRONG`, `MODERATE`, `WEAK`.

**Plan values:** `FREE`, `GROWTH`, `IMPACT`.

---

## Guardrails (what NOT to do)

- Do not implement entitlement or quota logic in the frontend — the backend is the source of truth. QuotaGate only renders UI; it does not compute quotas.
- Do not store auth tokens in localStorage or sessionStorage. Tokens live in React context only. (`sessionStorage` is permitted only for redirect intent — `opportunity_id` + `?next=` URL — which is non-sensitive and cleared after use.)
- Do not introduce new routes or flows not listed in `FRONTEND_ARCHITECTURE_SPEC.md` without updating the spec first.
- Do not weaken security requirements from `GUARDRAILS_RUNTIME_AND_SECURITY.md`.
- Do not add any Stripe secret keys, OpenAI keys, or DB credentials to frontend env vars.
- Do not build the Stripe customer portal UI — link to `GET /api/billing/portal` which redirects to Stripe's hosted portal.
- Do not build mobile-responsive layouts for MVP — desktop-first is acceptable at launch.
- Do not implement per-section regeneration — MVP is `{ "mode": "FULL" }` only. Do not send `{ "section": "..." }` to the regenerate endpoint.
- Do not build pagination UI for dashboard lists — MVP returns last 5 items via `?limit=5`, no offset/cursor.

---

## Scope decisions (final call)

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Stripe billing history / invoice UI | Deferred — link to Stripe portal | Not our UI to build; Stripe hosts it |
| Proposal regeneration full UX polish | Basic "Regenerate Proposal" button ships (full-proposal only); per-section regen deferred | Regen is secondary to generation at launch |
| Dashboard pagination | Deferred — last 5 items only | Simplest implementation; sufficient for launch |
| Mobile responsive design | Deferred | Users in 48hr window are likely desktop NGO staff |
| Frontend unit tests | Deferred | Smoke tests against production are the launch gate |
| WCAG accessibility audit | Deferred | Baseline accessibility only for MVP |
| Profile upload (prior proposals/docs) | Deferred (explicitly post-MVP) | Per `LAUNCH_JOURNEYS_SPEC.md` J4 post-MVP note |
| Per-section regeneration | Deferred — FULL regen only for MVP | Backend only supports `{ "mode": "FULL" }` |
| Funding amount display on opportunity | Deferred | Not in MVP opportunity endpoint response |

---
