# Phase 4: Mobile & Voice Experience

> The client's primary interface. Voice-first interviews on mobile. Review queue in your pocket. The agency's product delivered through your app.

**Depends on:** Phase 2 (Client Onboarding), Phase 3 (Content Pipeline)

---

## Goals

- Voice-to-text input for interviews (SuperWhisper-style async transcription)
- Mobile-optimized client experience (interview + reviews)
- Push notifications for new content to review
- Offline-capable voice recording with sync

---

## 4.1 Voice Input Architecture

### Design Decision: Async Transcription, Not Live Conversation

The AI asks questions as text cards. The client taps a button, speaks, and the audio is transcribed to text before submission. This is intentionally **not** a real-time voice conversation because:

1. **User control** — Client can re-record, review transcript, edit before sending
2. **Quality** — Transcription accuracy is higher with complete utterances
3. **Latency** — No real-time streaming requirements
4. **Cost** — One Whisper API call per answer, not continuous streaming
5. **Backend unchanged** — Transcribed text enters the pipeline as a normal text message

### Transcription Options

| Option | Pros | Cons | Recommended For |
|---|---|---|---|
| **SuperWhisper (client-side)** | Zero latency, no API cost, works offline | Requires app install, macOS/iOS only | Power users, desktop |
| **Whisper API (server-side)** | Universal, high accuracy, 98+ languages | API cost (~$0.006/min), requires upload | Mobile app, cross-platform |
| **Web Speech API (browser)** | Free, no backend, instant | Inconsistent quality, Chrome-only, no offline | Web fallback |
| **On-device Whisper (mobile)** | Offline, private, no cost | Model size (~150MB), slower on older devices | Future optimization |

### Recommended Implementation

**Phase 4A:** Whisper API (server-side) — universal, reliable, ships fast
**Phase 4B:** On-device Whisper — for offline capability and zero-latency

### Voice Input Flow

```
Client sees AI question (text card)
    ↓
Client taps [Record] button
    ↓
Audio recording starts (native MediaRecorder or Expo Audio)
    ↓
Client taps [Stop] or silence detection stops recording
    ↓
Audio compressed (opus/webm or m4a)
    ↓
[Phase 4A] Upload to server → Whisper API → transcript returned
[Phase 4B] On-device Whisper → transcript generated locally
    ↓
Transcript shown in input field (editable)
    ↓
Client reviews, optionally edits, taps [Send]
    ↓
Text submitted as normal agentSessionMessage (role: "user")
    ↓
Agent processes as usual (no voice-specific handling needed)
```

### Implementation Tasks

- [ ] Create `VoiceRecorder` component (React Native / Expo):
  - [ ] Record button with visual waveform indicator
  - [ ] Silence detection (auto-stop after 3s silence)
  - [ ] Max recording length (5 minutes)
  - [ ] Audio compression (opus preferred, m4a fallback)
  - [ ] Recording state: idle → recording → processing → done
- [ ] Create `useVoiceTranscription` hook:
  - [ ] Handles audio upload to transcription endpoint
  - [ ] Returns transcript + loading state
  - [ ] Error handling (retry on failure)
  - [ ] Supports cancellation
- [ ] Create transcription API endpoint:
  - [ ] `POST /api/v1/transcribe` (authenticated, scoped to org)
  - [ ] Accepts audio file (max 25MB per Whisper limit)
  - [ ] Calls OpenAI Whisper API (or compatible)
  - [ ] Returns `{ text: string, language: string, duration: number }`
  - [ ] Credit cost: 1 credit per transcription
- [ ] Create `TranscriptPreview` component:
  - [ ] Shows transcribed text in editable text input
  - [ ] "Re-record" button to discard and try again
  - [ ] Confidence indicator (if available from API)
  - [ ] Language detection display
- [ ] Add voice input toggle to interview chat UI:
  - [ ] Switch between keyboard and voice input modes
  - [ ] Persist preference per user
  - [ ] Fallback to keyboard on unsupported devices

---

## 4.2 Mobile Client App Integration

### Existing App Context

You have a standalone app connected to the backend for org owners. The client experience lives alongside it as a role-gated view.

### Client Mobile Views

```
┌─ App Entry ──────────────────────────────┐
│                                          │
│  IF role === "org_owner"                 │
│    → Full dashboard (existing)           │
│                                          │
│  IF role === "client"                    │
│    → Client shell (3 tabs):              │
│      ├── Interview                       │
│      ├── Reviews                         │
│      └── Profile                         │
│                                          │
└──────────────────────────────────────────┘
```

### Interview Tab (Mobile)

```
┌─────────────────────────────────┐
│ Phase 2/4: Your Audience   45%  │
│ ████████░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────┤
│                                 │
│  🤖 "Who is your ideal         │
│      customer? Describe the     │
│      person who gets the most   │
│      value from what you        │
│      offer."                    │
│                                 │
│  💡 Tip: Think about your best │
│     client from the past year.  │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ Your answer will appear  │   │
│  │ here after recording...  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌──────────┐  ┌───────────┐   │
│  │  🎤 Tap  │  │ ⌨️ Type  │   │
│  │ to speak │  │  instead  │   │
│  └──────────┘  └───────────┘   │
│                                 │
│           [Send →]              │
│                                 │
└─────────────────────────────────┘
```

### Reviews Tab (Mobile)

