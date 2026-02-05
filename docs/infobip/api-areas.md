# Infobip API Scopes Reference

API key scopes control which actions the key can perform. Configure at: Infobip Portal > API Keys > Edit > API-Bereiche

---

## Allgemein (General) — 2 scopes

| Scope | Description |
|-------|-------------|
| `inbound-message:read` | Read inbound messages across all channels |
| `message:send` | Send messages across all messaging endpoints |

---

## Kanäle (Channels) — 100 scopes

### SMS
| Scope | Description |
|-------|-------------|
| `sms:inbound-message:read` | Read inbound SMS messages |
| `sms:logs:read` | Read SMS message logs |
| `sms:manage` | Access all SMS API endpoints |
| `sms:message:send` | Send SMS messages |

### Email
| Scope | Description |
|-------|-------------|
| `email:logs:read` | Read email message logs |
| `email:manage` | Access all Email API endpoints |
| `email:message:send` | Send email messages |
| `email:templates:manage` | Access email template API endpoints |

### WhatsApp
| Scope | Description |
|-------|-------------|
| `whatsapp:conversions` | Access WhatsApp conversations |
| `whatsapp:inbound-message:read` | Read inbound WhatsApp messages |
| `whatsapp:logs:read` | Read WhatsApp message logs |
| `whatsapp:manage` | Access all WhatsApp API endpoints |
| `whatsapp:message:send` | Send WhatsApp messages |

### Viber Business Messages
| Scope | Description |
|-------|-------------|
| `viber-bm:logs:read` | Read Viber Business Messages logs |
| `viber-bm:manage` | Access all Viber Business Messages endpoints |
| `viber-bm:message:send` | Send Viber Business Messages |

### Viber Bot
| Scope | Description |
|-------|-------------|
| `viber-bot:logs:read` | Read Viber Bot message logs |
| `viber-bot:manage` | Access all Viber Bot message endpoints |
| `viber-bot:message:send` | Send Viber Bot messages |

### Instagram
| Scope | Description |
|-------|-------------|
| `instagram:logs:read` | Read Instagram message logs |
| `instagram:manage` | Access all Instagram message endpoints |
| `instagram:message:send` | Send Instagram messages |

### Messenger (Facebook)
| Scope | Description |
|-------|-------------|
| `messenger:logs:read` | Read Messenger message logs |
| `messenger:manage` | Access all Messenger API endpoints |
| `messenger:message:send` | Send Messenger messages |

### Telegram
| Scope | Description |
|-------|-------------|
| (via Messenger/general endpoints) | Connect Telegram bot for direct messaging |

### Apple Messages for Business
| Scope | Description |
|-------|-------------|
| `apple-mfb:logs:read` | Read Apple Messages for Business logs |
| `apple-mfb:manage` | Access all Apple Messages for Business endpoints |
| `apple-mfb:message:send` | Send Apple Messages for Business |

### KakaoTalk
| Scope | Description |
|-------|-------------|
| `kakao:logs:read` | Read Kakao message logs |
| `kakao:manage` | Access all Kakao message endpoints |
| `kakao:message:send` | Send Kakao messages |

### LINE
| Scope | Description |
|-------|-------------|
| `line:manage` | Access all LINE message endpoints |
| `line:message:send` | Send LINE messages |

### Zalo
| Scope | Description |
|-------|-------------|
| `zalo:logs:read` | Read Zalo message logs |
| `zalo:manage` | Access all Zalo API endpoints |
| `zalo:message:send` | Send Zalo messages |
| `zalo-follower:logs:read` | Read Zalo Follower message logs |
| `zalo-follower:manage` | Access all Zalo Follower API endpoints |
| `zalo-follower:message:send` | Send Zalo Follower messages |

### TikTok
| Scope | Description |
|-------|-------------|
| `tiktok:logs:read` | Read TikTok BM message logs |
| `tiktok:manage` | Access all TikTok BM endpoints |
| `tiktok:message:send` | Send TikTok BM messages |

