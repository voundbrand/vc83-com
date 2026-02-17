# Custom OAuth Integration - Benötigte Informationen

Hi Chuck,

um die Mitglieder-Anmeldung über euer Intranet einzurichten, brauche ich ein paar Infos von euch.

---

## 1. OAuth System

Welches System nutzt ihr für die Anmeldung?

- [ ] **Keycloak**
- [ ] **Azure AD / Microsoft Entra ID**
- [ ] **Auth0**
- [ ] **Okta**
- [ ] **Custom OAuth Server**
- [ ] **Anderes:** ___________________

---

## 2. OAuth Zugang einrichten

Um die Benefits-Plattform mit eurem System zu verbinden, brauchen wir:

### Option A: Discovery URL (am einfachsten)

Falls ihr eine habt, das ist alles was wir brauchen:

```
https://___________________/.well-known/openid-configuration
```

### Option B: Einzelne URLs

Falls keine Discovery URL:

```
Login URL:      https://___________________
Token URL:      https://___________________
User Info URL:  https://___________________ (optional)
```

### Zugangsdaten

Nach der Registrierung der Benefits-Plattform in eurem System:

- **Client ID:** ___________________
- **Client Secret:** ___________________

**Redirect URLs für die Registrierung:**
- Production: `https://benefits.gruendungswerft.de/api/auth/callback/gruendungswerft`
- Development: `http://localhost:3000/api/auth/callback/gruendungswerft`

---

## 3. User-Daten Format

**Wichtig:** Bitte ein echtes Beispiel von euren User-Daten geben (mit Dummy-Daten):

```json
{
  // Beispiel - bitte durch eure echten Felder ersetzen:
  "id": "...",
  "email": "...",
  "name": "...",
  // ... was auch immer euer System zurückgibt
}
```

**Oder:** Screenshot vom User-Objekt / API Response

**Mindestens brauchen wir:**
- ✅ User ID (irgendeine eindeutige ID)
- ✅ E-Mail-Adresse
- ⭕ Name (optional, aber hilfreich)

---

## Wie es funktioniert

```
1. Mitglied klickt "Login" auf Benefits-Plattform
2. → Weiterleitung zu eurem Intranet
3. → Mitglied loggt sich dort ein
4. → Zurück zur Benefits-Plattform
5. → Fertig! Mitglied ist eingeloggt
```

Keine separate Registrierung nötig - alles läuft über euer System.

---

## Das war's!

Sobald ich diese Infos habe, kann ich das direkt konfigurieren und wir können testen.

Bei Fragen einfach melden!

Grüße,
Remington

---

---

# Custom OAuth Integration - Information Needed (English)

Hi Chuck,

To set up member login via your intranet, I need a few details from you.

---

## 1. OAuth System

What system do you use for authentication?

- [ ] **Keycloak**
- [ ] **Azure AD / Microsoft Entra ID**
- [ ] **Auth0**
- [ ] **Okta**
- [ ] **Custom OAuth Server**
- [ ] **Other:** ___________________

---

## 2. OAuth Setup

To connect the benefits platform with your system, we need:

### Option A: Discovery URL (easiest)

If you have one, that's all we need:

```
https://___________________/.well-known/openid-configuration
```

### Option B: Individual URLs

If no discovery URL:

```
Login URL:      https://___________________
Token URL:      https://___________________
User Info URL:  https://___________________ (optional)
```

### Credentials

After registering the benefits platform in your system:

- **Client ID:** ___________________
- **Client Secret:** ___________________

**Redirect URLs for registration:**
- Production: `https://benefits.gruendungswerft.de/api/auth/callback/gruendungswerft`
- Development: `http://localhost:3000/api/auth/callback/gruendungswerft`

---

## 3. User Data Format

**Important:** Please provide a real example of your user data (with dummy values):

```json
{
  // Example - please replace with your actual fields:
  "id": "...",
  "email": "...",
  "name": "...",
  // ... whatever your system returns
}
```

**Or:** Screenshot of the user object / API response

**Minimum requirements:**
- ✅ User ID (any unique identifier)
- ✅ Email address
- ⭕ Name (optional but helpful)

---

## How It Works

```
1. Member clicks "Login" on benefits platform
2. → Redirect to your intranet
3. → Member logs in there
4. → Back to benefits platform
5. → Done! Member is logged in
```

No separate registration needed - everything goes through your system.

---

## That's It!

Once I have this info, I can configure it right away and we can test.

Let me know if you have questions!

Thanks,
Remington
