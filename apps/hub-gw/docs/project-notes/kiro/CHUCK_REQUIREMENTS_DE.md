# Gründungswerft OAuth Server - Erforderliche Informationen

**Projekt:** Benefits & Provisionsplattform
**Domain:** provision.gruendungswerft.com
**Datum:** Dezember 2024

---

## 👋 Hallo Chuck!

Danke, dass du den OAuth-Server aufgesetzt hast! Damit wir die Benefits-Plattform an dein OAuth-System anbinden können, brauchen wir ein paar Informationen von deinem PHP League OAuth Server.

---

## 🔑 1. OAuth Client Credentials

Bitte erstelle eine neue OAuth-Anwendung für die Benefits-Plattform:

**Anwendungsname:** Gründungswerft Benefits & Provisionsplattform

**Redirect URIs (wichtig!):**
```
https://provision.gruendungswerft.com/api/auth/callback/gruendungswerft
http://localhost:3000/api/auth/callback/gruendungswerft (für Entwicklung)
```

**Was wir brauchen:**
- [ ] **Client ID** (z.B. `gwapp_abc123`)
- [ ] **Client Secret** (z.B. `secret_xyz789`)

> ⚠️ **Wichtig:** Bitte das Client Secret sicher aufbewahren und uns per sicherem Kanal zusenden (nicht per WhatsApp/Email).

---

## 🌐 2. OAuth Endpoints

Dein PHP League OAuth Server stellt diese Endpoints bereit. Bitte die URLs bestätigen:

### Standard OAuth 2.0 Endpoints

```
Authorization Endpoint:
┌─────────────────────────────────────────────────────────────┐
│ https://intranet.gruendungswerft.com/oauth/authorize        │
└─────────────────────────────────────────────────────────────┘

Token Endpoint:
┌─────────────────────────────────────────────────────────────┐
│ https://intranet.gruendungswerft.com/oauth/token            │
└─────────────────────────────────────────────────────────────┘

Userinfo Endpoint:
┌─────────────────────────────────────────────────────────────┐
│ https://intranet.gruendungswerft.com/oauth/userinfo         │
│ (oder /api/user oder ähnlich)                               │
└─────────────────────────────────────────────────────────────┘
```

**Bitte ausfüllen:**

- [ ] **Authorization URL:** _______________________________________
- [ ] **Token URL:** _______________________________________
- [ ] **Userinfo URL:** _______________________________________

### Optional: Discovery Endpoint

Falls verfügbar (empfohlen):

```
┌─────────────────────────────────────────────────────────────┐
│ https://intranet.gruendungswerft.com/.well-known/           │
│                     oauth-authorization-server               │
└─────────────────────────────────────────────────────────────┘
```

- [ ] **Discovery URL:** _______________________________________

---

## 👤 3. User Profile / Userinfo Response

Wenn ein Mitglied sich einloggt, ruft unsere App den Userinfo-Endpoint auf.

**Beispiel-Antwort:**
```json
{
  "sub": "member_12345",
  "name": "Max Mustermann",
  "email": "max.mustermann@example.com",
  "member_number": "GW-2024-123"
}
```

**Fragen:**

1. **Welche Felder gibt euer Userinfo-Endpoint zurück?**

   - [ ] `sub` oder `id` (eindeutige Mitglieds-ID)
   - [ ] `name` (vollständiger Name)
   - [ ] `email` (E-Mail-Adresse)
   - [ ] `member_number` (Mitgliedsnummer)
   - [ ] Andere: _______________________________________

2. **Beispiel-Response:**

   Bitte hier eine Beispiel-Antwort von eurem Userinfo-Endpoint einfügen:

   ```json
   {
     // Beispiel hier einfügen
   }
   ```

---

## 🎯 4. OAuth Scopes

Welche Scopes (Berechtigungen) sind verfügbar?

**Standard OAuth Scopes:**
- [ ] `profile` - Zugriff auf Profilnamen
- [ ] `email` - Zugriff auf E-Mail-Adresse
- [ ] `openid` - OpenID Connect Standard

**Custom Scopes (falls vorhanden):**
- [ ] `member` - Mitgliedsinformationen
- [ ] `benefits` - Benefits lesen/erstellen
- [ ] Andere: _______________________________________

**Welche Scopes sollen wir für die Benefits-Plattform verwenden?**

Empfehlung: `profile email` (oder `openid profile email` falls OpenID Connect)

---

## 🔒 5. Sicherheitseinstellungen

### PKCE (Proof Key for Code Exchange)

Wird PKCE unterstützt? (Empfohlen für Single-Page-Apps)

- [ ] Ja, PKCE ist aktiviert
- [ ] Nein, nicht notwendig
- [ ] Weiß nicht

### Token Lifetime

Wie lange sind die Tokens gültig?

- **Access Token Lifetime:** _______ Minuten/Stunden
- **Refresh Token Lifetime:** _______ Tage (falls vorhanden)

### Allowed Origins (CORS)

