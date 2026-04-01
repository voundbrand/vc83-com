# STGBOOT-20260328T141334Z-v1 Summary

- Queue row: `PSNP-030`
- VPS: `id=1536978`, `plan=KVM 2`, `ipv4=187.124.179.41`, `template=Ubuntu 24.04 LTS`
- Deployment root: `/opt/polysniper/server`
- Runtime mode: `staging_synth`
- Container: `polysniper-server-staging` (`healthy`)

## Validation

- `GET /healthz` returned: `{"ok":true,"service":"polysniper-server"}`
- `GET /v1/status` reports mode `staging_synth` with kill switch `false`

## Notable fixes during bootstrap

1. Build context mismatch fixed by using compose build `context: ..` with `dockerfile: server/Dockerfile`.
2. Volume write permission issue fixed by host-side `chown` to container user (`uid=100 gid=101`).
