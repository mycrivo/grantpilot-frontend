# B-00 — Frontend Contract-Mirror Staleness Audit

**Date:** 2026-06-06  
**Pass:** READ-ONLY (B-00)  
**Auditor scope:** `docs/contracts/` mirror vs backend canonical `docs/artefacts/`  
**Canonical authority:** `C:\Users\prana\OneDrive\Desktop\NGOInfo-Grantpilot\docs\artefacts\` (backend repo, sibling to frontend repo)

---

## 1. Workspace guard

| Check | Expected | Observed at Cursor workspace root (`…/NGOInfo-Grantpilot/frontend/`) | Result |
|-------|----------|-----------------------------------------------------------------------|--------|
| `package.json` with `"name": "frontend"` | Present | **Absent** — workspace root contains only `.next/`, `node_modules/`, `next-env.d.ts` | **FAIL** |
| App Router `app/` directory | Present | **Absent** | **FAIL** |
| `*.tsx` source files | Present | **Absent** (no source tree) | **FAIL** |
| Backend markers absent (`requirements.txt`, `app/main.py`, `app/reports/`) | Absent at workspace root | Absent at workspace root | PASS |
| `docs/contracts/` mirror at workspace root | Expected for audit | **`frontend/docs/contracts/` does not exist** | **FAIL** |

**Guard verdict: FAIL**

The Cursor workspace path points to an incomplete `frontend/` stub (build artefacts only), not a checkout of the GrantPilot frontend repository. The identifiable frontend repo and contract mirror live at the sibling path:

- **Frontend repo root:** `…/NGOInfo-Grantpilot/ngoinfo-grantpilot-frontend/` (own git root; `package.json` name `"frontend"`; `app/` with `.tsx` sources)
- **Contract mirror audited below:** `ngoinfo-grantpilot-frontend/docs/contracts/`

Git context: `git rev-parse --show-toplevel` from workspace `frontend/` resolves to the parent monorepo `NGOInfo-Grantpilot/` (which contains backend markers). The frontend repo is a nested sibling, not the workspace root.

**Implication:** Per strict guard rules this pass should not proceed; surface findings below are nevertheless recorded against the only extant frontend contract mirror (`ngoinfo-grantpilot-frontend/docs/contracts/`) because the workspace root carries no mirror at all.

---

## 2. Backend canonical reachability

| Question | Verdict |
|----------|---------|
| Is backend canonical reachable from this workspace? | **YES** |
| Absolute path | `C:\Users\prana\OneDrive\Desktop\NGOInfo-Grantpilot\docs\artefacts\` |
| Relative path from frontend repo | `../../docs/artefacts/` |
| Relative path from workspace `frontend/` stub | `../docs/artefacts/` |
| Touch backend repo in this pass? | **No** (read-only inspection only) |

**Recommended sync method for B-00b:** In-repo copy from the reachable sibling backend canonical — at minimum:

- `docs/artefacts/API_CONTRACT.md` → `ngoinfo-grantpilot-frontend/docs/contracts/API_CONTRACT.md`
- `docs/artefacts/PRICING_AND_ENTITLEMENTS.md` → `ngoinfo-grantpilot-frontend/docs/contracts/PRICING_AND_ENTITLEMENTS.md`

Optional follow-on (out of B-00b minimum, needed for later B-packages): `ENUM_REGISTRY.md`, `docs/artefacts/me_module/*` field contracts — not currently mirrored under `docs/contracts/`.

**Size / freshness delta (API contract):**

| File | Mirror (frontend) | Canonical (backend) |
|------|-------------------|---------------------|
| `API_CONTRACT.md` lines | 718 | 1,272 |
| `API_CONTRACT.md` bytes | 26,266 | 46,020 |
| Last modified | 2026-06-06 15:59 | 2026-06-06 14:20 |
| Latest changelog entry | 2026-03-16 (NGO profile alignment) | 2026-05-24 (M&E §12 Stage B lock) |

Mirror file is newer on disk but **554 lines shorter** and missing the entire M&E addition.

---

## 3. Per-surface verdict table

Canonical references: `docs/artefacts/API_CONTRACT.md` (§4, §10.2–10.3, §12) and `docs/artefacts/PRICING_AND_ENTITLEMENTS.md`.

| # | Surface | Verdict | Evidence (mirror) | Gap vs canonical |
|---|---------|---------|-------------------|------------------|
| **1** | **M&E routes (§12 family)** — list, detail, templates, three gates, job poll, document upload, export; canonical `/api/reports/{id}/…`; no retired `donor-reports` paths | **ABSENT** | `docs/contracts/API_CONTRACT.md` ends at §11 (line ~992) with `**END OF CONTRACT**` at line 1025. No §12. Grep for `/api/reports`, `report-templates`, `gate1`, `gate2`, `gate3`, `/job`, `/documents`, `/export` (M&E) → **zero hits**. Only export route documented is `POST /api/proposals/{id}/export` (§9.5, line 923). | Canonical §12 (lines 1141–1727) documents 13+ M&E endpoints including `GET /api/reports`, `GET /api/reports/{id}`, `GET /api/report-templates`, `POST /api/reports/{id}/documents`, gate paths (`…/knowledge-bank/gate1/confirm`, `…/gate2/gap-responses`, `…/gate3/confirm`), `POST`/`GET /api/reports/{id}/job`, `POST /api/reports/{id}/export`. Retired `donor-reports` segment correctly absent in mirror (also absent because M&E block is missing entirely). |
| **2** | **Entitlements payload (§4)** — both `reports` and `report_exports` blocks | **STALE** | `docs/contracts/API_CONTRACT.md` §4 (lines 289–322): response includes `fit_scans`, `proposals`, `proposal_regenerations` only. **No `reports` or `report_exports` keys.** | Canonical §4 (lines 320–333) adds `reports` and `report_exports` quota objects; notes FREE/GROWTH `reports.limit = 0`, IMPACT `reports.limit = 2`, `report_exports` idempotent per report version. |
| **3a** | **429 QUOTA_EXCEEDED (§10.2)** — reports entitlement in error shape | **STALE** | `docs/contracts/API_CONTRACT.md` §10.2 (lines 971–988): `details.entitlement` enum is `"fit_scans \| proposals \| proposal_regenerations \| docx_exports"` — **missing `reports` and `report_exports`**. | Canonical §10.2 (lines 1092–1108) extends enum to include `\| reports \| report_exports`. |
| **3b** | **403 UPGRADE_REQUIRED (§10.3)** — M&E Free/Growth gate response | **ABSENT** | Grep `UPGRADE_REQUIRED`, `10.3`, `me_reports` in `docs/contracts/API_CONTRACT.md` → **zero hits**. Document jumps from §10.2 to §11. | Canonical §10.3 (lines 1111–1126) defines `{ "error_code": "UPGRADE_REQUIRED", "details": { "required_plan": "IMPACT", "feature": "me_reports" } }` for Free/Growth M&E entry. |
| **4a** | **Impact `fit_scans` = 10 (not 20)** | **STALE** | `docs/contracts/PRICING_AND_ENTITLEMENTS.md` Impact Plan (line 26): `Fit Scans: 20 / month`. | Canonical `docs/artefacts/PRICING_AND_ENTITLEMENTS.md` Impact Plan (line 29): `Fit Scans: 10 / month`. Backend `PLAN_QUOTAS` confirms `fit_scans=10` for IMPACT (`app/services/quota_service.py` lines 64–70). |
| **4b** | **Impact reports = 2 per billing cycle** | **ABSENT** | `docs/contracts/PRICING_AND_ENTITLEMENTS.md`: no M&E / reports lines on any plan. Grep `M&E`, `reports`, `report_export` → **zero hits**. | Canonical Impact Plan (line 34): `M&E reports: 2 / month`. Canonical §4 + `ENUM_REGISTRY.md` §5.10: `reports` entitlement, BILLING_CYCLE, 2/month on IMPACT. |
| **4c** | **Report exports unlimited (idempotent, not quota-capped)** | **ABSENT** | No `report_exports` or M&E export rules in mirror pricing doc. Proposal export rules only (lines 85–93). | Canonical: `report_exports` idempotent per report version (`API_CONTRACT.md` §4 line 340, §12.13 lines 1701–1703; `ENUM_REGISTRY.md` line 221). `REPORT_EXPORT` is idempotency-only in backend (`_IDEMPOTENCY_ONLY_ACTIONS`, not `_QUOTA_ENFORCED_ACTIONS` in `quota_service.py` lines 32–36) — re-download unlimited; first export per version is idempotent. |
| **4d** | **Growth/Free reports = 0** | **ABSENT** | Mirror pricing doc has no plan-level M&E allowance lines. | Canonical: Free/Growth `M&E reports: Not available` (`PRICING_AND_ENTITLEMENTS.md` lines 10, 23); API §4 `reports.limit = 0` with `403 UPGRADE_REQUIRED` on entry. |

---

## 4. Retired-path check (`donor-reports`)

| Location searched | `donor-reports` / `donor_reports` present? |
|-------------------|---------------------------------------------|
| `ngoinfo-grantpilot-frontend/docs/contracts/` (all files) | **No** |
| Canonical (for reference) | Only appears in explicit retirement note: "no `donor-reports` path segment" (`API_CONTRACT.md` line 1148) |

Mirror does not reintroduce retired paths; it simply lacks the canonical `/api/reports/…` surface altogether.

---

## 5. Mirror inventory (context)

Files present under `ngoinfo-grantpilot-frontend/docs/contracts/`:

| File | M&E-relevant? | Notes |
|------|---------------|-------|
| `API_CONTRACT.md` | **Yes — stale/absent §12** | Missing ~554 lines vs canonical; last synced pre-M&E (changelog stops 2026-03-16) |
| `PRICING_AND_ENTITLEMENTS.md` | **Yes — stale** | Impact fit_scans 20→should be 10; no M&E plan lines |
| `ARTEFACTS_V1_LOCKED.md` | No | Same byte size as canonical copy |
| `BRAND_AND_FRONTEND_SPEC.md` | No | |
| `FRONTEND_ARCHITECTURE_SPEC.md` | Possibly | Not compared in this pass (out of B-00 surface fence) |
| `frontend_dev.md` | Possibly | Frontend-specific; not backend canonical mirror |
| `GUARDRAILS_RUNTIME_AND_SECURITY.md` | No | |

No `me_module/` subtree under `docs/contracts/`.

---

## 6. Bottom line

**The frontend contract mirror is not safe to build M&E work (B-01 onward) against as-is.** The workspace root (`frontend/`) does not even contain a `docs/contracts/` tree; the only mirror (`ngoinfo-grantpilot-frontend/docs/contracts/`) predates the 2026-05-24 M&E Stage B lock: entire §12 M&E API surface and §10.3 `UPGRADE_REQUIRED` are missing, §4 entitlements and §10.2 quota shapes omit `reports`/`report_exports`, and pricing still documents Impact fit scans as 20/month with no M&E report allowances. Backend canonical is directly reachable at `../docs/artefacts/` for an in-repo re-sync in B-00b before any contract-driven frontend implementation proceeds.

---

*End of B-00 findings. No source files modified except this document.*
