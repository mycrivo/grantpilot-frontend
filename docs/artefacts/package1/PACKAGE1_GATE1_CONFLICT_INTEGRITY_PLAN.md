---
name: Gate1 Conflict Integrity
overview: Enforce a write-time conflict integrity invariant at the final knowledge-bank persistence seam, harden resolution semantics and Gate 1 error UX, then perform a guarded one-report production repair and owner-witnessed export proof. No production access occurs until this plan is approved; any additional production orphan halts the package before mutation.
todos:
  - id: governance-contracts
    content: Append D-058–D-062 verbatim and update KB/API contracts
    status: completed
  - id: backend-integrity
    content: Implement persistence-seam orphan normalization, strict resolution semantics, and provenance-only downstream fence
    status: completed
  - id: frontend-ux
    content: Implement explicit-entry routing and Gate 1-specific world-class error copy in real frontend repo
    status: completed
  - id: tests-delivery
    content: Add regression/UI/export tests, run Smoke P0 and frontend verification, then merge/deploy both repos
    status: completed
  - id: prod-scan-repair
    content: Run post-approval fleet scan; STOP on any extra orphan; otherwise snapshot and repair cb090edb only
    status: pending
  - id: witness-closeout
    content: Owner resolves/confirms; complete witnessed export proof and commit evidence pack
    status: pending
isProject: false
---

# Package 1 — Gate 1 conflict integrity

## Phase 0 evidence and chosen branch
- The committed row evidence in [`docs/artefacts/me_module/audits/GATE1_CONFLICT_SAVE_DIAG_DB_cb090edb.json`](docs/artefacts/me_module/audits/GATE1_CONFLICT_SAVE_DIAG_DB_cb090edb.json) shows `has_reconciler=true`, conflict key `reporting_period.end`, no fact at that key, and LLM-shaped sibling facts `reporting_period.end_formal` / `reporting_period.end_inception_call`.
- Deterministic input code in [`app/reports/reconciliation/input_builder.py`](app/reports/reconciliation/input_builder.py) emits `reporting_period.end` and `.stated_values[n]`; it does not compose the suffixed keys. The reconciler prompt permits semantic splits, `_llm_to_structured` accepts independently authored fact/conflict keys, [`validate_e1_knowledge_bank`](app/reports/schemas/knowledge_bank_reconciliation_v1.py) has no cross-key membership check, chunk merge has no such check, and [`reconcile_and_persist`](app/reports/services/knowledge_bank_reconciliation_service.py) currently writes the envelope directly.
- **Finding:** this is accepted agent output persisted without a cross-key integrity gate, not a deterministic key-composition branch defect.
- **Chosen mechanism:** do not redesign or modify the reconciler. At the final persistence seam, deterministically normalize an orphan into an unresolved canonical fact slot, mark matching suffixed facts as provenance-only, validate the invariant, then persist. Keep the PATCH missing-fact guard unchanged as a fail-closed moat.

## Owner amendments (2026-07-19 approval)
1. **Loud normalization:** every orphan repair emits WARNING structured log + agent-trace event (report id, conflict key, every provenance-only key). Same for prod repair.
2. **Conservative sibling marking:** mark `provenance_only_for` only on exact value AND source match to a conflict candidate plus key relationship; otherwise leave visible (err toward duplication).
3. **Conflict card story:** replace raw annotation with deterministic user-safe composition from source filename(s), human-readable label, and fixed ambiguous-party phrase.
4. **D-043 supersession scoped:** quote D-043 verbatim; name `assert_no_spurious_conflicts` grader alignment as open follow-up — no grader/prompt/answer-key change in this package.
5. **Verify decision-log head before numbering:** confirmed head is D-057 → append D-058–D-062.

## Governance and contracts first
- Append the owner’s D-A through D-E text verbatim to [`docs/artefacts/me_module/ME_MODULE_DECISION_LOG.md`](docs/artefacts/me_module/ME_MODULE_DECISION_LOG.md) as D-058 through D-062 (verified next IDs after D-057). D-059 quotes D-043 operative rule and names `assert_no_spurious_conflicts` as open follow-up.
- Update [`docs/artefacts/me_module/DB_FIELD_CONTRACT_DONOR_REPORTS.md`](docs/artefacts/me_module/DB_FIELD_CONTRACT_DONOR_REPORTS.md) with optional `provenance_only_for` on facts and the citability exclusion.
- Update [`docs/artefacts/API_CONTRACT.md`](docs/artefacts/API_CONTRACT.md) with the dedicated null/blank resolution domain code and Gate 1 save errors. No migration: this is additive JSONB metadata.

