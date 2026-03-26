# DSGVO Kanzlei-Agent MVP

Ziel dieses Ordners: ein schlankes, operatives Compliance-Set fuer den MVP eines Kanzlei-Agenten.

## Dateien

- `MVP_AGENT_POLICY.md` - verbindliche Betriebsregeln fuer den Agenten
- `GO_LIVE_CHECKLIST.md` - Go/No-Go Checkliste vor Produktivstart
- `AVV_62A_CHECKLIST.md` - Anbieter- und Dienstleisterpruefung (DSGVO Art. 28 + StBerG §62a)
- `TASK_QUEUE.md` - deterministische Queue-First Aufgabensteuerung
- `SESSION_PROMPTS.md` - lane-spezifische Ausfuehrungsprompts und Gating
- `MASTER_PLAN.md` - vollstaendiger Implementierungsplan mit Risiken und Exit-Kriterien
- `INDEX.md` - Workstream-Status, Lane-Board und Schnellnavigation
- `existing-docs/` - bestehende Vertrags-/Policy-Dokumente als Quellenmaterial

## Nutzung

1. `MVP_AGENT_POLICY.md` auf euren aktuellen Agenten-Scope mappen.
2. `AVV_62A_CHECKLIST.md` fuer jeden externen Dienstleister ausfuellen.
3. `GO_LIVE_CHECKLIST.md` vollstaendig auf `erfuellt` setzen.
4. Umsetzung ausschliesslich ueber `TASK_QUEUE.md` steuern.
5. Vor jedem Milestone `npm run docs:guard` ausfuehren.
6. Erst danach Produktivschaltung mit Mandatsdaten.

## Geltungsbereich

Dieses Set ist fuer MVP-Betrieb mit Human-in-the-loop gedacht. Es ersetzt keine individuelle Rechtsberatung.
