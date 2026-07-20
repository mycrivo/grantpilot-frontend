# Package 1 — Frontend PR #3 Delta Re-Audit (fix round, pre-merge)

- **Date:** 2026-07-19
- **Auditor:** independent read-only session (same auditor as `PACKAGE1_FRONTEND_PR3_INDEPENDENT_AUDIT_2026-07-19.md`)
- **Scope:** commits after `4b6b685` through head — exactly one fix commit, `525fde5` "fix(me): Package 1 frontend Gate 1 conflict audit fix round", 15 files, +716/−77
- **Audited head SHA (merge decision applies to this SHA only):** `525fde514c3395b2dddd3d21a8cd5988d7b2cd0a` (= `refs/pull/3/head`)
- **Base:** unchanged, `main` @ `f485d56`

## VERDICT: APPROVE

Every item of the fix round is verified closed at `525fde5`: B1's degraded card now routes ambiguous/null/whitespace through the shared helper and no traced path sends an empty value in the class the package rules on; the B2 mutation witness reproduces exactly (guard removed → suite red, restored → green); R3 copy is correct on every surface including Gates 2/3; R4's scan covers the original audit's full string list; R5 preserves the typed draft on failed save; R6's plan/approval/audit documents are committed and §12.14 carries the three KB codes; the word-for-word shipped-vs-plan comparison is now done, with one owner-approved divergence. No new packages; nothing weakened. Five NON-BLOCKING observations are recorded below; none gates the merge.

---

## B1 — CLOSED (degraded card obeys the empty-value law)

- `Gate1ClientConflictPanel.handleSelect` (`:37-47`) now routes every candidate through `routeClientConflictCandidateSelection` (`lib/gate1-conflict-routing.ts:22-30`): ambiguous (null/undefined/whitespace — `isAmbiguousConflictValue`) → explicit entry, never a save; concrete → `String(route.value)`. The former `String(value ?? "")` is gone. Ambiguous candidates now display the fixed label instead of "—" (`:92-94`), never render as selected, and explicit entry shows source context.
- Explicit entry on the client card trims and early-returns on blank (`:50-55`); the entry input is now `disabled={saving}` (`:139`), candidates `:102`, entry opener `:120`, save button by `saving || !customValue.trim()` — matching the server card's in-flight discipline. Still no `<form>` anywhere in the tree, so keyboard submission cannot bypass the guards.
- Witnessed by test: "degraded client card never emits empty or whitespace resolved values" (`lib/gate1-conflict-ux.test.ts:160-175`) — and this test goes red under the guard mutation (below).
- Residual (observation O1, non-blocking): `String(route.value)` at `lib/gate1-conflict-routing.ts:29` yields `""` for a candidate whose backend value is an empty array (`String([]) === ""`, and `[]` is not classified ambiguous). Reaching it requires the degraded lane plus a backend-emitted literal-`[]` fact value — outside the null/blank class D-059 rules on, with no evidenced payload shape. Same status as the previously accepted composite-value edges.

## B2 — CLOSED (mutation witness reproduced)

Reproduced at `525fde5` exactly as specified:

1. Removed the ambiguous guard from `routeConflictCandidateSelection` (`lib/gate1-conflict-routing.ts:16-18`) → **suite RED: 2 failed / 45 passed** — "routes concrete candidates to save and ambiguous to explicit entry" and "degraded client card never emits empty or whitespace resolved values", matching the builder's fix-round note (2 failed / 9 passed when scoped to the file).
2. Restored → **47/47 green**, working tree clean.

Component-level defense-in-depth, witnessed for the record:

- **Naive removal** of the guard block in `Gate1ConflictPanel.handleSelect` (`:42-45`): vitest stays green (types are stripped), but `tsc` fails hard — `TS2339: Property 'value' does not exist on type 'ConflictCandidateRoute'` — and `next build` runs that type-check, so the accidental-regression path is caught by the build gate.
- **Deliberate bypass** (rewrite the handler to call `onResolve(conflict.factKey, option.value)` without routing): invisible to suite and type-check (both witnessed green). This residual is inherent to the approved plan's own verification design — the plan specifies "pure candidate-action routing" coverage at lib level "without new dependencies" (`docs/artefacts/package1/PACKAGE1_GATE1_CONFLICT_INTEGRITY_PLAN.md`, tests section), which is exactly what shipped, and it matches the remediation path my Layer-2 report proposed. Recorded as observation O2, non-blocking.

## R3 — VERIFIED (copy correct on every surface, including Gates 2/3)

