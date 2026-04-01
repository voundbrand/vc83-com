# Hetzner Production Baseline (Single-Tenant)

Snapshot date: 2026-03-27
Scope: first customer production baseline for NemoClaw/OpenClaw legal-intake MVP.

## Locked policy

1. Current server `sevenlayers-legal-eu` stays `staging`.
2. Production runs on separate server(s) from staging.
3. Initial customer production is `single-tenant`: one customer per production server/environment.

## Exact production baseline (first customer)

Use this profile for the first customer production environment:

1. Location: `NBG1` (Nuernberg, Germany).
2. OS image: `Ubuntu 24.04 LTS` (plain OS image, no prebuilt Docker app image).
3. Compute: `8 vCPU`.
4. Memory: `16 GB RAM`.
5. Root disk: `>=160 GB NVMe`.
6. Swap: `16 GB`.
7. Backups: `enabled` (Hetzner backup option).
8. Public ingress: `443` only for app, `22` for admin, no public `18789`.

Upgrade trigger:
1. If sustained memory use > 75% or OOM occurs under call load, move to `16 vCPU / 32 GB RAM`.

## Naming convention

Use one stable pattern everywhere:

1. Server name: `nclaw-prod-<customer-slug>-de-01`.
2. Firewall name: `fw-nclaw-prod-<customer-slug>-v1`.
3. Network name: `net-nclaw-prod-<customer-slug>-v1`.
4. Backup policy label: `bkp-nclaw-prod-<customer-slug>-daily`.
5. SSH key label: `ssh-nclaw-prod-<customer-slug>-admin`.

Example for first customer:
1. `nclaw-prod-schroeder-partner-de-01`
2. `fw-nclaw-prod-schroeder-partner-v1`
3. `net-nclaw-prod-schroeder-partner-v1`

## Firewall baseline (Hetzner Cloud Firewall)

Inbound rules:

1. `TCP 22` from admin sources.
2. `TCP 443` from `Any IPv4` and `Any IPv6`.
3. `TCP 80` from `Any IPv4` and `Any IPv6` (ACME/redirect only).
4. `ICMP` from `Any IPv4` and `Any IPv6`.
5. Deny all other inbound traffic.

Outbound rules (strict baseline):

1. `TCP/UDP 53` (DNS).
2. `UDP 123` (NTP).
3. `TCP 443` (OpenRouter, ElevenLabs, package repos, OCI registries).
4. `TCP 80` (package repo fallback).
5. Deny all other outbound traffic.

Notes:
1. If your admin IP is dynamic, keep `TCP 22` temporarily open and enforce SSH hardening (`keys only`, `fail2ban`, no password auth).
2. When a stable admin egress path exists (VPN or fixed office egress), restrict `TCP 22` to that CIDR.

## Day-0 server bootstrap (prod)

Run on fresh server after first SSH login:

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg git ufw fail2ban docker.io docker-compose
systemctl enable --now docker

# swap
fallocate -l 16G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=16384
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

# ssh hardening
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh || systemctl restart sshd
systemctl enable --now fail2ban
```

## Production readiness checks (must pass)

1. `docker ps` works.
2. `ss -ltnp` shows no public bind on `18789`.
3. `nemoclaw <customer-sandbox> status` reports healthy.
4. SSH key-only auth works from admin workstation.
5. Backup restore test recorded before customer cutover.

## Rollout pattern

1. `staging` on current box: integration and regression only.
2. `prod` per customer: deploy from tagged fork release.
3. Cutover only after `NCLAW-011` release gate package is signed.
