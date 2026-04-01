# Gründungswerft OIDC + Member Sync Requirements (Hub-GW)

Date: 2026-03-28  
Owner: Sevenlayers / Hub-GW  
Audience: Chuck (Gründungswerft)

## 1. Ziel

Hub-GW nutzt OIDC für Login.  
Profile und Mitgliedschaften sollen perspektivisch aus `member.gruendungswerft.com` kommen (Source of Truth), während Hub-GW diese Daten deterministisch in das Plattformmodell synchronisiert.

## 2. OIDC Requirements (jetzt)

### 2.1 Redirect URIs (bitte aktiv)

1. `https://sevenlayers.ngrok.pizza/api/auth/callback/gruendungswerft` (Dev/Test)
2. `https://app.l4yercak3.com/api/auth/callback/gruendungswerft` (Prod 1)
3. `https://app.sevenlayers.io/api/auth/callback/gruendungswerft` (Prod 2)

### 2.2 Claims / Identity Contract

1. Stabiler Subject-Claim (bevorzugt `sub`, alternativ explizit dokumentierter Claim), niemals recycled.
2. Email-Claim (bevorzugt `email`).
3. Verified-Email-Claim (bevorzugt `email_verified`, boolean).
4. `id_token` muss im Token-Response enthalten sein.

### 2.3 Token Endpoint Contract

1. `authorization_code` Grant.
2. PKCE (`S256`) aktiv.
3. Bitte Client-Auth-Methode klar bestätigen:
   - `client_secret_post` oder
   - `client_secret_basic`

## 3. Member Sync Requirements (nächster Schritt)

Für Multi-Unternehmen pro Person brauchen wir eine API-basierte Synchronisierung.

### 3.1 Pflicht-Endpunkte

1. `GET /api/member/me`
2. `GET /api/member/me/companies`

### 3.2 Erwartete Datenfelder

#### `GET /api/member/me`

1. `id` (stabile externe Member-ID)
2. `email`
3. `email_verified`
4. `name` (oder `firstname` + `lastname`)
5. `updated_at` (ISO oder epoch ms)

#### `GET /api/member/me/companies`

1. `company_id` (stabile externe Company-ID)
2. `name`
3. `role` (z. B. owner/member/admin)
4. `status` (active/inactive/pending)
5. `updated_at`

## 4. Betriebsmodell (deterministisch)

1. Hub-GW Login via OIDC.
2. Profil bearbeiten nur extern: Link auf `member.gruendungswerft.com`.
3. Sync-Auslöser:
   - nach erfolgreichem Login,
   - manuell per "Jetzt aktualisieren",
   - periodischer Reconcile-Job.
4. Idempotente Upserts mit stabilen externen IDs (`member_id`, `company_id`).
5. Eine Person kann mehreren Unternehmen zugeordnet sein; Hub-GW benötigt aktiven Company-Kontext + Umschalter.

## 5. Akzeptanzkriterien

1. Ein Login erzeugt keinen Duplikat-User bei wiederholtem Sync.
2. Mehrere Companies eines Members erscheinen konsistent in Hub-GW.
3. Änderungen in `member.gruendungswerft.com` sind nach Sync sichtbar.
4. Keine Cross-Company-Datenlecks beim Kontextwechsel.
5. Ergebnis ist deterministisch bei wiederholten Läufen mit identischem Input.