- 5xx copy split by surface: `ME_5XX_SAVE_MESSAGE` / `ME_5XX_LOAD_MESSAGE`, `surface` parameter defaulting to `"load"` (`lib/me-error-messages.ts:11-15,93-96,124-126`). All six resolver call sites audited: facts save path via `resolveGate1SaveErrorMessage` → save (`:132-136`); facts cluster-review and confirm → `"save"` (`facts/page.tsx:236-240, 270-274`); Gate 2 continue → `"save"` (`questions/page.tsx:213-217`); Gate 3 approve → `"save"` (`review/page.tsx:118-122`); `ErrorDisplay` (load failures) → `"load"` (`ErrorDisplay.tsx:34`). A 500 during load now says "trouble loading", during save "trouble saving" — verified by the new test (`gate1-conflict-ux.test.ts:216-223`).
- `GATE_NOT_SATISFIED` is gate-agnostic: "This step isn't available right now. Refresh the page to see the latest version." (`me-error-messages.ts:26-28`), accurate on Gates 1, 2, and 3 surfaces; asserted gate-agnostic by test (`:221-222`).

## R4 — VERIFIED (scan covers the original audit's full string list)

Cross-list of every gap named in the Layer-2 report's N3 against the expanded scan (`gate1-conflict-ux.test.ts:225-303`): `CONFLICT_ENTER_OTHER_PROMPT` ✓ now swept; 401 copy ✓ (now the exported `ME_401_MESSAGE`); both 5xx strings ✓; non-ambiguous explanation branch ✓ (zero-ambiguous compose sample, which also exercises the multi-source join); "your documents"/"this item" fallbacks ✓ (empty-source compose sample); all three explicit-entry context templates ✓ (`composeExplicitEntryContext` variants). The full error map remains swept via `Object.values`, and `INTERNAL_ID_PATTERN` was extended with `GATE2_|GATE3_` — stronger, not weaker. Observation O3 (non-blocking): the new multi-but-not-all-ambiguous explanation string (`knowledge-bank-view.ts:99`) is produced and asserted (`test:142`) but is not in the identifier-scan list; I swept it manually — clean.

## R5 — VERIFIED (typed input preserved on failed save)

- Pure state helper `nextExplicitEntryStateAfterSaveAttempt` (`gate1-conflict-routing.ts:44-58`): on failure keeps the entry open with the draft intact; on success closes and clears. Tested directly (`gate1-conflict-ux.test.ts:177-195`).
- The wiring that makes the catch reachable is in place: `handleResolveConflict` and `handleResolveClientConflict` now rethrow after setting the error banner (`facts/page.tsx:146,194`), and both panels' `handleCustomSave` catch and apply the failure state (`Gate1ConflictPanel.tsx:53-68`, `Gate1ClientConflictPanel.tsx:50-67`). Side-effect improvement worth recording: a failed client-card save no longer locally marks the conflict resolved (`Gate1ReviewFacts.handleClientConflictResolve` only records the ID after a non-throwing save) — a latent coherence bug at `4b6b685` that my Layer-2 report did not flag; the rethrow closes it.
- Observation O4 (non-blocking): the rethrow makes **candidate-click** save failures produce unhandled promise rejections — `handleSelect` in both panels awaits `onResolve` with no catch (`Gate1ConflictPanel.tsx:41-50`, `Gate1ClientConflictPanel.tsx:37-47`), and the click handlers `void` the promise. UI state stays correct (banner set before the rethrow, `saving` cleared in `finally`); the cost is console noise/monitoring alarms, dev-overlay in development.

## R6 — VERIFIED (documents committed; §12.14; word-for-word comparison done)

Committed at `525fde5`: `docs/artefacts/package1/PACKAGE1_GATE1_CONFLICT_INTEGRITY_PLAN.md` (copy-of-record), `docs/artefacts/package1/PACKAGE1_APPROVAL_WITH_AMENDMENTS_2026-07-19.md` (approval, amendments, and the frontend fix-round dispositions: N4 → Package 2, N9 accepted), `docs/audits/PACKAGE1_FRONTEND_FIX_ROUND_COMPLETION_2026-07-19.md`, and `docs/audits/PACKAGE1_FRONTEND_PR3_INDEPENDENT_AUDIT_2026-07-19.md` — the last is byte-identical to the original on the audit branch (same git blob `2020d57`). `API_CONTRACT.md` §12.14 now carries `KB_PATCH_VALIDATION_FAILED`, `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED`, and `USE_GATE1_CONFIRM_ENDPOINT`, each with HTTP status and description.

**Word-for-word shipped copy vs the committed plan's copy list** (the comparison the Layer-2 audit could not perform):

