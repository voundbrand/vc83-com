# PSNP-030 Preflight Notes

- Run ID: `STGBOOT-20260328T132406Z-preflight`
- Queue row: `PSNP-030`
- Scope: non-destructive readiness checks only (no VPS purchase call, no deploy mutation)

## Results

- Existing VPS instances: `0`
- Payment methods available: `2` (default method present)
- Selected price item: `hostingerde-vps-kvm2-eur-1m`
- Selected region/datacenter: `bos` / `17`
- Selected template: `Ubuntu 24.04 LTS` / `1077`
- Selected hostname: `psnp-stg-bos-01`

## Blocker

- `BLK-PSNP-030-01`: explicit spend approval required before running paid Hostinger provisioning and staging deploy sequence.
