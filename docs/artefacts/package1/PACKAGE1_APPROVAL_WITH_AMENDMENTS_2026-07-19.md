# Package 1 — Owner approval with amendments (copy-of-record)

**Date:** 2026-07-19  
**Status:** Approved — copy-of-record for Package 1 Gate 1 conflict integrity (frontend + backend).  
**Plan:** [`PACKAGE1_GATE1_CONFLICT_INTEGRITY_PLAN.md`](PACKAGE1_GATE1_CONFLICT_INTEGRITY_PLAN.md)

## Approved amendments (verbatim intent)

1. **Loud normalization:** every orphan repair emits WARNING structured log + agent-trace event (report id, conflict key, every provenance-only key). Same for prod repair.
2. **Conservative sibling marking:** mark `provenance_only_for` only on exact value AND source match to a conflict candidate plus key relationship; otherwise leave visible (err toward duplication).
3. **Conflict card story:** replace raw annotation with deterministic user-safe composition from source filename(s), human-readable label, and fixed ambiguous-party phrase.
4. **D-043 supersession scoped:** quote D-043 verbatim; name `assert_no_spurious_conflicts` grader alignment as open follow-up — no grader/prompt/answer-key change in this package.
5. **Verify decision-log head before numbering:** confirmed head is D-057 → append D-058–D-062.

## Frontend fix-round owner dispositions (2026-07-19, PR #3 audit)

Pulled into Package 1 by owner decision after independent frontend audit:

- **B1:** Degraded sibling card (`Gate1ClientConflictPanel`) must obey the same empty-value invariant as the main conflict card.
- **B2:** Select-routing must live in a shared `lib/` helper tested directly (mutation-witness required).
- **N1/N2/N5/N6/N7/N3/N8:** copy split, gate-agnostic `GATE_NOT_SATISFIED`, explanation shapes, single ambiguous-label source, failed-save draft retention, full copy scan, contract mirror codes — remediations in the frontend fix round.
- **N4 accepted / queued:** empty save on ordinary fact rows → Package 2 facts-screen redesign.
- **N9 accepted:** theoretical `UNSUPPORTED_DOCUMENT_FORMAT` raw-message door; no realistic KB PATCH path.

**Note on `GATE_NOT_SATISFIED` copy:** the original plan draft used facts-specific wording. The frontend fix round supersedes that with gate-agnostic copy so Gates 2/3 shared-resolver surfaces remain accurate: “This step isn't available right now. Refresh the page to see the latest version.”
