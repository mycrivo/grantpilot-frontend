# Package 1 — Frontend PR #3 Independent Audit (Layer 2 gate, pre-merge)

- **Date:** 2026-07-19
- **Auditor:** independent read-only session (local checkout; prior session could not read PR #3 via GitHub)
- **Repository:** `mycrivo/grantpilot-frontend` (sole checkout in this workspace at `/home/user/grantpilot-frontend`; no `ngoinfo-grantpilot-frontend/` directory and no phantom `frontend/` stub exist here)
- **PR #3 branch:** `feat/gate1-conflict-integrity-ux`
- **Audited head SHA (merge decision applies to this SHA only):** `4b6b685973c62bcef8a19c70d5a3f3c3ebb66ef5`
- **Base:** `main` @ `f485d56097e4eb75d9bf7b75ab32a60fa8461ace` (confirmed two ways: merge-base equals main head; `refs/pull/3/merge` = `42d5b3b4` has exactly parents `f485d56` and `4b6b685`)
- **Diff shape:** single commit, 7 files, +335/−54: `app/(authenticated)/reports/[id]/facts/page.tsx`, `components/reports/gate1/Gate1ConflictPanel.tsx`, `components/reports/report-status-labels.ts`, `lib/gate1-conflict-ux.test.ts` (new), `lib/knowledge-bank-gate1-layout.ts`, `lib/knowledge-bank-view.ts`, `lib/me-error-messages.ts`

## Reference availability (read first)

Neither reference document exists in this workspace or anywhere in the repository history:

1. **The approved Package 1 plan** is not committed in-repo and was not provided in this session. Consequences: the word-for-word shipped-vs-approved copy comparison (Check 4), the plan's full error-code list (Check 3), and the exact approved final-401/known-5xx copy (Check 3) **could not be verified and are explicitly not passed**. The in-repo contract mirror `docs/contracts/API_CONTRACT.md` §12.14 was used as a partial substitute where noted.
2. **`PACKAGE1_PRS_INDEPENDENT_AUDIT_2026-07-19.md` (backend audit)** is absent from this workspace, so the checks it "explicitly left unperformed" could not be enumerated or picked up. Not passed.

All other checks were completed against the local checkout at the head SHA.

---

## VERDICT: APPROVE WITH FIXES

The diff itself is correct on its core invariant: at SHA `4b6b685`, the server-conflict card's ambiguous/null candidate can never issue a save, no traced path through that card can submit a null/empty/whitespace resolved value, and the card's story is genuine and identifier-free. Tests (42/42), lint (0 errors), and production build all pass at head.

Two BLOCKING findings gate the merge; both are small, well-defined remediations that do not change the shipped design. Remediation returns to the builder; a delta re-audit of the fix commits is required before merge (mirroring the backend PR #10 treatment). Everything else is NON-BLOCKING.

---

## BLOCKING FINDINGS

### B1. Degraded-mode sibling card can still send an empty resolved value (pre-existing on base; survives at the audited SHA)

`components/reports/gate1/Gate1ClientConflictPanel.tsx:26`

```
await onResolve(allKeys, String(value ?? ""));
```

In degraded mode (`reconciliation_outcome === "degraded"`), label-duplicate facts with differing values are promoted into `Gate1ClientConflictPanel` — a card visually near-identical to the reworked conflict card, rendered in the same "Needs your decision" list (`Gate1ReviewFacts.tsx:132-139`). A candidate whose fact value is `null` displays as "—", and one click sends `String(null ?? "")` = `""` through `handleResolveClientConflict` (`facts/page.tsx:179-196`), which PATCHes `{ value: "", confirmed: true }` for **every** fact key in the group. A whitespace-only fact value passes through unchanged the same way. This is exactly the class of save Check 1 rules on: "Any path that can send an empty value is a BLOCKING finding."

Classification: **BLOCKING** — a one-click empty-value save path on the Gate 1 conflict-resolution surface at the audited SHA. Caveats stated plainly: the line is byte-identical on base `f485d56` (verified), is not touched by this diff, and PR #3 neither introduced nor worsened it — so this blocks **Package 1 acceptance at this gate**, not the correctness of the diff's own changes. Whether the approved plan scoped the degraded card into Package 1 could not be checked (plan unavailable). Reachability requires the degraded lane plus a null/whitespace-valued duplicate fact — a realistic degraded payload.

### B2. The mandated routing test does not exist: removing the null-path guard leaves the whole suite green (witnessed)

`lib/gate1-conflict-ux.test.ts` (new) tests the **normalization flag** (`requiresExplicitEntry`, red on base — witnessed), but nothing tests that `Gate1ConflictPanel` **honors** it. Witnessed by mutation at head: deleting the guard at `components/reports/gate1/Gate1ConflictPanel.tsx:37-40` (so the ambiguous candidate calls `onResolve` directly with a `null` value) and running the full suite → **42/42 pass**. Check 6's requirement — "the routing test must actually fail if the null path were allowed to call save" — is not met; a future refactor of the panel could silently reintroduce the empty-save path with no red test.

Mitigating context, stated for the remediation decision: vitest is configured `environment: "node"`, `include: ["**/*.test.ts"]` (`vitest.config.ts`), with no jsdom/testing-library in devDependencies — a component-level click test was impossible without new packages, which Check 7 forbids. A dependency-free remediation exists (e.g., extract the select-routing decision into `lib/` and have both the panel and a test consume it); the choice is the builder's/owner's.

Classification: **BLOCKING** — the coverage mandated for the package's core invariant is absent, demonstrated by a green mutation run.

---

## NON-BLOCKING FINDINGS

- **N1. Shared-resolver 5xx copy now says "saving" on non-save surfaces.** `lib/me-error-messages.ts:114` changes the generic 5xx copy to "We're having trouble saving right now…" inside `resolveFriendlyApiErrorMessage`, which is also the resolver behind `components/shared/ErrorDisplay.tsx:34` — used for page-**load** failures (e.g., facts page "Project facts unavailable", `facts/page.tsx:283`). A 500 while loading now claims a save was in progress. Misleading copy only; no identifier leak. Diff-introduced.
- **N2. `GATE_NOT_SATISFIED` copy is now facts-specific but the code is shared across gates.** `lib/me-error-messages.ts:18` ("These project facts can't be edited right now…") also surfaces via the shared resolver on the Gate 2 continue (`questions/page.tsx:213`) and Gate 3 approve (`review/page.tsx:118`) paths, where "project facts" is the wrong referent. The replaced base copy was gate-agnostic. Diff-introduced.
- **N3. Automated copy-scan sweeps a subset, not ALL new/changed strings (Check 4 cross-list).** `lib/gate1-conflict-ux.test.ts:113-148` sweeps the full error map (via `GATE1_SAVE_ERROR_MESSAGE`, which aliases `ME_ERROR_MESSAGE`) plus six GATE1 labels plus one composed explanation. **Not swept:** `GATE1_LABEL.CONFLICT_ENTER_OTHER_PROMPT` (changed, `report-status-labels.ts:297`); the hardcoded 401 copy (`me-error-messages.ts:106`) and 5xx copy (`me-error-messages.ts:114`); the non-ambiguous explanation branch and the `"your documents"`/`"this item"` fallbacks (`knowledge-bank-view.ts:93,84,63`); the explicit-entry context templates (`Gate1ConflictPanel.tsx:28-33`). Manual sweep of all gaps in this audit: clean — no fact keys, gate numbers, agent/reconciler names, error slugs, or backend details in any of them. Coverage gap only.
- **N4. Ordinary fact rows can save an empty value (pre-existing, outside the conflict card).** `components/reports/gate1/Gate1FactGridRow.tsx:20-22` sends `onSave(fact.key, draftValue)` with no trim/empty guard and the save button disabled only by `saving`; clearing a row input and saving PATCHes `{ value: "", confirmed: true }`. Same class of harm as B1 but not a conflict-resolution path, byte-identical on base. Reported for the owner's queue.
- **N5. Explanation says "One source mentions…" regardless of how many candidates are ambiguous**, and if every candidate were ambiguous, "choose a clear value" points at nothing (`knowledge-bank-view.ts:88-92`). Copy accuracy nit in an edge shape.
- **N6. Duplicated literal for the ambiguous label.** `knowledge-bank-view.ts:121` hardcodes "This source does not give a clear value" instead of referencing `GATE1_LABEL.CONFLICT_AMBIGUOUS_LABEL` (`report-status-labels.ts:301`); the equality is asserted by test today but the two can drift.
- **N7. Failed explicit-entry save discards the typed value.** `Gate1ConflictPanel.tsx:46-54`: `onResolve` never rejects (page handler swallows errors, `facts/page.tsx:135-148`), so after a failed save the entry closes and `customValue` clears; the user re-types. Error banner does show. UX wart, no data risk.
- **N8. New KB codes are not in the in-repo contract mirror.** `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED`, `KB_PATCH_VALIDATION_FAILED`, `USE_GATE1_CONFIRM_ENDPOINT` appear nowhere in `docs/contracts/API_CONTRACT.md` §12.14. With the plan file also absent from the repo, there is no committed copy-of-record for these codes.
- **N9. Theoretical raw-message door on the save path.** The pre-existing `UNSUPPORTED_DOCUMENT_FORMAT` pass-through (`me-error-messages.ts:38,94-98`) is reachable through `resolveGate1SaveErrorMessage` since it shares the resolver; a backend would have to return that code on a KB PATCH for a raw server message to render on the facts screen. No realistic path today; noted for completeness.

---

## CHECK-BY-CHECK RESULTS

### Check 1 — Ambiguous-candidate path can never send an empty value: PASS for the diff's conflict card; FAILS at the SHA via B1 (pre-existing sibling card)

Traced every interaction on `Gate1ConflictPanel` at head:

- **Concrete candidate:** `handleSelect` (`Gate1ConflictPanel.tsx:36-44`) calls `onResolve(conflict.factKey, option.value)` only when `option.requiresExplicitEntry` is false; the flag is `isAmbiguousConflictValue(value)` (`knowledge-bank-view.ts:49-51`, `113`) = `null | undefined | whitespace-only string`, so a selectable candidate's value is non-empty by construction.
- **Ambiguous/null candidate:** `Gate1ConflictPanel.tsx:37-40` routes into `openExplicitEntry(option)` and returns — **never** issues the save call. Its `displayText` is the fixed ambiguous label, and it can never render as selected (`:75-78` excludes `requiresExplicitEntry` options from the resolved match).
- **Explicit entry:** `handleCustomSave` (`:46-54`) early-returns on `!customValue.trim()` and saves `customValue.trim()` — never null/empty/whitespace. The save button independently requires a non-blank draft (`:127`).
- **Keyboard submission:** no `<form>` element exists anywhere under `components/reports/gate1/` or `app/(authenticated)/reports/` (grepped at head), so Enter in the text input cannot trigger implicit submission; Enter on a button fires its own guarded onClick.
- **Double-click / in-flight:** every candidate button (`:85`), the entry opener (`:103`), the input (`:122`), and the save button (`:127`) carry `disabled={saving}`; `saving` is page-level state set synchronously at the start of every save handler (`facts/page.tsx:115,136,152,181`) and shared across all cards. The continue button is disabled by `confirming || saving || disabled` (`Gate1StickyFooter.tsx:47`); cluster-review buttons by `saving || reviewing` (`Gate1ReviewCluster.tsx` action row); add-fact save by `saving || !label.trim() || !value.trim()` (`Gate1AddFactForm.tsx:96`). Even a click that slipped a render would resend the same non-empty value (idempotent), not an empty one.
- **Re-render races:** panels are keyed by `factKey`; state persisting across `refreshAfterPatch` cannot produce an empty send (the trim guard reads current state synchronously with no await before it). A server-echoed empty-string `resolved_value` no longer counts as resolved (`knowledge-bank-view.ts:134-137`), so an empty resolution can't silently mark a card done or unblock continue.

The check's universal clause ("no path can submit a null, empty, or whitespace-only resolved value") is defeated at the SHA by the degraded sibling card — **finding B1**.

### Check 2 — Amendment 3, the card keeps its story: PASS

- The raw agent annotation is gone from the render path and the type: `NormalizedConflict` no longer carries `annotation` (`knowledge-bank-view.ts:29-38`), `normalizeConflicts` never reads `conflict.annotation`, and the panel renders `conflict.explanation` (`Gate1ConflictPanel.tsx:70`). Grep of the entire head tree for `annotation` in non-test `.ts/.tsx`: one hit, a doc comment (`knowledge-bank-view.ts:32`). The new test asserts the property is absent (`gate1-conflict-ux.test.ts:59`).
- The replacement is deterministic and composed from structured fields (`composeConflictExplanation`, `knowledge-bank-view.ts:71-95`): source filename(s) from `source_label`, the humanized label (backend `semantic_label` when present, else `humanizeFactKey` — which strips the dots/underscores the internal-ID pattern targets), and fixed phrasing for the ambiguous party.
- NGO-user judgment on the rendered card with no other context: heading "The documents show different information"; explanation e.g. "We found more than one value for First Annual Review reporting period end date in Award Letter.docx. One source mentions a value that isn't specific enough to use — choose a clear value or enter the correct one."; candidates showing value + source, the ambiguous one labeled "This source does not give a clear value"; explicit entry opens with the provenance excerpt ("From Award Letter.docx: October to September"). What happened, why one option is unusable, and what to do are all present. The card keeps its story. (Edge-shape copy nit: N5.)

### Check 3 — Error map coverage and fallback discipline: PASS on everything verifiable in-repo; plan-dependent items NOT PASSED

- `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED` and `KB_PATCH_VALIDATION_FAILED` are mapped to designed NGO copy (`me-error-messages.ts:41-43`), as are `USE_GATE1_CONFIRM_ENDPOINT` (`:44-45` — and its quoted button label matches the real `CONTINUE_TO_QUESTIONS` label, `report-status-labels.ts:342`) and `GATE1_VALIDATION_FAILED`. Every code in the in-repo contract mirror §12.14 (REPORT_NOT_FOUND, TEMPLATE_NOT_FOUND, JOB_NOT_FOUND, SECTION_NOT_FOUND, GATE_NOT_SATISFIED, EXPORT_NOT_READY, FILE_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE, UPGRADE_REQUIRED, QUOTA_EXCEEDED) is mapped. **"Every other code in the approved plan's list" could not be verified — plan unavailable; not passed.**
- Unknown codes fall to the generic banner only: `resolveGate1SaveErrorMessage` (`me-error-messages.ts:121-126`) resolves code-first, then 401/429/5xx by status, then `ME_GENERIC_ERROR_MESSAGE`; witnessed by the passing test (`gate1-conflict-ux.test.ts:107-111`).
- Raw server messages and `details` are never rendered on the Gate 1 flows: the resolver returns only map/hardcoded copy (sole deliberate exception is the pre-existing `UNSUPPORTED_DOCUMENT_FORMAT` lane — N9); `ErrorDisplay` renders resolver output plus a `request_id` reference only; `details` is consumed solely for quota `reset_at` formatting and profile field mapping (both pre-existing, neither rendered raw).
- Final-401: `api-client.ts` refresh-retries once, then force-redirects to login; the resolver's 401 copy (`me-error-messages.ts:106`) is the last-resort text behind that redirect — consistent "final-401" semantics. Known-5xx copy exists (`:114`). **Word-for-word match of both against the plan could not be verified; not passed.** The 5xx copy's bleed onto load surfaces is N1; GATE_NOT_SATISFIED's bleed onto Gates 2/3 is N2.

### Check 4 — Internal identifiers and shipped-vs-approved copy: identifier sweep PASS; test-coverage cross-list FAILS (N3); plan comparison NOT PASSED

Every user-facing string added or changed in the diff was inventoried and manually swept: 7 GATE1 labels (`report-status-labels.ts:294-301`), 9 error-map entries changed/added, the 401 and 5xx hardcoded copy, the three explanation templates plus fallbacks, the entry-context templates, and the inline ambiguous label. None contains fact keys, gate numbers, agent or reconciler names, error slugs, or backend `details`. (The provenance excerpt shown in entry context is quoted source-document text — the evidence the card is required to keep, not backend internals.) The automated scan covers a subset, not all — **N3**, with the cross-list in the finding. **Word-for-word comparison against approved plan copy: plan unavailable; not passed — every shipped string is quoted or cited here so the owner can diff against the plan directly.**

### Check 5 — Provenance-only rows and review coherence: PASS

- `normalizeFacts` drops any fact with a non-blank string `provenance_only_for` (`knowledge-bank-view.ts:149-160`) — witnessed by the passing test. Conflicts are **not** filtered by it (`normalizeConflicts` is independent), so the conflict card and its candidate values/excerpts remain fully reachable while the sibling row is hidden.
- Arithmetic: `buildGate1LayoutView` computes `rawFactCount`, `displayFactCount`, sections, and cluster `factCount` from the already-filtered fact list (`knowledge-bank-gate1-layout.ts:438-471`, `collectFactKeys`), so hidden rows are never counted, never listed, and never enter `needsPromotionKeys`. "Needs your decision" counts conflicts only (`Gate1ReviewFacts.tsx:64-66`). Clusters emptied by hiding are dropped (`buildGate1ReviewClusters` filters `factCount > 0`), so "I've reviewed this" completeness and `allClustersReviewed` never demand review of invisible rows, and continue-gating (`hasUnresolvedConflicts || !allClustersReviewed`) stays coherent. A user is neither blocked by nor credited for rows they cannot see.
- Interface assumption noted (not a frontend defect): hidden provenance-only facts are also excluded from the promote flow; backend must not require their promotion at gate1/confirm — a backend-PR-#10 contract question outside this audit.

### Check 6 — Anti-bent-ruler: additions genuine at the data layer, red-run witnessed; routing genuineness FAILS (B2)

- No test deletions, no modifications to the 6 pre-existing test files (base and head trees compared; the diff's only test change is the new file), no `.skip`/`.only`/`.todo` anywhere in it, no vitest-config or dependency changes.
- **Red-run witnessed against base `f485d56`:** the new file placed onto a base checkout fails **6/6** — the normalization/ambiguous-flag tests (missing `requiresExplicitEntry`/`explanation`/`isAmbiguousConflictValue`/`composeConflictExplanation`) and both error-resolver tests (missing `resolveGate1SaveErrorMessage`/KB codes) all red.
- **Mutation witnessed at head:** guard removed from the panel → 42/42 green → **B2**.
- Tests added (all in `lib/gate1-conflict-ux.test.ts`; none changed elsewhere):
  1. *marks null candidates as explicit-entry-only and composes a safe explanation* — null candidate gets `requiresExplicitEntry`/fixed label; explanation contains semantic label, source filename, ambiguous phrasing; no internal IDs; `annotation` absent.
  2. *hides provenance-only siblings from ordinary fact rows* — `normalizeFacts` drops `provenance_only_for` entries.
  3. *treats blank string as ambiguous* — `isAmbiguousConflictValue` over null/""/concrete.
  4. *maps every known Gate 1 save code to designed copy without internal identifiers* — 8 codes resolve to exact map copy, never generic.
  5. *uses generic banner only for unknown codes* — unknown 422 → generic fallback.
  6. *scans all newly added Gate 1 save strings for internal identifiers* — sweeps the full error map + 6 labels + one composed explanation (subset: N3).

### Check 7 — Scope discipline: PASS with one flagged bleed

All 7 touched files sit on authorized surfaces (conflict panel, knowledge-bank view/normalization, Gate 1 error messages, status/label copy, plus the new test). No auth, entitlement, billing, facts-screen-redesign, or routing changes (`api-client.ts` untouched; the 401 branch is error copy, not auth logic; the confirm redirect target is pre-existing). `package.json` and `package-lock.json` are absent from the diff — **zero new packages**, lockfile untouched. Flagged: the four shared error-map entries and two shared hardcoded strings changed inside `me-error-messages.ts` alter copy on non-Gate-1 surfaces through the shared resolver (N1/N2) — inside the authorized file, outside the Gate 1 surface in effect.

### Check 8 — Local verification at head `4b6b685`: PASS

| Step | Head result | Base comparison |
|---|---|---|
| `vitest run` | 7 files, **42/42 pass** (934ms) | base: 6 files, 36/36 pass — head adds exactly the 6 new tests |
| `eslint` | **0 errors**, 1 warning (`react-hooks/exhaustive-deps`, `facts/page.tsx:101`) | identical warning pre-exists on base (line 98; shifted by the import hunk) — **not introduced by this PR** |
| `next build` (production) | **succeeds**, type-check clean; only output warning is the same pre-existing lint warning; `next.config.ts` suppresses nothing | — |

Environment: fresh `npm ci` from the untouched lockfile; vitest 3.2.6; Next 15.5.12.

---

## Disposition

**APPROVE WITH FIXES.** B1 and B2 return to the builder; the fix commits require a delta re-audit before merge. The plan-dependent items (plan's full error-code list; word-for-word copy; backend audit's unperformed checks) remain open until the owner supplies the plan file and backend audit — they are explicitly not passed here. On completion of the fix round and delta re-audit, the stated merge sequence applies: backend PR #10 first, then this PR at its re-audited SHA, then Railway SHA verification, then Phase A.
