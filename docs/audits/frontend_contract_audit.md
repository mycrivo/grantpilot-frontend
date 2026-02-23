# Frontend Contract Audit (A-1 through C-1)

Date: 2026-02-23  
Scope: `ngoinfo-grantpilot-frontend` only  
Authorities checked:
- `docs/contracts/API_CONTRACT.md` (latest committed with `docs/contracts/frontend_dev.md` in `7ed5bb6`)
- `docs/contracts/frontend_dev.md` (A-1 through C-1 + B-2 expectations)

## 1) API Call Site Inventory

| File (line) | Method + Path in code | Expected contract endpoint | Contract section | Match |
|---|---|---|---|---|
| `app/(public)/login/page.tsx` (50-54) | `GET /api/auth/google/start` | `GET /api/auth/google/start` | 3.1 | Yes |
| `app/(public)/login/page.tsx` (74-81) | `POST /api/auth/magic-link/request` | `POST /api/auth/magic-link/request` | 3.4 | Yes |
| `app/(public)/auth/callback/page.tsx` (51-57) | `POST /api/auth/exchange` | `POST /api/auth/exchange` | 3.3 | Yes |
| `app/(public)/auth/magic-link/page.tsx` (57-63) | `POST /api/auth/magic-link/consume` | `POST /api/auth/magic-link/consume` | 3.5 | Yes |
| `components/auth/AuthProvider.tsx` (73-80) | `POST /api/auth/logout` | `POST /api/auth/logout` | 3.7 | Yes |
| `lib/api-client.ts` (104-108) | `POST /api/auth/refresh` | `POST /api/auth/refresh` | 3.6 | Yes |
| `lib/api/ngoProfile.ts` (59) | `GET /api/ngo-profile` | `GET /api/ngo-profile` | 6.1 | Yes |
| `lib/api/ngoProfile.ts` (63-66) | `POST /api/ngo-profile` | `POST /api/ngo-profile` | 6.2 | Yes |
| `lib/api/ngoProfile.ts` (70-73) | `PUT /api/ngo-profile` | `PUT /api/ngo-profile` | 6.3 | Yes |
| `lib/api/ngoProfile.ts` (77) | `GET /api/ngo-profile/completeness` | `GET /api/ngo-profile/completeness` | 6.4 | Yes |
| `app/(authenticated)/fit-scan/[id]/page.tsx` (84) | `GET /api/fit-scans/{id}` | `GET /api/fit-scans/{id}` | 8.2 | Yes |
| `app/(authenticated)/fit-scan/[id]/page.tsx` (85) | `GET /api/me/entitlements` | `GET /api/me/entitlements` | 4 | Yes |
| `app/(authenticated)/proposal/new/page.tsx` (162) | `GET /api/me/entitlements` | `GET /api/me/entitlements` | 4 | Yes |
| `app/(authenticated)/proposal/new/page.tsx` (163-165) | `GET /api/fit-scans/{id}` | `GET /api/fit-scans/{id}` | 8.2 | Yes |
| `app/(authenticated)/proposal/new/page.tsx` (211-217) | `POST /api/proposals` | `POST /api/proposals` | 9.1 | Yes |

### Contract-required call site missing

| File | Missing behavior | Required endpoint | Contract section | Status |
|---|---|---|---|---|
| `app/(public)/start/page.tsx` | Opportunity validation + header context is not implemented (page is placeholder) | `GET /api/funding-opportunities/{id}` | 7.1 | **Mismatch** |
| `app/(authenticated)/proposal/new/page.tsx` | C-1 preflight does not load opportunity summary/title via opportunity endpoint or fit scan title | `GET /api/funding-opportunities/{id}` | 7.1 | **Mismatch** |

## 2) Error Handling Audit

Contract authority: Standard Error envelope requires `error_code` and `message` (optional `details`, `request_id`) per Section 1.

- Envelope parsing in `lib/api-client.ts` (3-8, 167-170) already uses `error_code`, `message`, `details`, `request_id`.
- `ErrorDisplay` reads structured fields and shows user-safe messages in `components/shared/ErrorDisplay.tsx` (1-9, 26-40, 52-60).
- `rg` audit found **no parsing of `detail` / `.detail`** in TS/TSX code.

