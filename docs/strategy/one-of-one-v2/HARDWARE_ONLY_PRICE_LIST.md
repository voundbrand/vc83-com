# Private LLM Infrastructure — Hardware-Only Price List

> **Seven Layers | Bill of Materials**
> **Date:** March 2026
> **Baseline:** Apple Mac Studio M3 Ultra, Thunderbolt 5 RDMA clustering (EXO Labs)

---

## Starter — 1 Node

| Item | Spec | Unit Price | Qty | Subtotal |
|---|---|---|---|---|
| Mac Studio M3 Ultra | 28-core CPU, 60-core GPU, 256GB unified memory, 2TB SSD | $5,800 | 1 | $5,800 |
| UPS (battery backup) | 600VA, pure sine wave | $150 | 1 | $150 |
| **Hardware Total** | | | | **$5,950** |

**Capability:** 70B quantized model, ~30 tok/s, 1–2 concurrent sessions, 1–5 users

---

## Growth — 4-Node RDMA Cluster

| Item | Spec | Unit Price | Qty | Subtotal |
|---|---|---|---|---|
| Mac Studio M3 Ultra | 28-core CPU, 60-core GPU, 256GB unified memory, 2TB SSD | $5,800 | 4 | $23,200 |
| OWC Thunderbolt 5 Hub | 5-port, 80 Gb/s, RDMA-capable | $330 | 2 | $660 |
| Thunderbolt 5 cables | 0.8m active cables | $70 | 6 | $420 |
| 10GbE managed switch | 8-port, for management/monitoring traffic | $250 | 1 | $250 |
| Rack shelf / mount | 2U ventilated shelf | $120 | 2 | $240 |
| UPS | 1500VA rack-mount, pure sine wave | $450 | 1 | $450 |
| **Hardware Total** | | | | **$25,220** |

**Capability:** 1TB pooled memory, 70B full precision, ~60–90 tok/s aggregate, 8–15 concurrent sessions, 10–50 users

---

## Enterprise — 10-Node RDMA Cluster + Hot Spare

| Item | Spec | Unit Price | Qty | Subtotal |
|---|---|---|---|---|
| Mac Studio M3 Ultra | 28-core CPU, 60-core GPU, 256GB unified memory, 2TB SSD | $5,800 | 10 | $58,000 |
| Mac Studio M3 Ultra (hot spare) | Pre-configured spare | $5,800 | 1 | $5,800 |
| OWC Thunderbolt 5 Hub | 5-port, 80 Gb/s, RDMA-capable | $330 | 6 | $1,980 |
| Thunderbolt 5 cables | 0.8m active cables | $70 | 20 | $1,400 |
| 10GbE managed switch | 16-port, VLAN support | $500 | 1 | $500 |
| Network rack | 12U floor-standing, ventilated, locking | $600 | 1 | $600 |
| Rack shelves | 2U ventilated | $120 | 5 | $600 |
| UPS system | 3000VA rack-mount, network management card | $1,200 | 2 | $2,400 |
| IP-based KVM | Remote management | $400 | 1 | $400 |
| **Hardware Total** | | | | **$71,680** |

**Capability:** 2.5TB pooled memory, 405B+ full precision, ~200–300 tok/s aggregate, 50–75 concurrent sessions, up to 500 users

---

## Quick Comparison

| | Starter | Growth | Enterprise |
|---|---|---|---|
| Mac Studios | 1 | 4 | 10 + 1 spare |
| Unified memory | 256 GB | 1 TB | 2.5 TB |
| Model class | 70B quantized | 70B full / 235B quantized | 405B+ full precision |
| Throughput | ~30 tok/s | ~60–90 tok/s | ~200–300 tok/s |
| Power draw | ~120 W | ~450 W | ~1,200 W |
| **Hardware cost** | **$5,950** | **$25,220** | **$71,680** |

---

*Hardware prices based on Apple retail (March 2026). Networking and peripherals at standard IT distributor pricing. Does not include setup services, software configuration, platform integration, or support contracts.*