## Backend integrity and resolution semantics
- In [`app/reports/services/knowledge_bank_reconciliation_service.py`](app/reports/services/knowledge_bank_reconciliation_service.py), add one small pure normalizer used immediately before assigning `knowledge_bank_json`:
  - For every conflict, ensure `facts[conflict.fact_key]` is a dict.
  - If absent, create an **unresolved** canonical slot: `value=null`, `verification_status=unverified`, `confirmed=false`, deterministic human-readable label from the key, and provenance anchored to the retained conflict evidence. Never copy/select a candidate value.
  - Mark only matching prefixed sibling facts whose value/source signature corresponds to a conflict candidate with `provenance_only_for=<canonical conflict key>`; preserve their values and provenance byte-for-byte otherwise.
  - Validate after normalization that every conflict key is materializable; fail before DB assignment if not. This covers complete, chunked, and degraded origins without touching agent orchestration.
- Add optional `provenance_only_for` to [`KnowledgeBankFact`](app/reports/schemas/knowledge_bank_reconciliation_v1.py).
- In [`app/reports/services/knowledge_bank_patch_service.py`](app/reports/services/knowledge_bank_patch_service.py):
  - Reject `None` and blank-string `resolved_value` before any mutation with 422 `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED`.
  - Preserve the strict missing-fact `KB_PATCH_VALIDATION_FAILED` guard exactly.
  - On concrete-candidate or explicit-entry resolution, mark the canonical fact human-confirmed (`confirmed`, `confirmed_at`, `confirmed_by_user`) so the unresolved stub becomes citable only after the human choice.
- In [`app/reports/knowledge/confirmed_kb.py`](app/reports/knowledge/confirmed_kb.py), exclude `provenance_only_for` facts from citability. In [`app/reports/export/docx_renderer.py`](app/reports/export/docx_renderer.py), exclude only those provenance-only siblings from table inputs; do not alter other gap, synthesis, template, or export behavior.

## Frontend interaction and error experience
- Work only in the real frontend repo [`ngoinfo-grantpilot-frontend/`](ngoinfo-grantpilot-frontend/).
- In [`lib/knowledge-bank-view.ts`](ngoinfo-grantpilot-frontend/lib/knowledge-bank-view.ts), retain provenance excerpt on normalized conflict candidates, classify null/blank candidates as explicit-entry-only, and omit `provenance_only_for` facts from ordinary review rows. Candidate evidence remains visible through the conflict card.
- In [`components/reports/gate1/Gate1ConflictPanel.tsx`](ngoinfo-grantpilot-frontend/components/reports/gate1/Gate1ConflictPanel.tsx), a null/blank candidate opens explicit entry and never calls PATCH. Keep the input empty; show known source context beside it. Stop rendering raw agent annotation because it may contain internal slugs.
- Review copy in [`components/reports/report-status-labels.ts`](ngoinfo-grantpilot-frontend/components/reports/report-status-labels.ts):
  - Heading: “The documents show different information”
  - Prompt: “Choose the value this report should use.”
  - Ambiguous candidate: “This source does not give a clear value”
  - Explicit-entry title: “Enter the correct value”
  - Helper: “Review the source and enter the exact value the report should use.”
  - Save state: “Saving…”; while saving, disable all candidate, entry, and Continue controls; retain existing warning/error brand tokens and trust line.
- Add a Gate-1-specific map/resolver in [`lib/me-error-messages.ts`](ngoinfo-grantpilot-frontend/lib/me-error-messages.ts), used by the facts page, so generic copy is only for unknown errors. Proposed owner-review copy:
  - `KB_CONFLICT_RESOLUTION_VALUE_REQUIRED`: “Enter a clear value before saving this item.”
  - `KB_PATCH_VALIDATION_FAILED`: “We couldn’t save this item because the project facts are out of sync. Refresh the page and try again. If it still won’t save, contact support.”
  - `USE_GATE1_CONFIRM_ENDPOINT`: “Review your facts, then use ‘Continue to missing questions’ to move on.”
  - `GATE_NOT_SATISFIED`: “These project facts can’t be edited right now. Refresh the page to see the latest version.”
  - `GATE1_VALIDATION_FAILED`: “Resolve every item that needs your decision and review each section before continuing.”
  - `VALIDATION_ERROR`: “Some information wasn’t valid. Check the value and try again.”
  - `DONOR_REPORT_NOT_FOUND` / `REPORT_NOT_FOUND`: “We couldn’t find this report. Return to your reports and open it again.”
  - `UPGRADE_REQUIRED`, `RATE_LIMITED`: retain approved existing copy.
  - final 401 after refresh: “Your session has expired. Sign in again to continue.”
  - known 5xx: “We’re having trouble saving right now. Please try again shortly.”
  - unknown/network fallback only: “Something went wrong — please try again.”
