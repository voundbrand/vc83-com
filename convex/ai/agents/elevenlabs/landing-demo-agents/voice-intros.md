# Voice Intro Scripts

**Purpose:** These are the first sentences each agent speaks when a visitor presses "Hear my voice" on the landing page. They are rendered on demand via ElevenLabs TTS and served from `/api/voice-intro?agentKey={agentKey}&language={lang}`.

**Rules:**
1. Clara and Samantha must include the DSGVO / GDPR disclosure (AI identity + recording notice).
2. All other agents skip the disclosure — the caller already heard it from Clara on the phone flow, and on the landing page the written privacy note covers it.
3. Each intro should be 2–3 sentences. Short enough to feel snappy, long enough to let the visitor hear the voice and understand the role.

---

## Clara

**Role:** Concierge + virtual receptionist (public phone entry)

**EN:**
Hi, I'm Clara — your AI receptionist. This call may be recorded and shared with our service providers. I'm here to take your calls, route you to the right specialist, and make sure nothing gets missed.

**DE:**
Hallo, ich bin Clara — Ihre KI-Rezeptionistin. Dieses Gespräch kann aufgezeichnet und an unsere Dienstleister weitergegeben werden. Ich nehme Ihre Anrufe entgegen, leite Sie an den richtigen Spezialisten weiter und sorge dafür, dass nichts verloren geht.

---

## Maren

**Role:** Appointment coordination across locations

**EN:**
Hi, I'm Maren. I coordinate appointments across all your locations — booking, rescheduling, no-show recovery. Tell me what you need and I'll find the best slot.

**DE:**
Hallo, ich bin Maren. Ich koordiniere Termine über alle Ihre Standorte — Buchung, Umplanung, Ausfallnachverfolgung. Sagen Sie mir, was Sie brauchen, und ich finde den besten Termin.

---

## Jonas

**Role:** Lead qualification and routing

**EN:**
Hi, I'm Jonas. I qualify your inbound leads so your sales team only talks to real opportunities. Describe an inquiry and I'll walk you through the process.

**DE:**
Hallo, ich bin Jonas. Ich qualifiziere Ihre eingehenden Anfragen, damit Ihr Vertrieb nur mit echten Chancen spricht. Beschreiben Sie eine Anfrage und ich zeige Ihnen den Ablauf.

---

## Tobias

**Role:** Field documentation and quote drafting

**EN:**
Hi, I'm Tobias. I turn rough field notes into structured, quote-ready documentation — no typing required. Just describe the job and I'll draft it.

**DE:**
Hallo, ich bin Tobias. Ich mache aus groben Notizen vom Einsatzort strukturierte, angebotsfertige Dokumentation — ganz ohne Tippen. Beschreiben Sie einfach den Auftrag.

---

## Lina

**Role:** Customer follow-up and retention

**EN:**
Hi, I'm Lina. I handle your follow-ups after appointments, open quotes, and service visits — so nothing falls through the cracks. Let me show you how that sounds.

**DE:**
Hallo, ich bin Lina. Ich übernehme Ihre Nachverfolgung nach Terminen, offenen Angeboten und Serviceeinsätzen — damit nichts untergeht. Ich zeige Ihnen, wie das klingt.

---

## Kai

**Role:** Team operations and coverage coordination

**EN:**
Hi, I'm Kai. When someone calls in sick at 6 AM, the shift is covered by 6:05. I coordinate vacation planning, escalations, and handoffs through one assistant instead of scattered WhatsApp groups.

**DE:**
Hallo, ich bin Kai. Wenn sich um 6 Uhr jemand krankmeldet, ist die Schicht um 6:05 besetzt. Ich koordiniere Urlaubsplanung, Eskalationen und Übergaben über einen Assistenten statt über verstreute WhatsApp-Gruppen.

---

## Nora

**Role:** Location intelligence and KPI interpretation

**EN:**
Hi, I'm Nora. I turn your location data into clear insight — what's happening, why, and what to do next. Let me show you with an example.

**DE:**
Hallo, ich bin Nora. Ich verwandle Ihre Standortdaten in klare Handlungsempfehlungen — was passiert, warum, und was als Nächstes zu tun ist.

---

## Samantha

**Role:** Diagnostic guide and operator-level advisor (webchat, not phone)

**EN:**
Hi, I'm Samantha — your diagnostic guide. This conversation may be recorded and shared with our service providers. I'm here to find the biggest bottleneck in your operations and recommend exactly which specialist can solve it.

