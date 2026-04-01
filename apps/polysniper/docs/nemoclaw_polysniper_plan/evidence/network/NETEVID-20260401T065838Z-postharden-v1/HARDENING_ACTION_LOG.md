# VPS Hardening Action Log

- Timestamp (UTC): `2026-04-01T06:58:59Z`
- Target: `root@187.124.179.41`
- Objective: move staging VPS to key-based SSH access and deny-by-default host firewall profile.

## Actions Applied

1. Installed dedicated key on host: `~/.ssh/hostinger-psnp-hardening.pub` into `/root/.ssh/authorized_keys`.
2. Updated SSH daemon policy:
   - `PermitRootLogin prohibit-password`
   - `PasswordAuthentication no`
   - `PubkeyAuthentication yes`
3. Reloaded SSH daemon after `sshd -t` syntax validation.
4. Enabled UFW with explicit policy:
   - default incoming: `deny`
   - default outgoing: `allow`
   - allow rule: `22/tcp`

## Validation Outcomes

1. Key login validation: `PASS` (`KEY_LOGIN_STILL_WORKS` observed).
2. Password login validation: `PASS` (password-based SSH attempt denied).
3. Local probe profile (`expected-open=22`):
   - open: `22`
   - unexpected open: `none`
4. Remote evidence snapshot:
   - `PasswordAuthentication no`
   - `PermitRootLogin prohibit-password`
   - UFW `active` with deny-by-default policy and only `22/tcp` allowed inbound.

## Evidence Files

1. `NETWORK_HARDENING_EVIDENCE.json`
2. `NETWORK_HARDENING_EVIDENCE.md`