Finding: No `{ "detail": ... }` dependency detected. Error envelope handling is mostly compliant with Section 1.

## 3) Auth Token Storage Audit

Authority: `frontend_dev.md` says no auth tokens in localStorage; tokens in React context in-memory only.

- `components/auth/AuthProvider.tsx` stores `accessToken`, `refreshToken`, `user` in React state only (37-45, 47-53).
- `rg localStorage` found **no occurrences** in frontend code.
- `sessionStorage` usage exists only in `lib/auth-intent.ts` for redirect intent / `opportunity_id` (20, 29-30, 43-44), which is allowed by `frontend_dev.md`.

Finding: No localStorage token storage found.

## 4) Proposal Status Enum Audit

Authority: allowed proposal statuses are `DRAFT`, `DEGRADED`, and `FAILED` (error-only) in Section 9 "Proposal status values"; note explicitly says `GENERATING` is not persisted.

- `rg GENERATING` found no references in TS/TSX.
- In-scope C-1 type currently uses `status: string` in `app/(authenticated)/proposal/new/page.tsx` (51), which is overly loose but not using invalid enum values directly.

Finding: No invalid `GENERATING` usage found; tighten types where touched for contract alignment.

## 5) Env Var / Base URL Audit

- `NEXT_PUBLIC_API_BASE_URL` is used in `lib/api-client.ts` (38, 104, 151).
- All API calls route through `apiRequest`, avoiding hardcoded backend hostnames.
- No hardcoded API base URLs found in frontend code.

Finding: Base URL usage is centralized and compliant.

## 6) A-1..C-1 Route Coverage vs `frontend_dev.md`

| Step | Route/component | Current state |
|---|---|---|
| A-1 | `/login`, `/auth/callback`, `/auth/magic-link`, `AuthProvider` | Implemented and roughly working |
| A-2 | Authenticated layout + guard | Implemented (`AuthGuard`, `(authenticated)/layout.tsx`) |
| A-3 | Shared primitives (`ErrorDisplay`, `LoadingSkeleton`, `StatusBadge`, `QuotaGate`) | Implemented baseline |
| B-1 | `/profile` create/update/completeness | Implemented and wired to profile endpoints |
| B-2 | `/start` handoff + validation + fit scan initiation | **Missing / broken** (`app/(public)/start/page.tsx` is placeholder only) |
| B-3 | `/fit-scan/[id]` result page | Implemented, but header misses `opportunity_title` binding |
| C-1 | `/proposal/new` generation page | Implemented, but preflight/header does not use opportunity endpoint/title per spec |

## 7) `opportunity_title` Display Audit

Contract response fields:
- Fit Scan detail includes `opportunity_title` (Section 8.1 / 8.2 payload shape).
- Proposal create/detail/list include `opportunity_title` (Sections 9.1, 9.2, 9.3).
- Opportunity summary endpoint returns `funding_opportunity.title` (Section 7.1).

Findings:
- `app/(authenticated)/fit-scan/[id]/page.tsx` fetches fit scan but does not display `opportunity_title` in the page header (**missing B-3 binding**).
- `app/(authenticated)/proposal/new/page.tsx` currently uses query param `opportunity_title` fallback and ID suffix, not contract-backed title from Section 7.1 or fit scan response (**missing C-1 binding**).

## 8) Patch Scope (A-1..C-1 only)

Required fixes from this audit:
1. Implement B-2 `/start` flow with `GET /api/funding-opportunities/{id}` validation and header context (Section 7.1).
2. Ensure `/start` enforces auth handoff + profile completeness + quota + fit scan initiation using contract endpoints (Sections 4, 6.4, 8.1).
3. Bind `opportunity_title` on B-3 fit scan result header (Sections 8.1/8.2).
4. Bind opportunity title on C-1 proposal generation preflight header using Section 7.1 endpoint (or fit scan response fallback).

