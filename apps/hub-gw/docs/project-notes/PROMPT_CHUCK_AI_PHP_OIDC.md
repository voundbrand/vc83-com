# Prompt For Chuck's AI (PHP OIDC / Member Sync) - Redirects Already Verified

Use this prompt in Chuck's AI tool:

```text
Du bist Senior PHP/OIDC Engineer und sollst eine bestehende Auth-Implementierung (wahrscheinlich PHP League OAuth2 Server) konkret analysieren und korrigieren.

WICHTIGER KONTEXT (bereits verifiziert am 2026-03-28):
- Auth Server: https://auth.gruendungswerft.com
- Diese 3 Clients + Redirects sind bereits aktiv (Authorize liefert 302 auf /login, kein redirect_uri Fehler):
  - hub -> https://sevenlayers.ngrok.pizza/api/auth/callback/gruendungswerft
  - hub_production -> https://app.l4yercak3.com/api/auth/callback/gruendungswerft
  - hub_prod_2 -> https://app.sevenlayers.io/api/auth/callback/gruendungswerft

Aktuelles Problem:
- Nach erfolgreichem Authorize/Login scheitert der Token Exchange mit:
  {"error":"invalid_client","error_description":"Client authentication failed"}

Ziel:
- invalid_client zuverlässig beheben
- finalen OIDC Contract sauber dokumentieren
- API-Contract für Member/Company-Sync definieren

Bitte liefere:

1) Root-Cause Analyse für invalid_client
- Prüfe, ob client_id/client_secret je Client korrekt geladen werden.
- Prüfe, ob Secrets gehasht/verschlüsselt gespeichert sind und korrekt verglichen werden.
- Prüfe, ob Client-Auth-Methode am Token-Endpoint mit Integrator übereinstimmt:
  - client_secret_post oder
  - client_secret_basic
- Gib eindeutig an, welche Methode final unterstützt wird.

2) OIDC Token Endpoint Contract (verbindlich)
- grant_type=authorization_code
- PKCE S256
- id_token im Token-Response
- claims: stabiler subject-claim (sub oder expliziter alternativer claim), email-claim, verified-email-claim

3) Konkrete Korrekturmaßnahmen im PHP-Stack
- Nenne konkrete Dateien/Module/Klassen, die angepasst werden müssen.
- Gib minimale Codeänderungen (diff-orientiert), keine generischen Erklärungen.
- Keine Secrets im Klartext ausgeben.

4) Member Sync API Contract (nächster Integrationsschritt)
- GET /api/member/me
  Minimum:
  {
    "id": "<stable-member-id>",
    "email": "<email>",
    "email_verified": true,
    "name": "<display-name>",
    "updated_at": "<iso8601-or-epoch>"
  }
- GET /api/member/me/companies
  Minimum:
  [
    {
      "company_id": "<stable-company-id>",
      "name": "<company-name>",
      "role": "<owner|admin|member>",
      "status": "<active|inactive|pending>",
      "updated_at": "<iso8601-or-epoch>"
    }
  ]

5) Deterministische Tests
- Gib curl-Kommandos + erwartete Ergebnisse für:
  - token exchange success pro Client
  - token exchange invalid_client negative test
  - /api/member/me
  - /api/member/me/companies (inkl. multi-company user)

Output-Format:
- Abschnitt A: Root Cause
- Abschnitt B: Konkrete Fixes
- Abschnitt C: Finaler OIDC Contract
- Abschnitt D: Member Sync API Contract
- Abschnitt E: Test Commands + Expected Results
- Abschnitt F: Offene Risiken

Constraints:
- Bestehendes Verhalten außerhalb des Fix-Scopes nicht ändern.
- Wenn Annahmen nötig sind: separat als "Annahmen" markieren.
```

