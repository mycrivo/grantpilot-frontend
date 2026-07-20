# Package 1 — Frontend PR #3 Delta Re-Audit (fix round → merge readiness)

- **Date:** 2026-07-19
- **Auditor:** independent read-only session (same auditor as the Layer-2 audit on record at `docs/audits/PACKAGE1_FRONTEND_PR3_INDEPENDENT_AUDIT_2026-07-19.md`)
- **Repository:** local frontend repo (`mycrivo/grantpilot-frontend` checkout; the sole real repo in this workspace)
- **Scope:** PR #3 branch `feat/gate1-conflict-integrity-ux`, commits after `4b6b685` through head — exactly one fix commit ("fix(me): Package 1 frontend Gate 1 conflict audit fix round"; 15 files, +716/−77)
- **HEAD SHA THIS VERDICT APPLIES TO:** `525fde514c3395b2dddd3d21a8cd5988d7b2cd0a` (= `refs/pull/3/head`, re-confirmed against origin at audit time)
- **Base:** unchanged, `main` @ `f485d56097e4eb75d9bf7b75ab32a60fa8461ace`
- **Prior verdict:** APPROVE WITH FIXES (B1, B2 blocking)
- **Audit conduct:** read-only; no code modified (the single scratch mutation for the B2 witness was reverted with `git checkout --` and the tree verified clean); nothing committed; this report is the only file written.

## VERDICT: APPROVE — head `525fde514c3395b2dddd3d21a8cd5988d7b2cd0a` is merge-ready

Both blocking findings are closed with witnessed evidence; all remediation items verify; suite, lint, and production build are green at head; no new packages; nothing weakened. Non-blocking observations are recorded in §8 — none gates the merge.

---

## 1. B1 closed — both panels routed through the shared helper; no empty/whitespace sends

**Server card (`components/reports/gate1/Gate1ConflictPanel.tsx`), every path:**
- Candidate click → `handleSelect` (`:41-50`) routes `option.value` through `routeConflictCandidateSelection`; `kind === "explicit_entry"` (null/undefined/whitespace) opens explicit entry and returns — the save call is never issued; only `kind === "save"` reaches `onResolve(conflict.factKey, route.value)` with a value that is non-empty by the helper's law.
- Explicit entry → `handleCustomSave` (`:53-68`) early-returns on `!customValue.trim()` and saves the trimmed draft only; the save button independently requires a non-blank draft.
- Keyboard: no `<form>` exists anywhere under `components/reports/gate1/` or the reports pages — no implicit submission path.
- In-flight: candidates, entry opener, input, and save all carry `disabled={saving}`; the continue button is disabled by `confirming || saving || disabled` in `Gate1StickyFooter`.

**Degraded client card (`components/reports/gate1/Gate1ClientConflictPanel.tsx`), every path:**
- Candidate click → `handleSelect` (`:37-47`) routes through `routeClientConflictCandidateSelection`; ambiguous → explicit entry with source context, never a save; concrete → `onResolve(allKeys, route.resolvedValue)` where `resolvedValue = String(value)` of a non-ambiguous value — the former `String(value ?? "")` empty-send is gone. The **group** PATCH writes the same non-empty value to every fact key in the group; no per-key path can diverge to empty.
- Explicit entry → `handleCustomSave` (`:50-67`) trims and early-returns on blank; the trimmed draft goes to all group keys.
- Ambiguous candidates render the fixed label (`:92-94`) instead of "—", and can never display as selected.
- In-flight discipline now matches the server card: candidates `:102`, entry opener `:120`, input `:139` (newly disabled), save `saving || !customValue.trim()`.

Directly witnessed by test: `lib/gate1-conflict-ux.test.ts:157-175` ("degraded client card never emits empty or whitespace resolved values"), which goes red under the §2 mutation.

Residual outside the ruled class — see O1 (§8): `String([])` yields `""` if a backend fact value is a literal empty array.

## 2. B2 closed — routing in a plain `lib/` function, both panels consume it, mutation witness reproduced

