# Package 1 — Frontend PR #3 fix round completion

**Date:** 2026-07-19  
**Branch:** `feat/gate1-conflict-integrity-ux`  
**STOP:** Pushed for delta re-audit before merge. Backend untouched.

## Files touched

| File | Reason |
|------|--------|
| `lib/gate1-conflict-routing.ts` | **New** — shared select-routing + entry context + failed-save state helper |
| `components/reports/gate1/Gate1ConflictPanel.tsx` | Consume shared router; preserve draft on failed save |
| `components/reports/gate1/Gate1ClientConflictPanel.tsx` | B1 — same empty-value law via shared router |
| `lib/knowledge-bank-view.ts` | N5 explanation shapes; N6 `GATE1_LABEL` for ambiguous display |
| `lib/me-error-messages.ts` | N1 5xx split; N2 gate-agnostic `GATE_NOT_SATISFIED`; exported 401/5xx constants |
| `components/shared/ErrorDisplay.tsx` | Load surface for 5xx |
| `app/(authenticated)/reports/[id]/facts/page.tsx` | Rethrow on conflict save failure; save-surface 5xx for cluster/confirm |
| `app/(authenticated)/reports/[id]/questions/page.tsx` | Save-surface 5xx |
| `app/(authenticated)/reports/[id]/review/page.tsx` | Save-surface 5xx |
| `lib/gate1-conflict-ux.test.ts` | Routing, degraded-card, draft-preserve, full copy scan |
| `docs/contracts/API_CONTRACT.md` | §12.14 add KB codes |
| `docs/artefacts/package1/PACKAGE1_GATE1_CONFLICT_INTEGRITY_PLAN.md` | Plan copy-of-record |
| `docs/artefacts/package1/PACKAGE1_APPROVAL_WITH_AMENDMENTS_2026-07-19.md` | Approval + dispositions |
| `docs/audits/PACKAGE1_FRONTEND_PR3_INDEPENDENT_AUDIT_2026-07-19.md` | Audit on record |
| `docs/audits/PACKAGE1_FRONTEND_FIX_ROUND_COMPLETION_2026-07-19.md` | This note |

## Tests

| Test | Reason |
|------|--------|
| Routing suite (concrete/ambiguous) | B2 — bites if guard removed |
| Degraded client never emits empty | B1 |
| Failed save preserves draft | R5 |
| Explanation multi/all-ambiguous | N5 |
| Extended identifier scan | N3 — prompt, 401/5xx, all explanation/entry branches |
| 5xx surface split + gate-agnostic GATE_NOT_SATISFIED | N1/N2 |

No tests deleted, skipped, or weakened. Lockfile untouched.

## Mutation witness (B2)

1. Temporarily made `routeConflictCandidateSelection` always `{ kind: "save", value }` (guard removed).
2. Ran `npm test -- --run lib/gate1-conflict-ux.test.ts`
3. **RED:** 2 failed / 9 passed — including:
   - `expected { kind: 'save', value: null } to deeply equal { kind: 'explicit_entry' }`
   - `expected { kind: 'save', resolvedValue: 'null' } to deeply equal { kind: 'explicit_entry' }`
4. Restored the guard immediately; suite green again.

## Dispositions recorded (no code)

- **N4** → Package 2 facts-screen redesign.
- **N9** → accepted.

## Verification

- `vitest`: **47 passed**
- `eslint` / `next build`: run at push head (see CI / local)