**DE:**
Hallo, ich bin Samantha — Ihre Diagnose-Beraterin. Dieses Gespräch kann aufgezeichnet und an unsere Dienstleister weitergegeben werden. Ich finde den größten Engpass in Ihrem Betrieb und empfehle Ihnen genau, welcher Spezialist ihn lösen kann.

---

## ElevenLabs First message field

Use the values below in the ElevenLabs `First message` field.

Important:
1. `Clara` should not be blank. This is the fallback opener when no personalization context is available.
2. On matched landing-page calls, Clara's personalization webhook should personalize prompt/context only, not override the `First message` field at runtime.
3. Specialists should also not be blank. A short opener avoids dead air after transfer and keeps isolated testing clean.
4. `Samantha` is not part of the public ElevenLabs phone roster in the current setup, so you usually do not need to set a `First message` for her there.

### Clara

**EN**
```text
Hi, I'm Clara, your AI receptionist. This call may be recorded and shared with service providers. Tell me which demo you want, or I can help right here.
```

**DE**
```text
Hallo, ich bin Clara, Ihre KI-Rezeptionistin. Dieses Gespraech kann aufgezeichnet und an unsere Dienstleister weitergegeben werden. Sagen Sie mir, welche Demo Sie hoeren moechten, oder ich helfe Ihnen direkt hier.
```

### Maren

**EN**
```text
Hi, I'm Maren. I coordinate appointments across all your locations, from booking to rescheduling and no-show recovery. Tell me what kind of appointment you need.
```

**DE**
```text
Hallo, ich bin Maren. Ich koordiniere Termine ueber alle Ihre Standorte, von Buchung ueber Umplanung bis zur Ausfallnachverfolgung. Sagen Sie mir, welche Art von Termin Sie brauchen.
```

### Jonas

**EN**
```text
Hi, I'm Jonas. I qualify inbound leads so your team only spends time on real opportunities. Tell me about the inquiry and I'll take it from there.
```

**DE**
```text
Hallo, ich bin Jonas. Ich qualifiziere eingehende Anfragen, damit Ihr Team nur Zeit auf echte Chancen verwendet. Beschreiben Sie mir kurz die Anfrage, dann uebernehme ich.
```

### Tobias

**EN**
```text
Hi, I'm Tobias. I turn rough field notes into structured, quote-ready documentation. Describe the job and I'll draft it with you.
```

**DE**
```text
Hallo, ich bin Tobias. Ich mache aus groben Notizen vom Einsatzort strukturierte, angebotsfertige Dokumentation. Beschreiben Sie den Auftrag, dann entwerfe ich ihn mit Ihnen.
```

### Lina

**EN**
```text
Hi, I'm Lina. I handle follow-up after appointments, open quotes, and service visits so nothing slips through the cracks. Tell me where the customer journey is going quiet.
```

**DE**
```text
Hallo, ich bin Lina. Ich uebernehme die Nachverfolgung nach Terminen, offenen Angeboten und Serviceeinsaetzen, damit nichts untergeht. Sagen Sie mir, wo die Kundenreise still wird.
```

### Kai

**EN**
```text
Hi, I'm Kai. When someone calls in sick at 6 AM, I help cover the shift by 6:05. Tell me what changed and I'll coordinate the next step across vacation planning, escalations, and handoffs.
```

**DE**
```text
Hallo, ich bin Kai. Wenn sich um 6 Uhr jemand krankmeldet, helfe ich dabei, die Schicht bis 6:05 zu besetzen. Sagen Sie mir, was sich geändert hat, dann koordiniere ich den nächsten Schritt für Urlaubsplanung, Eskalationen und Übergaben.
```

### Nora

**EN**
```text
Hi, I'm Nora. I turn location performance data into clear insight about what is happening and what to do next. Ask about a trend, a dip, or a location comparison and I'll walk you through it.
```

**DE**
```text
Hallo, ich bin Nora. Ich verwandle Standortdaten in klare Einsichten dazu, was passiert und was als Naechstes zu tun ist. Fragen Sie nach einem Trend, einem Rueckgang oder einem Standortvergleich, und ich fuehre Sie durch die Antwort.
```

### Samantha

Use only if Samantha is later deployed as a voice agent:

**EN**
```text
Hi, I'm Samantha, your diagnostic guide. This conversation may be recorded and shared with service providers. I'll help identify the biggest bottleneck in your operation and recommend the best next agent.
```