- The decision lives in `lib/gate1-conflict-routing.ts`: `routeConflictCandidateSelection` (`:15-20`) and the degraded-card wrapper `routeClientConflictCandidateSelection` (`:22-30`), both delegating to `isAmbiguousConflictValue`. Both panels import and consume it (`Gate1ConflictPanel.tsx:6-10`, `Gate1ClientConflictPanel.tsx:6-12`); direct tests exercise it at `lib/gate1-conflict-ux.test.ts:146-175`.
- **Mutation witness, performed by this auditor in a scratch state at `525fde5`** — removed the two-line ambiguous guard from `routeConflictCandidateSelection`, ran the full suite:

```
 FAIL  lib/gate1-conflict-ux.test.ts > conflict candidate routing (B1/B2) — both panels
       > routes concrete candidates to save and ambiguous to explicit entry
AssertionError: expected { kind: 'save', value: null } to deeply equal { kind: 'explicit_entry' }

 FAIL  lib/gate1-conflict-ux.test.ts > conflict candidate routing (B1/B2) — both panels
       > degraded client card never emits empty or whitespace resolved values
AssertionError: expected { kind: 'save', resolvedValue: 'null' } to deeply equal { kind: 'explicit_entry' }

 Test Files  1 failed | 6 passed (7)
      Tests  2 failed | 45 passed (47)
```

- Restored via `git checkout -- lib/gate1-conflict-routing.ts`; `git status` clean; re-run: **7 files passed, 47/47 tests passed.**
- Defense-in-depth also witnessed: naively deleting the component-level guard block leaves vitest green but fails the type-check (`TS2339: Property 'value' does not exist on type 'ConflictCandidateRoute'`), which `next build` enforces. A *deliberate* rewrite that bypasses the helper (`option.value` direct) is invisible to suite and type-check — inherent to the approved plan's own lib-level test design ("pure candidate-action routing… without new dependencies"); recorded as O2.

## 3. R3 copy — verified on every surface

- **5xx split:** `ME_5XX_SAVE_MESSAGE` / `ME_5XX_LOAD_MESSAGE` with a `surface` parameter defaulting to `"load"` (`lib/me-error-messages.ts:11-15, 93-96, 124-126`). All six resolver call sites: facts save path (`resolveGate1SaveErrorMessage` → save, `:132-136`); facts cluster-review `"save"` (`facts/page.tsx:236-240`); facts confirm `"save"` (`:270-274`); Gate 2 continue `"save"` (`questions/page.tsx:213-217`); Gate 3 approve `"save"` (`review/page.tsx:118-122`); `ErrorDisplay` `"load"` (`ErrorDisplay.tsx:34`). Asserted by test (`gate1-conflict-ux.test.ts:216-220`).
- **`GATE_NOT_SATISFIED`:** now gate-agnostic — "This step isn't available right now. Refresh the page to see the latest version." (`me-error-messages.ts:26-28`) — reads correctly on the Gate 2 continue and Gate 3 approve surfaces, not just facts; test asserts it contains no "project facts" referent (`:221-222`).
- **Explanation branches:** `composeConflictExplanation` (`lib/knowledge-bank-view.ts:88-100`) handles zero-, single-, multi-, and all-ambiguous shapes with distinct accurate sentences; the multi and all-ambiguous shapes are asserted (`gate1-conflict-ux.test.ts:96-143`).
- **Ambiguous label single source of truth:** the inline literal is gone; both the normalizer (`knowledge-bank-view.ts:125-128`) and the client card (`Gate1ClientConflictPanel.tsx:92-94`) reference `GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL`. Repo-wide grep finds no remaining duplicate literal outside `report-status-labels.ts`.

## 4. R4 scan — full original list covered (cross-check)

Original audit's enumerated gaps → expanded scan (`gate1-conflict-ux.test.ts:225-303`):

| Original-list item | In scan? |
|---|---|
| `CONFLICT_ENTER_OTHER_PROMPT` ("Enter the exact value") | ✓ |
| Final-401 copy | ✓ (`ME_401_MESSAGE`, now an exported constant) |
| 5xx copy | ✓ both `ME_5XX_SAVE_MESSAGE` and `ME_5XX_LOAD_MESSAGE` |
| Non-ambiguous explanation branch | ✓ (zero-ambiguous compose sample; also exercises the multi-source join) |
| `"your documents"` / `"this item"` fallbacks | ✓ (empty-source compose sample) |
| Entry-context templates (excerpt / hint / helper) | ✓ all three `composeExplicitEntryContext` variants |
| Full error map (incl. all changed entries) | ✓ via `Object.values(GATE1_SAVE_ERROR_MESSAGE)` |