Folgende Domains müssen auf dem OAuth-Server erlaubt sein:

```
https://provision.gruendungswerft.com
http://localhost:3000 (für Entwicklung)
```

- [ ] CORS ist konfiguriert für die oben genannten Domains

---

## 🧪 6. Test-Account

Für die Entwicklung brauchen wir einen Test-Account.

**Bitte erstelle:**
- [ ] Test-Mitglied mit Login-Daten
- [ ] Email: test@gruendungswerft.com (oder ähnlich)
- [ ] Passwort: (bitte per sicherem Kanal zusenden)

---

## 📋 7. Mitgliederdaten-Mapping

Welche Daten haben Mitglieder in eurem System?

**Verfügbare Felder:**

```
Basis:
- [ ] Vorname
- [ ] Nachname
- [ ] E-Mail
- [ ] Telefon
- [ ] Mitgliedsnummer

Firma/Organisation:
- [ ] Firmenname
- [ ] Branche
- [ ] Website
- [ ] Mitgliedsstatus (aktiv/inaktiv)

Adresse:
- [ ] Straße
- [ ] PLZ
- [ ] Stadt
- [ ] Land

Sonstiges:
- [ ] Profilbild/Avatar
- [ ] Bio/Beschreibung
- [ ] Social Media Links
```

---

## 🚀 8. Go-Live Checklist

Vor dem Live-Gang brauchen wir:

### Produktions-Credentials
- [ ] Client ID für Produktion
- [ ] Client Secret für Produktion
- [ ] Redirect URI registriert: `https://provision.gruendungswerft.com/api/auth/callback/gruendungswerft`

### SSL/TLS
- [ ] OAuth-Server läuft auf HTTPS
- [ ] SSL-Zertifikat ist gültig
- [ ] Keine Self-Signed Certificates

### Rate Limiting
- [ ] Rate Limits konfiguriert?
- [ ] Wie viele Requests pro Minute sind erlaubt?

### Monitoring
- [ ] Gibt es Logs für OAuth-Requests?
- [ ] Werden Failed Login Attempts geloggt?

---

## 📞 9. Support & Kommunikation

**Ansprechpartner für technische Fragen:**

- **Name:** _______________________________________
- **E-Mail:** _______________________________________
- **Telefon/WhatsApp:** _______________________________________
- **Erreichbarkeit:** _______________________________________

**Bevorzugter Kommunikationskanal für Updates:**
- [ ] WhatsApp
- [ ] E-Mail
- [ ] Slack/Discord
- [ ] Andere: _______________________________________

---

## ✅ Quick Start Checklist

Hier nochmal zusammengefasst - was wir sofort brauchen:

### Minimum (um zu starten):
1. [ ] Client ID & Client Secret
2. [ ] Authorization URL
3. [ ] Token URL
4. [ ] Userinfo URL
5. [ ] Test-Account Login-Daten

### Nice-to-have (für später):
6. [ ] Discovery URL
7. [ ] Refresh Token Support
8. [ ] Produktions-Credentials
9. [ ] Rate Limits Dokumentation

---

## 📝 Beispiel-Konfiguration

So wird die Konfiguration in unserer Next.js App aussehen:

```javascript
// provision-app/.env.local
GRUENDUNGSWERFT_CLIENT_ID=gwapp_abc123
GRUENDUNGSWERFT_CLIENT_SECRET=secret_xyz789
GRUENDUNGSWERFT_AUTHORIZATION_URL=https://intranet.gruendungswerft.com/oauth/authorize
GRUENDUNGSWERFT_TOKEN_URL=https://intranet.gruendungswerft.com/oauth/token
GRUENDUNGSWERFT_USERINFO_URL=https://intranet.gruendungswerft.com/oauth/userinfo
```

---

## 🎯 Nächste Schritte

Sobald wir diese Infos haben:

1. ✅ OAuth-Integration in Next.js implementieren (1-2 Tage)
2. ✅ Test-Login mit deinem Test-Account durchführen
3. ✅ Benefits-Plattform Prototyp aufbauen (3-5 Tage)
4. ✅ Provisionsplattform hinzufügen (2-3 Tage)
5. ✅ Go-Live mit echten Mitgliedern

**Zeitplan:** Ca. 1-2 Wochen bis zum ersten funktionierenden Prototyp

---

## ❓ Fragen?

Falls etwas unklar ist oder ihr Hilfe braucht:

- WhatsApp: Remington
- Ich kann auch direkt auf euren OAuth-Server schauen und die Infos selbst raussuchen, wenn ihr mir Zugriff gebt

---

## 📚 Ressourcen

Falls du mehr über OAuth 2.0 mit PHP League wissen möchtest:

- [PHP League OAuth Server Docs](https://oauth2.thephpleague.com/)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [NextAuth.js OAuth Provider](https://next-auth.js.org/providers/oauth)

---

**Vielen Dank, Chuck! 🚀**

Schick mir die Infos einfach per WhatsApp oder Email, dann können wir loslegen!

— Remington
