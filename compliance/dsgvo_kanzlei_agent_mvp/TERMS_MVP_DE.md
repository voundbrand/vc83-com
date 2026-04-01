# Nutzungsbedingungen MVP (Deutsch)

Status: Arbeitsentwurf fuer `KAMVP-005`  
Stand: 2026-03-25  
Geltung: Kanzlei-Agent MVP auf `vc83-com`

## 1. Vertragsgegenstand

Diese Nutzungsbedingungen regeln den Zugang zu und die Nutzung der MVP-Plattformfunktionen fuer den Kanzlei-Agent.

Der Leistungsumfang ist auf die aktuell produktiv aktivierten Funktionen beschraenkt, insbesondere:

1. konfigurierbare Agenten- und Kanalnutzung (`convex/ai/agentExecution.ts`, `convex/ai/agentToolOrchestration.ts`)
2. genehmigungspflichtige externe Aktionen im Fail-Closed-Modus (`convex/ai/agentSpecRegistry.ts`, `convex/ai/skills/index.ts`)
3. strukturierte Audit- und Compliance-Protokollierung (`convex/compliance.ts`)

## 2. Rollenmodell und Verantwortlichkeiten

1. Der Anbieter stellt die technische Plattform bereit.
2. Die Kanzlei bleibt fuer Inhalte, fachliche Freigaben und rechtliche Bewertung verantwortlich.
3. Berufstraegerpflichtige Endentscheidungen duerfen nicht an den Agenten delegiert werden.

## 3. Leistungsgrenzen im MVP

Die Nutzung ist auf den dokumentierten MVP-Rahmen begrenzt:

1. Keine autonome externe Offenlegung ohne menschliche Freigabe.
2. Keine verbindliche Rechts- oder Steuerberatung durch den Agenten.
3. Keine Nutzung unfreigegebener externer Tools fuer sensible Kanzleiinhalte.
4. Fail-Closed-Verhalten bei fehlender Freigabe, fehlender Policy-Zuordnung oder blockierter Tool-Berechtigung.

## 4. Zulassige und unzulaessige Nutzung

Zulaessig:

1. interne Entwurfs- und Strukturierungsunterstuetzung
2. vorbereitende Intake- und Routingablaeufe mit Human-in-the-Loop
3. dokumentierte Nutzung innerhalb der freigeschalteten Kanal- und Toolkonfiguration

Unzulaessig:

1. Umgehung von Freigabe- oder Auditkontrollen
2. Eingabe von Daten ohne erforderliche Rechtsgrundlage
3. produktiver Einsatz mit ungeprueften Subprozessoren oder offenen Transfer-Blockern
4. missbraeuchliche, rechtswidrige oder sicherheitsgefaehrdende Nutzung

## 5. Daten, Vertraulichkeit und AVV-Bezug

1. Die Verarbeitung personenbezogener Daten richtet sich nach `PRIVACY_POLICY_MVP_DE.md`.
2. Fuer Auftragsverarbeitung, Geheimnisschutz und Dienstleistereinsatz gelten die AVV-/DPA-Regelungen in `DPA_AVV_MVP_DE.md`.
3. Anbieter- und Transferentscheidungen gelten nur im jeweils dokumentierten Freigabestatus (`AVV_62A_CHECKLIST.md`, `TRANSFER_IMPACT_REGISTER.md`).

## 6. Human Approval und Externe Kommunikation

Fuer MVP-Kanzlei-Nutzung gilt:

1. Externe Versand-/Dispatch-Aktionen sind standardmaessig genehmigungspflichtig.
2. Nicht explizit freigegebene externe Toolpfade bleiben blockiert.
3. Jede blockierte oder freigegebene relevante Aktion muss auditierbar sein.

## 7. Verfuegbarkeit, Support und Incident-Pflichten

1. Der MVP wird ohne zugesicherte durchgaengige Verfuegbarkeit bereitgestellt.
2. Betriebs- und Eskalationsablaeufe folgen `INCIDENT_RUNBOOK.md`.
3. Betroffenenanfragen und operative Datenschutzablaeufe folgen `DSR_RUNBOOK.md`.

## 8. Haftung (MVP-Rahmen)

1. Unbeschraenkte Haftung fuer Vorsatz, grobe Fahrlaessigkeit sowie fuer Verletzung von Leben, Koerper, Gesundheit und nach zwingendem Produkthaftungsrecht.
2. Bei leichter Fahrlaessigkeit nur Haftung bei Verletzung wesentlicher Vertragspflichten; begrenzt auf den vertragstypisch vorhersehbaren Schaden.
3. Soweit rechtlich zulaessig, keine Haftung fuer indirekte Schaeden, Folge- oder Ausfallschaeden ausserhalb zwingender Haftungsfaelle.

## 9. Laufzeit und Beendigung

1. Die Nutzung kann gemaess vereinbartem Tarif/Vertrag beendet werden.
2. Der Anbieter kann den Zugang bei schwerwiegenden Verstoessen oder Sicherheitsrisiken sperren oder kuendigen.
3. Nach Beendigung gelten vertragliche Aufbewahrungs- und Loeschpflichten gemaess Datenschutz- und Vertragsdokumentation.

## 10. Schlussbestimmungen

1. Es gilt deutsches Recht.
2. Gegenueber Kaufleuten kann ein deutscher Gerichtsstand vereinbart werden.
3. Aenderungen dieser Bedingungen werden dokumentiert und versioniert bereitgestellt.

---

## Offene Punkte-Register (`KAMVP-005`)

1. `TODO-KAMVP-005-001`: finale Vertragspartei (Firmierung/Anschrift) aus produktivem Impressum/Vertrag uebernehmen.
2. `TODO-KAMVP-005-002`: kommerzielle Konditionen (Tarif, Laufzeit, Abrechnung) aus finalem Angebotsmodell ergaenzen.
3. `TODO-KAMVP-005-003`: finale Gerichtsstands-/Verbraucherregelung mit Legal abgleichen.
4. `TODO-KAMVP-005-004`: verbindliche SLA-/Supportzeiten vertraglich referenzieren oder explizit ausschliessen.