### MMS
| Scope | Description |
|-------|-------------|
| `mms:inbound-message:read` | Read inbound MMS messages |
| `mms:logs:read` | Read MMS message logs |
| `mms:manage` | Access all MMS API endpoints |
| `mms:message:send` | Send MMS messages |

### RCS
| Scope | Description |
|-------|-------------|
| `rcs:logs:read` | Read RCS message logs |
| `rcs:manage` | Access all RCS API endpoints |
| `rcs:message:send` | Send RCS messages |

### Voice & WebRTC
| Scope | Description |
|-------|-------------|
| `calls:manage` | Access all Calls API endpoints |
| `calls:configuration:manage` | Manage Calls API settings |
| `calls:logs:read` | Access Calls API logs |
| `calls:read` | Access Calls API logs |
| `calls:media:manage` | Manage media for Calls API |
| `calls:bulk:manage` | Manage bulk calls |
| `calls:traffic:send` | Send calls and call actions |
| `calls:traffic:receive` | Manage inbound calls |
| `calls:traffic:record` | Record calls |
| `calls:recording:read` | Read call recordings |
| `calls:recording:delete` | Delete call recordings |
| `calllink:manage` | Access all call link API endpoints |
| `calllink:configuration:manage` | Manage call link configuration |
| `calllink:link:manage` | Manage call links |
| `callrouting:manage` | Access all call routing API endpoints |
| `clicktocall:manage` | Access all click-to-call API endpoints |
| `voice-message:logs:read` | Access sent voice message logs |
| `voice-message:manage` | Manage all voice messages |
| `voice-message:message:send` | Send voice messages |
| `voice:logs:read` | Read voice reports |
| `voice:recording:read` | Read voice recordings |
| `voice:recording:manage` | Manage voice recordings |
| `voice:recording:delete` | Delete voice recordings |
| `voice-reports:read` | Access voice reports |
| `webrtc:manage` | Access all WebRTC API endpoints |
| `webrtc:configuration:manage` | Manage WebRTC configuration |
| `webrtc:identity:manage` | Manage WebRTC identity configuration |
| `webrtc:media:manage` | Manage media for WebRTC |

### IVR
| Scope | Description |
|-------|-------------|
| `ivr:manage` | Access all IVR settings and API endpoints |
| `ivr:configuration:manage` | Manage IVR configuration |
| `ivr:message:send` | Send IVR messages |

### 2FA
| Scope | Description |
|-------|-------------|
| `2fa:manage` | Access all 2FA API endpoints |
| `2fa:pin:manage` | Configure and manage OTP PIN settings |
| `2fa:pin:send` | Send OTP PINs |

### Other Channels
| Scope | Description |
|-------|-------------|
| `mobile-app-messaging:manage` | Send and manage mobile app messages |
| `mobile-app-messaging:send` | Send mobile app messages |
| `mobile-app-messaging:inbound-message:read` | Read inbound mobile app messages |
| `mobile-app-messaging:logs:read` | Read app message logs |
| `web-push:manage` | Manage web push notifications |
| `web-push:send` | Send web push notifications |
| `live-chat:manage` | Manage live chat functionality and settings |
| `numbermasking:manage` | Access all number masking API endpoints |
| `markuplanguage:manage` | Access all markup language API endpoints |
| `rbm-maap:manage` | Access all RBM MaaP API endpoints |
| `rbm-maap:message:send` | Send RBM MaaP messages |
| `omni-failover:manage` | Access all omni-channel failover API endpoints |
| `omni-failover:logs:read` | Read omni-channel failover event logs |
| `omni-failover:message:send` | Send messages via omni-channel failover |
| `google-bm:logs:read` | Read Google Business Messages logs |
| `google-bm:manage` | Access all Google Business Messages endpoints |
| `google-bm:message:send` | Send Google Business Messages |

---

## Konnektivität (Connectivity) — 6 scopes

| Scope | Description |
|-------|-------------|
| `biometrics:manage` | Access all Biometrics API endpoints |
| `mobile-identity:manage` | Manage and use Mobile Identity |
| `number-activation-state:read` | Read data from Deact API |
| `number-lookup:logs:read` | Read number lookup logs |
| `number-lookup:manage` | Access all number lookup API endpoints |
| `number-lookup:send` | Perform number lookups |