`INTERNAL_ID_PATTERN` was widened with `GATE2_|GATE3_`. One new delta string is outside the scan — see O3.

## 5. R5 — failed explicit-entry save: draft preserved, error shown, controls re-enabled

- Pure helper `nextExplicitEntryStateAfterSaveAttempt` (`gate1-conflict-routing.ts:44-58`): failure keeps the entry open with the draft intact and context uncleared; success closes and clears. Tested directly (`gate1-conflict-ux.test.ts:177-195`).
- Wiring verified end-to-end: `handleResolveConflict` and `handleResolveClientConflict` set the error banner then **rethrow** (`facts/page.tsx:146, 194`), so both panels' `handleCustomSave` catch blocks actually run and apply the failure state. The error is shown (`saveError` set before the rethrow, rendered by the dismissible alert in `Gate1ReviewFacts`), and controls re-enable because `setSaving(false)` runs in `finally`, lifting every `disabled={saving}`.
- Side-effect improvement on record: a failed client-card save no longer locally marks the conflict resolved (`Gate1ReviewFacts.handleClientConflictResolve` records the resolved ID only after a non-throwing save) — a latent coherence bug at `4b6b685`, closed by the rethrow.
- Residual on the **candidate-click** failure path — see O4.

## 6. R6 + copy of record — documents committed; §12.14 codes present; word-for-word comparison performed

- Committed at `525fde5`: `docs/artefacts/package1/PACKAGE1_GATE1_CONFLICT_INTEGRITY_PLAN.md` (approved plan, copy-of-record) and `docs/artefacts/package1/PACKAGE1_APPROVAL_WITH_AMENDMENTS_2026-07-19.md` (approval, amendments, fix-round dispositions). Also on record: the fix-round completion note and a byte-identical copy of the Layer-2 audit (verified by git blob hash `2020d57`).
- `docs/contracts/API_CONTRACT.md` §12.14 carries all three codes with HTTP status and description: `KB_PATCH_VALIDATION_FAILED` (422), `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED` (422), `USE_GATE1_CONFIRM_ENDPOINT` (422).

**Word-for-word shipped copy at `525fde5` vs the approved plan's copy list** (the comparison the original audit could not perform; every divergence reported):

| Approved plan copy | Shipped | Result |
|---|---|---|
| `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED` — "Enter a clear value before saving this item." | identical | MATCH |
| `KB_PATCH_VALIDATION_FAILED` — "We couldn't save this item because the project facts are out of sync. Refresh the page and try again. If it still won't save, contact support." | identical | MATCH |
| `USE_GATE1_CONFIRM_ENDPOINT` — "Review your facts, then use 'Continue to missing questions' to move on." | identical; the quoted label matches the real continue button (`GATE1_LABEL.CONTINUE_TO_QUESTIONS`) | MATCH |
| `GATE_NOT_SATISFIED` — "These project facts can't be edited right now. Refresh the page to see the latest version." | "This step isn't available right now. Refresh the page to see the latest version." | **DIVERGENCE — owner-approved:** the committed approval document explicitly supersedes the plan draft with this exact gate-agnostic string (R3 rationale quoted therein) |
| `GATE1_VALIDATION_FAILED` — "Resolve every item that needs your decision and review each section before continuing." | identical | MATCH |
| `VALIDATION_ERROR` — "Some information wasn't valid. Check the value and try again." | identical | MATCH |
| `REPORT_NOT_FOUND` / `DONOR_REPORT_NOT_FOUND` — "We couldn't find this report. Return to your reports and open it again." | identical | MATCH |
| `UPGRADE_REQUIRED`, `RATE_LIMITED` — "retain approved existing copy" | unchanged from approved base copy | MATCH |
| Final 401 — "Your session has expired. Sign in again to continue." | identical (`ME_401_MESSAGE`) | MATCH |
| Known 5xx — "We're having trouble saving right now. Please try again shortly." | identical as the save-surface variant | MATCH |
| Unknown fallback — "Something went wrong — please try again." | identical | MATCH |
| Card heading — "The documents show different information" | identical | MATCH |
| Prompt — "Choose the value this report should use." | identical | MATCH |
| Ambiguous candidate — "This source does not give a clear value" | identical | MATCH |
| Explicit-entry title — "Enter the correct value" | identical | MATCH |
| Helper — "Review the source and enter the exact value the report should use." | identical | MATCH |
| Save state "Saving…"; disable all candidate, entry, and Continue controls while saving | identical / verified on both cards and the footer | MATCH |