**DE**
```text
Hallo, ich bin Samantha, Ihre Diagnose-Beraterin. Dieses Gespraech kann aufgezeichnet und an unsere Dienstleister weitergegeben werden. Ich helfe dabei, den groessten Engpass in Ihrem Betrieb zu finden und den besten naechsten Agenten zu empfehlen.
```

---

## ElevenLabs System prompt field

Use the mapping below for the ElevenLabs `System prompt` field.

Rule:
1. Paste the full contents of the mapped `system-prompt.md` file.
2. Do not add a second mini-prompt above it in the ElevenLabs UI.
3. Do not shorten the prompt in the UI just because the `First message` already sounds good. The prompt is the behavioral contract; the first message is only the opener.
4. If you edit an agent prompt in ElevenLabs directly, sync that change back into the repo immediately. The repo file should stay canonical.

### Paste source by agent

| Agent | What to paste into ElevenLabs `System prompt` | Notes |
|---|---|---|
| Clara | Full contents of [clara/system-prompt.md](./clara/system-prompt.md) | Clara is the public entry agent. Keep the prompt aligned with the landing personalization webhook behavior. |
| Maren | Full contents of [maren/system-prompt.md](./maren/system-prompt.md) | Maren should not repeat disclosure if Clara already handled it. |
| Jonas | Full contents of [jonas/system-prompt.md](./jonas/system-prompt.md) | Jonas should move directly into qualification when transferred by Clara. |
| Tobias | Full contents of [tobias/system-prompt.md](./tobias/system-prompt.md) | Tobias should start with the job-note scenario, not a generic greeting loop. |
| Lina | Full contents of [lina/system-prompt.md](./lina/system-prompt.md) | Lina should stay in retention / follow-up mode and route back to Clara when needed. |
| Kai | Full contents of [kai/system-prompt.md](./kai/system-prompt.md) | Kai should stay in operations coordination mode and transfer back to Clara for lane changes. |
| Nora | Full contents of [nora/system-prompt.md](./nora/system-prompt.md) | Nora should stay in analytics / insight mode and transfer back to Clara for lane changes. |
| Samantha | Full contents of [samantha/system-prompt.md](./samantha/system-prompt.md) | Usually not pasted into ElevenLabs for this rollout. Samantha is the local diagnostic layer, not part of the public phone roster. |

### Clara-specific note

Clara's prompt and Clara's live first turn are not the same thing:
1. the ElevenLabs `System prompt` should come from [clara/system-prompt.md](./clara/system-prompt.md)
2. the ElevenLabs `First message` should use the Clara line in the section above
3. on matched landing-page calls, the landing personalization webhook should adjust Clara's prompt/context so she acknowledges the requested specialist in her first model-generated turn after the standard opener, not by overriding `First message` dynamically

### Specialist note

For `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora`:
1. paste the full repo prompt into the `System prompt` field
2. set the short `First message` from the section above
3. keep `Transfer to agent` restricted to returning to `Clara`, not hopping between specialists

---

## Runtime config

The landing app route reads the ElevenLabs API key plus one voice id per agent:

| Agent | Env var |
|---|---|
| Clara | `LANDING_VOICE_INTRO_CLARA_VOICE_ID` |
| Maren | `LANDING_VOICE_INTRO_MAREN_VOICE_ID` |
| Jonas | `LANDING_VOICE_INTRO_JONAS_VOICE_ID` |
| Tobias | `LANDING_VOICE_INTRO_TOBIAS_VOICE_ID` |
| Lina | `LANDING_VOICE_INTRO_LINA_VOICE_ID` |
| Kai | `LANDING_VOICE_INTRO_KAI_VOICE_ID` |
| Nora | `LANDING_VOICE_INTRO_NORA_VOICE_ID` |
| Samantha | `LANDING_VOICE_INTRO_SAMANTHA_VOICE_ID` |

Optional:
1. `LANDING_VOICE_INTRO_MODEL_ID` to override the default ElevenLabs model
2. `ELEVENLABS_BASE_URL` if you need a non-default API base

## Generation notes

1. Use each agent's assigned ElevenLabs voice (from [MANUAL_SETUP_PACKET.md](./MANUAL_SETUP_PACKET.md)).
2. Clara and Samantha voices should be warm and professional for the disclosure portion.
3. Keep the generation settings natural — no dramatic pauses or exaggerated inflection.
4. Target duration: 8–15 seconds per clip.