| Plan item | Shipped at 525fde5 | Result |
|---|---|---|
| `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED` "Enter a clear value before saving this item." | identical | MATCH |
| `KB_PATCH_VALIDATION_FAILED` "We couldn't save this item… contact support." | identical | MATCH |
| `USE_GATE1_CONFIRM_ENDPOINT` "…use 'Continue to missing questions' to move on." | identical; quoted label matches the real button | MATCH |
| `GATE_NOT_SATISFIED` "These project facts can't be edited right now…" | "This step isn't available right now. Refresh the page to see the latest version." | **DIVERGENCE — owner-approved**: the approval doc explicitly supersedes the plan draft with this exact gate-agnostic string (R3) |
| `GATE1_VALIDATION_FAILED` | identical | MATCH |
| `VALIDATION_ERROR` | identical | MATCH |
| `REPORT_NOT_FOUND` / `DONOR_REPORT_NOT_FOUND` | identical | MATCH |
| `UPGRADE_REQUIRED`, `RATE_LIMITED` "retain existing" | unchanged from approved base copy | MATCH |
| final 401 "Your session has expired. Sign in again to continue." | identical (`ME_401_MESSAGE`) | MATCH |
| known 5xx "We're having trouble saving right now. Please try again shortly." | identical as the save-surface variant | MATCH |
| unknown fallback "Something went wrong — please try again." | identical | MATCH |
| Card labels: heading / prompt / ambiguous label / entry title / helper / "Saving…" | all identical | MATCH |
| "disable all candidate, entry, and Continue controls while saving" | verified on both cards + footer | MATCH |

Notes: the plan document renders typographic apostrophes/quotes ("can't", 'Continue…') where code ships ASCII ones — same words, glyph-level difference only. Observation O5 (non-blocking): `ME_5XX_LOAD_MESSAGE` ("We're having trouble loading this right now. Please try again shortly.") is a new string not quoted in any copy-of-record document — implied by the approval's "copy split" disposition, swept clean; owner may want it added to the copy list. Strings shipped but not enumerated by the plan (entry-context templates, explanation sentences, `CONFLICT_ENTER_OTHER_PROMPT`, ambiguous hint) comply with the plan's composition rules (Amendment 3, no-internal-identifiers) and are all in the automated scan.

## No new packages, nothing weakened

- `package.json`, `package-lock.json`, `vitest.config.ts`, `eslint.config.mjs` untouched in the delta (verified by name filter); the only test file changed is `lib/gate1-conflict-ux.test.ts`, and the other six test files are byte-untouched.
- The test delta is strictly additive-or-stronger: all six original tests survive; the one edited assertion pins the single-ambiguous branch **more** specifically (`/One source mentions/i` replaces `/isn't specific enough/i`, which also matched the new multi-ambiguous branch); `INTERNAL_ID_PATTERN` widened; five tests added (explanation shapes; helper routing; degraded-card empty-value; draft preservation; 5xx split/gate-agnostic). No `.skip`/`.only`/`.todo`.

## Local verification at `525fde5`

| Step | Result |
|---|---|
| `vitest run` | 7 files, **47/47 pass** (fix-round note's claim confirmed) |
| `eslint` | 0 errors, 1 warning — the same pre-existing `react-hooks/exhaustive-deps` at `facts/page.tsx:101`, present on base |
| `next build` | compiled successfully, type-check clean, no new warnings |
| Mutation: helper guard removed | suite **RED** (2 routing tests fail); restored → 47/47 green |
| Mutation: component guard naively removed | suite green, **`tsc` RED** (`TS2339` on the discriminated union) — build gate catches it |
| Mutation: deliberate `option.value` bypass | suite and `tsc` green — recorded residual O2 |

Incidental, outside the delta: raw `tsc --noEmit` reports pre-existing `DisplayFact`-vs-`NormalizedFact` errors in `lib/knowledge-bank-gate1-layout.test.ts` on base and head alike; invisible to vitest, eslint, and `next build` (all green). Not a delta finding.

## Observations (all NON-BLOCKING, none gates the merge)

- **O1** — `String([])` → `""` residual on the client-card save route (`gate1-conflict-routing.ts:29`); backend-controlled composite edge outside the ruled class.
- **O2** — a deliberate component-level bypass of the routing helper is invisible to suite and type-check; inherent to the plan's approved lib-level test design.
- **O3** — the "Some sources mention…" explanation string (`knowledge-bank-view.ts:99`) is asserted but absent from the identifier scan; manually swept clean.
- **O4** — candidate-click save failures now surface as unhandled promise rejections in both panels (`handleSelect` lacks the catch `handleCustomSave` has); UI state remains correct.
- **O5** — `ME_5XX_LOAD_MESSAGE` is not quoted in the committed copy-of-record; swept clean.

## Disposition

**APPROVE** at `525fde514c3395b2dddd3d21a8cd5988d7b2cd0a`. Owner dispositions on N4 (→ Package 2) and N9 (accepted) are on record in the approval document. The merge sequence per the Layer-2 report now applies: backend PR #10 (per its own delta re-audit), then this PR at this SHA, then Railway SHA verification, then Phase A.
