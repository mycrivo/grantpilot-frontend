# NGOInfo GrantPilot Frontend

GrantPilot frontend (Next.js) for NGOInfo.org — contract-governed against backend.

## Contract References

- `docs/contracts/FRONTEND_ARCHITECTURE_SPEC.md`
- `docs/contracts/API_CONTRACT.md`
- `docs/contracts/GUARDRAILS_RUNTIME_AND_SECURITY.md`
- `docs/contracts/BRAND_AND_FRONTEND_SPEC.md`
- `docs/contracts/PRICING_AND_ENTITLEMENTS.md`
- `docs/contracts/ARTEFACTS_V1_LOCKED.md`

## Stop Conditions

- If UI conflicts with `API_CONTRACT.md` -> STOP.
- If auth flow conflicts with `GUARDRAILS_RUNTIME_AND_SECURITY.md` -> STOP.
- If layout conflicts with `FRONTEND_ARCHITECTURE_SPEC.md` -> STOP.
- If brand usage conflicts with `BRAND_AND_FRONTEND_SPEC.md` -> STOP.
- If pricing/plan display conflicts with `PRICING_AND_ENTITLEMENTS.md` -> STOP.

## Deployment

Frontend must be deployed as separate Railway service from backend.