Notes: the plan document renders typographic apostrophes/quotes where code ships ASCII equivalents — identical words, glyph-level difference only. `ME_5XX_LOAD_MESSAGE` is a new string implied by the approval's "copy split" disposition but not quoted in any copy-of-record document (O5). Shipped strings the plan does not enumerate (entry-context templates, explanation sentences, `CONFLICT_ENTER_OTHER_PROMPT`, ambiguous hint) comply with the plan's composition rules (Amendment 3; no internal identifiers) and are in the automated scan.

## 7. Integrity — packages, tests, and green runs at `525fde5`

- **No new packages:** `package.json`, `package-lock.json`, `vitest.config.ts`, `eslint.config.mjs` untouched across `4b6b685..525fde5` (verified by name filter on the delta).
- **No test deleted, skipped, or weakened:** the only test file changed is `lib/gate1-conflict-ux.test.ts`; the other six are byte-untouched. The delta is additive-or-stronger: all six original tests survive; the one edited assertion pins the single-ambiguous branch more specifically (`/One source mentions/i` replaces a regex that also matched the new multi-ambiguous branch); the identifier pattern was widened; five tests added (explanation shapes, helper routing, degraded-card empty-value, draft preservation, 5xx split/gate-agnostic copy). No `.skip`/`.only`/`.todo`.
- **Runs at head (executed by this auditor):**

| Step | Result |
|---|---|
| `vitest run` | **7 files passed, 47/47 tests passed** |
| `eslint` | **0 errors**, 1 warning — the pre-existing `react-hooks/exhaustive-deps` at `facts/page.tsx:101`, present on base `f485d56` |
| `next build` | **✓ Compiled successfully**; type-check clean; only output warning is the same pre-existing lint warning |

## 8. Non-blocking observations (recorded; none gates the merge)

- **O1** — `lib/gate1-conflict-routing.ts:29`: `String(route.value)` yields `""` for a candidate whose backend value is a literal empty array (`[]` is not classified ambiguous). Requires the degraded lane plus an unevidenced backend payload shape; outside the null/blank class D-059 rules on.
- **O2** — a deliberate component-level rewrite bypassing the routing helper would be invisible to suite and type-check; inherent to the approved plan's lib-level test design. Accidental removal is caught (suite red at helper level; `TS2339` at component level).
- **O3** — the multi-but-not-all-ambiguous explanation string (`knowledge-bank-view.ts:99`) is asserted (`test:142`) but absent from the identifier-scan list; manually swept in this audit — clean.
- **O4** — candidate-click save failures surface as unhandled promise rejections in both panels (`handleSelect` awaits the now-rethrowing resolver with no catch: `Gate1ConflictPanel.tsx:41-50`, `Gate1ClientConflictPanel.tsx:37-47`). UI state remains correct (banner shown, controls re-enabled); the cost is console noise/monitoring alarms.
- **O5** — `ME_5XX_LOAD_MESSAGE` ("We're having trouble loading this right now. Please try again shortly.") is not quoted in the committed copy-of-record; swept clean; owner may wish to add it to the plan's copy list.

Owner dispositions already on record in the approval document: N4 (ordinary fact rows can save empty — queued to Package 2 facts-screen redesign), N9 (theoretical `UNSUPPORTED_DOCUMENT_FORMAT` raw-message door — accepted).

## Disposition

**APPROVE.** Head `525fde514c3395b2dddd3d21a8cd5988d7b2cd0a` is merge-ready. Merge sequence per the Layer-2 report: backend PR #10 (per its own delta re-audit), then this PR at this SHA, then Railway SHA verification, then Phase A. This file is left uncommitted for the builder to commit with the merge evidence; the auditor committed nothing.