---

## Plattform (Platform) — 19 scopes

| Scope | Description |
|-------|-------------|
| `account-management:manage` | Control account settings and information |
| `application-entity:manage` | Manage application-specific entities and settings |
| `audit-logs:read` | Read and export audit logs |
| `blocklist:manage` | Access all blocklist API endpoints |
| `catalogs:manage` | Access all catalog API endpoints |
| `catalogs:read` | Read existing catalogs and metadata |
| `catalogs:use` | Get, add, delete, and update catalog items |
| `error-codes:read` | Access platform error code details for debugging |
| `messages-api:manage` | Access all Messages API endpoints |
| `messages-api:message:send` | Send messages via Messages API |
| `metrics:manage` | Access and manage metrics/analytics via Metrics API |
| `number-risk-score:manage` | Access all Number Risk Score API endpoints |
| `numbers:manage` | Access all Numbers API endpoints |
| `numbers:recording:manage` | Manage recording settings for numbers |
| `resource-request-hub:manage` | Create/update resource requests and check status |
| `resource-request-hub:read` | Check status of existing resource requests |
| `sending-strategy:manage` | Configure message sending strategies and rules |
| `signals:manage` | Access all Signals API endpoints |
| `subscriptions:manage` | Access all subscription API endpoints |

---

## Kundenengagement (Customer Engagement) — 22 scopes

| Scope | Description |
|-------|-------------|
| `ai:agents:query` | Send queries to AI agents and receive responses |
| `ai:read` | Read information about AI tools |
| `answers:manage` | Access all Answers (chatbot) API endpoints |
| `answers:testing` | API access to test chatbots |
| `campaign-tags:manage` | Manage campaign tags |
| `campaign-tags:view` | View campaign tags |
| `content-messages:manage` | Access all content message API endpoints |
| `content-messages:read` | Read existing content messages, details, and analytics |
| `conversations:manage` | Access all Conversations API endpoints |
| `flow:control` | Start, stop, and cancel Moments flows |
| `flow:manage` | Manage flows in Moments |
| `flow:read` | Read existing flows, details, participants, and analytics |
| `flow:use` | Add participants to existing flows |
| `forms:manage` | Access all form API endpoints |
| `forms:read` | Read form information, submitted data, and events |
| `forms:use` | Submit data or events to a form |
| `onboarding:manage` | Use embedded version of Answers in integrations |
| `people:manage` | Access all People API endpoints |
| `people:read` | Read-only access to People data and profiles |
| `people:use` | Access event collection in People |
| `saas:integrations:manage` | Access SaaS integration API endpoints |
| `saas:tiktok-ads:manage` | Access TikTok Ads (Click-to-) API endpoints |

---

## Client-side SDK — 3 scopes

> When client-side SDK scopes are selected, other scope categories are disabled for security reasons.

| Scope | Description |
|-------|-------------|
| `2fa:sdk` | Access 2FA API endpoints available via client SDK |
| `web:sdk` | Access People and People Events endpoints via client SDK |
| `web:tracking:sdk` | Track website visitors via Infobip Web SDK |

---

## Recommended Scopes for L4YERCAK3 Platform

### Minimum (SMS only — current):
- `message:send`
- `inbound-message:read`
- `sms:message:send`
- `sms:inbound-message:read`
- `sms:logs:read`
- `numbers:manage` (for number provisioning)
- `account-management:manage` (for balance checks)

### Phase 2 (multi-channel):
- All SMS scopes above
- `whatsapp:message:send`, `whatsapp:inbound-message:read`, `whatsapp:manage`
- `email:message:send`, `email:manage`
- `viber-bm:message:send`, `viber-bm:manage`
- `instagram:message:send`, `instagram:manage`
- `messenger:message:send`, `messenger:manage`
- `people:manage` (contact management)
- `conversations:manage` (conversation tracking)
- `subscriptions:manage` (webhook management)