- No user-facing string may contain fact keys, gate numbers, agent/reconciler names, error slugs, or raw backend details.

## Tests and anti-bent-ruler verification
- Add an emit/persistence regression test (new focused service test or existing reconciliation service coverage) proving an orphan agent result is normalized before persistence and that a raw orphan cannot pass the post-normalization invariant. It must fail on pre-fix code.
- Extend [`tests/test_knowledge_bank_patch.py`](tests/test_knowledge_bank_patch.py): repaired orphan resolves through concrete candidate and explicit entry; null/blank returns the dedicated code; strict unknown/missing fact tests remain unchanged; canonical fact becomes human-confirmed.
- Extend [`tests/test_confirmed_kb.py`](tests/test_confirmed_kb.py) and [`tests/test_docx_renderer.py`](tests/test_docx_renderer.py): provenance-only siblings are excluded, canonical resolved fact remains citable/renderable, and no duplicate/contradictory period-end row appears.
- Add frontend Vitest coverage without new dependencies: pure candidate-action routing proves null/blank opens explicit entry and never yields a PATCH value; normalization hides provenance-only rows; Gate-1 error resolver maps every known code and unknown-only fallback; all tested copy is scanned for internal identifiers.
- Run targeted backend tests, full Smoke P0 exactly as `.github/workflows/smoke-test.yml`, isolation checks, then frontend `npm test`, `npm run lint`, and `npm run build`. Do not delete/weaken existing tests; completion report enumerates every test edit and reason.

## Delivery and deployment sequence
- Backend: logical governance/contract, product/test, and audit-tooling commits; PR review; merge to backend `main`.
- Frontend: separate product/test commit and PR in [`ngoinfo-grantpilot-frontend/`](ngoinfo-grantpilot-frontend/); merge to its `main`.
- Verify Railway web and worker run the approved backend SHA and the frontend service runs the approved frontend SHA before any production scan or repair. Existing untracked `_diag_*` scripts are preserved and excluded unless deliberately promoted in the audit-tooling commit.

## Bounded production authorization requested by plan approval
- **Phase A — fleet scan, read-only:** after approved code is deployed, query only `donor_reports.knowledge_bank_json` needed to enumerate conflicts whose key is absent/non-dict in `facts`. Write a timestamped evidence JSON. **STOP immediately if any orphan exists outside `cb090edb-715b-41cb-b3be-61c006fbdb55`, if that report’s shape changed, if Gate 1 is already confirmed, or if more than the one known orphan exists. No repair in that case.** Railway CLI, if used, runs through Command Prompt.
- **Phase B — one-row repair:** only if Phase A is exactly GREEN, snapshot the full target row, canonicalize and hash it, dry-run the shared product normalizer, and show an exact diff. Apply one compare-and-swap transaction to `cb090edb…` only: add the unresolved canonical slot and provenance-only markers; do not alter candidate values, `resolved_value`, gate stamps, jobs, content, templates, or any other report. Read back in-transaction; rollback on any unexpected path/value change. Keep the immutable preimage as rollback source.
- **Phase C — owner human action:** owner selects a concrete candidate or enters an explicit value in production UI, saves it, and confirms facts. Cursor does not auto-select or invent a value.
- **Phase D — witnessed completion:** pause at every human gate, then resume the same report through synthesis, review, and export. Capture API/job/KB evidence and the DOCX. The release gate is: one canonical citable reporting-period-end fact; sibling facts retained but non-citable; one distinct resolved AR1 end value in all DOCX paragraphs/tables; no sibling labels/keys, duplicate rows, or contradictory candidate value; provenance links to the owner-selected candidate or owner attestation.
- If the DOCX/KB gate fails, STOP with evidence—no opportunistic fix or second mutation.

## Closeout
- Commit a Package 1 evidence pack containing fleet scan, preimage hash, repair diff/read-back, owner-resolution response, post-Gate-1 KB, job trace, export analysis, deployed SHAs, tests, and every touched file/test with reason.
- Confirm no schema migration, no reconciler rewrite, no auth/disaggregation/facts-screen redesign, and Smoke P0 green. STOP after the completion report; follow-up fixes require a separately scoped package.