```
┌─────────────────────────────────┐
│ Reviews          3 pending 🔴   │
├─────────────────────────────────┤
│                                 │
│ ┌─ Feb 5 ─────────────────┐   │
│ │ 📱 LinkedIn Post         │   │
│ │                          │   │
│ │ "Most startups treat     │   │
│ │  content like a          │   │
│ │  megaphone. But the      │   │
│ │  best ones treat it      │   │
│ │  like a conversation..." │   │
│ │                          │   │
│ │ [✓] [✏️] [✗]            │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌─ Feb 6 ─────────────────┐   │
│ │ 🐦 X Thread (3 posts)   │   │
│ │ "3 Lessons from..."     │   │
│ │ [✓] [✏️] [✗]            │   │
│ └──────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### Implementation Tasks

- [ ] Create mobile route guard for `client` role:
  - [ ] Detect role on app launch
  - [ ] Route to client shell or full dashboard accordingly
- [ ] Create `MobileClientShell` component:
  - [ ] Bottom tab navigation (Interview, Reviews, Profile)
  - [ ] Agency branding in header (logo, primary color)
  - [ ] Badge count on Reviews tab
- [ ] Create `MobileInterviewView`:
  - [ ] Progress bar (horizontal, phases)
  - [ ] Question card (AI message with help text)
  - [ ] Voice recorder integration
  - [ ] Keyboard input fallback
  - [ ] Answer history (collapsible previous answers)
  - [ ] Haptic feedback on phase completion
- [ ] Create `MobileReviewList`:
  - [ ] Swipeable cards (swipe right = approve, left = reject)
  - [ ] Tap to expand full preview
  - [ ] Platform icon badges
  - [ ] Pull-to-refresh
- [ ] Create `MobileDraftEditor`:
  - [ ] Full-screen text editor
  - [ ] Character count with platform limit
  - [ ] "Preview as posted" toggle
  - [ ] Save + auto-approve

---

## 4.3 Push Notifications

### Notification Events

| Event | Channel | Message |
|---|---|---|
| Interview ready | Push + Email | "Your interview is ready. Tap to start." |
| Interview reminder | Push | "You have {N} questions remaining." |
| New content to review | Push + Email | "{N} new posts ready for your review." |
| Content published | Push | "Your post on {platform} is live!" |
| Re-interview requested | Push + Email | "Time for a follow-up interview." |

### Implementation

Use existing Pushover integration for org owners (agency gets notified) and add:
- **Client push notifications** via Expo Push Notifications (mobile app)
- **Email fallback** via Resend (for clients not on mobile app)

### Implementation Tasks

- [ ] Integrate Expo Push Notifications for client app:
  - [ ] Push token registration on client login
  - [ ] Store token in frontend_user record
  - [ ] Send via Expo Push API
- [ ] Create notification triggers:
  - [ ] `notifyInterviewReady(clientUserId)`
  - [ ] `notifyInterviewReminder(clientUserId, remainingQuestions)`
  - [ ] `notifyContentReady(clientUserId, draftCount)`
  - [ ] `notifyContentPublished(clientUserId, platform)`
- [ ] Email fallback for each notification type (via Resend)
- [ ] Notification preferences per client:
  - [ ] Push on/off
  - [ ] Email on/off
  - [ ] Quiet hours setting

---

## 4.4 Offline Capability

### Offline Voice Recording

```
Client records voice (offline)
    ↓
Audio saved to device storage (Expo FileSystem)
    ↓
Queued for upload when connection returns
    ↓
Background upload → transcription → message submission
    ↓
Client sees "synced" indicator
```

### Implementation Tasks

- [ ] Create offline recording queue:
  - [ ] Save recordings to device with metadata (sessionId, questionId, timestamp)
  - [ ] Queue manager that syncs when online
  - [ ] Visual indicator: "3 answers queued for upload"
- [ ] Handle conflict resolution:
  - [ ] If interview advanced while offline (unlikely but possible), reconcile state
  - [ ] Discard recordings for already-answered questions
- [ ] Network status indicator in client shell

---

## Success Criteria

- [ ] Client can record voice answers on mobile
- [ ] Voice is transcribed to text (Whisper API) before submission
- [ ] Client can review and edit transcript before sending
- [ ] Mobile interview experience matches desktop functionality
- [ ] Push notifications delivered for key events
- [ ] Client can approve/edit/reject content from mobile
- [ ] Swipe gestures work for quick approval
- [ ] Voice recording works offline with sync on reconnect
- [ ] Credits properly deducted for transcription

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/components/voice/voice-recorder.tsx` | **Create** | Recording UI component |
| `src/components/voice/transcript-preview.tsx` | **Create** | Editable transcript display |
| `src/hooks/useVoiceTranscription.ts` | **Create** | Transcription hook |
| `convex/api/v1/transcribe.ts` | **Create** | Whisper API endpoint |
| `src/app/c/interview/page.tsx` | **Modify** | Add voice input to interview |
| `src/components/client/mobile-client-shell.tsx` | **Create** | Mobile bottom-tab layout |
| `src/components/client/mobile-interview.tsx` | **Create** | Mobile interview view |
| `src/components/client/mobile-review-list.tsx` | **Create** | Swipeable review cards |
| `convex/notifications/clientNotifications.ts` | **Create** | Client notification triggers |
| `src/services/offlineQueue.ts` | **Create** | Offline recording queue |
