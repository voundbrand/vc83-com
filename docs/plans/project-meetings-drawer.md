# Project Meetings Drawer

## Overview

A reusable drawer component for static project pages (like `/project/rikscha`, `/project/gerrit`) that displays a timeline of project meetings. Each meeting can be expanded to show full details including notes, embedded videos, and attached files.

**Key Features:**
- Floating trigger button on project pages
- Slide-out drawer with meeting timeline
- Meeting detail modal with rich content
- Magic link authentication for clients
- Connected to backend project via organization/project IDs

---

## User Experience

### Flow for Clients (Frank & Alex)

```
1. Client visits /project/rikscha
2. Enters shared password "rikscha" → sees static project page
3. Sees floating button on right side: "📅 Meetings"
4. Clicks button → Login prompt appears (if not authenticated)
5. Enters email → receives magic link
6. Clicks magic link → authenticated, drawer opens
7. Sees list of meetings in chronological order
8. Clicks a meeting → modal opens with full details
9. Can view notes, watch embedded videos, download files
```

### Flow for You (Admin)

```
1. Go to project in l4yercak3 dashboard
2. Navigate to project's Meetings section
3. Click "Add Meeting"
4. Fill in everything at once:
   - Title, date, time, duration
   - Description/agenda
   - Notes (rich text)
   - Video links (just paste URLs)
   - Attach files
5. Save → immediately visible to clients in their drawer
```

The meeting form is a single comprehensive form - no need to save first then add content separately.

---

## Data Model

### New Object Type: Meeting

**Table:** `objects` (using existing ontology system)

```typescript
{
  // Base object fields
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "meeting",
  subtype: "project_meeting",
  name: string,                    // Meeting title
  description: string,             // Brief description/agenda
  status: "scheduled" | "completed" | "cancelled",

  // Meeting-specific data
  customProperties: {
    // Timing
    date: number,                  // Unix timestamp (date only)
    time: string,                  // "14:00" format
    duration: number,              // Minutes
    timezone: string,              // "Europe/Berlin"

    // Content (filled after meeting)
    notes: string,                 // Rich HTML content
    summary: string,               // Brief summary for list view

    // Embedded videos - just paste URL, platform auto-detected
    embeddedVideos: Array<{
      url: string,                 // Original URL (platform auto-detected)
      title: string,               // Display title
    }>,

    // Attached files (references to organizationMedia)
    mediaLinks: Array<{
      mediaId: Id<"organizationMedia">,
      displayOrder: number,
    }>,

    // Optional
    attendees: Array<{
      name: string,
      email?: string,
      role?: string,               // "client" | "team"
    }>,

    // Meeting link (for scheduled meetings)
    meetingLink?: string,          // Zoom/Meet link
    recordingUrl?: string,         // Post-meeting recording
  },

  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,
}
```

### Linking Meetings to Projects

**Table:** `objectLinks`

```typescript
{
  organizationId: Id<"organizations">,
  fromObjectId: Id<"objects">,     // Project ID
  toObjectId: Id<"objects">,       // Meeting ID
  linkType: "has_meeting",
  properties: {
    displayOrder: number,          // For manual ordering
  },
  createdBy: Id<"users">,
  createdAt: number,
}
```

### Meeting Comments

Comments use the existing comment system (objects with type "comment" linked via objectLinks):

**Table:** `objects` (comment)

```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "comment",
  subtype: "meeting_comment",
  name: "",                        // Not used for comments
  description: string,             // The comment text

  customProperties: {
    authorName: string,            // Display name
    authorEmail: string,           // For frontend session users
    authorType: "admin" | "client",
  },

  createdAt: number,
  createdBy: Id<"users"> | string, // User ID or frontend session ID
}
```

**Linking:** `objectLinks` with `linkType: "has_comment"` from Meeting to Comment

---

## API Design

### Queries

```typescript
// Get all meetings for a project (for drawer)
getProjectMeetings(
  sessionId: string,               // Frontend session ID
  organizationId: Id<"organizations">,
  projectId: Id<"objects">,
): Promise<Meeting[]>

// Get single meeting with full details (for modal)
getMeetingDetails(
  sessionId: string,
  meetingId: Id<"objects">,
): Promise<MeetingWithMedia>

// Get media file URL (for downloads)
getMeetingMediaUrl(
  sessionId: string,
  mediaId: Id<"organizationMedia">,
): Promise<string>

// Get comments for a meeting
getMeetingComments(
  sessionId: string,
  meetingId: Id<"objects">,
): Promise<Comment[]>
```

### Mutations (Admin Only)

```typescript
// Create a new meeting
createMeeting(
  sessionId: string,
  projectId: Id<"objects">,
  data: {
    name: string,
    description: string,
    date: number,
    time: string,
    duration: number,
  },
): Promise<Id<"objects">>

// Update meeting (add notes, videos, files after meeting)
updateMeeting(
  sessionId: string,
  meetingId: Id<"objects">,
  data: Partial<MeetingCustomProperties>,
): Promise<void>

// Add embedded video to meeting
addEmbeddedVideo(
  sessionId: string,
  meetingId: Id<"objects">,
  video: { url: string, title: string },
): Promise<void>

// Attach file to meeting
attachFileToMeeting(
  sessionId: string,
  meetingId: Id<"objects">,
  mediaId: Id<"organizationMedia">,
): Promise<void>

// Delete meeting
deleteMeeting(
  sessionId: string,
  meetingId: Id<"objects">,
): Promise<void>
```

### Mutations (Client - Comments Only)

```typescript
// Add comment to meeting (clients can do this)
addMeetingComment(
  sessionId: string,               // Frontend session
  meetingId: Id<"objects">,
  text: string,
): Promise<Id<"objects">>

// Delete own comment
deleteMeetingComment(
  sessionId: string,
  commentId: Id<"objects">,
): Promise<void>
```

---

## Frontend Components

### Directory Structure

```
src/
├── components/
│   └── project-drawer/
│       ├── index.ts                    # Exports
│       ├── ProjectDrawer.tsx           # Main drawer component
│       ├── ProjectDrawerTrigger.tsx    # Floating circular button with arrow
│       ├── MeetingList.tsx             # Timeline of meetings
│       ├── MeetingCard.tsx             # Single meeting in list
│       ├── MeetingDetailModal.tsx      # Full meeting view
│       ├── MeetingNotes.tsx            # Rich text notes display
│       ├── MeetingVideos.tsx           # Embedded video player (auto-detects platform)
│       ├── MeetingFiles.tsx            # File list with download
│       ├── MeetingComments.tsx         # Comments section with add/delete
│       ├── LoginPrompt.tsx             # Magic link auth UI
│       └── hooks/
│           ├── useProjectMeetings.ts   # Data fetching
│           ├── useMeetingDetails.ts    # Single meeting fetch
│           ├── useMeetingComments.ts   # Comments with add mutation
│           └── useDrawerAuth.ts        # Auth state management
```

### Component Hierarchy

```
<ProjectDrawerProvider config={PROJECT_CONFIG}>
  {/* Your page content */}
  <ProjectDrawerTrigger />
  <ProjectDrawer>
    <LoginPrompt />           {/* If not authenticated */}
    <MeetingList>             {/* If authenticated */}
      <MeetingCard />
      <MeetingCard />
      ...
    </MeetingList>
  </ProjectDrawer>
  <MeetingDetailModal />      {/* Opens on meeting click */}
</ProjectDrawerProvider>
```

### Usage in Project Pages

```tsx
// src/app/project/rikscha/page.tsx

import { ProjectDrawerProvider, ProjectDrawerTrigger, ProjectDrawer } from "@/components/project-drawer";

const PROJECT_CONFIG = {
  organizationId: "j57abc123..." as Id<"organizations">,
  projectId: "k83xyz789..." as Id<"objects">,
  theme: "amber",  // Matches page color scheme
};

export default function RikschaPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <PasswordProtection onCorrectPassword={() => setIsAuthenticated(true)} />;
  }

  return (
    <ProjectDrawerProvider config={PROJECT_CONFIG}>
      <div className="min-h-screen bg-white">
        {/* Existing page content */}
        <header>...</header>
        <main>...</main>

        {/* Drawer components */}
        <ProjectDrawerTrigger />
        <ProjectDrawer />
      </div>
    </ProjectDrawerProvider>
  );
}
```

---

## Authentication Flow

### Magic Link Implementation

Uses existing `frontendSessions` system:

```
1. Client clicks "Log in" in drawer
2. Enters email address
3. System checks: Is this email a CRM contact in the organization?
4. If yes: Send magic link email
5. Client clicks link: /api/auth/magic-link?token=xxx
6. Token validated → frontendSession created
7. Session stored in cookie/localStorage
8. Drawer fetches data using session
```

### Session Storage

```typescript
// Client-side session management
interface DrawerSession {
  sessionId: string;
  contactEmail: string;
  organizationId: string;
  expiresAt: number;
}

// Stored in localStorage with key: `project_drawer_session_${organizationId}`
```

### Permission Model

- **Clients (frontendSession):** Read-only access to meetings for projects they're linked to
- **Admins (platform session):** Full CRUD on meetings via dashboard

---

## Embedded Video Support

### Auto-Detection Approach

Users simply paste any video URL - the system automatically detects the platform and generates the correct embed. No need to select a platform manually.

```typescript
function parseVideoUrl(url: string): VideoEmbed {
  // YouTube (multiple URL formats)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = extractVimeoId(url);
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  // Loom
  if (url.includes('loom.com')) {
    const videoId = extractLoomId(url);
    return {
      platform: 'loom',
      embedUrl: `https://www.loom.com/embed/${videoId}`,
    };
  }

  // Google Drive
  if (url.includes('drive.google.com')) {
    const fileId = extractGoogleDriveId(url);
    return {
      platform: 'google_drive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  // Fallback: Show as clickable link
  return {
    platform: 'other',
    url,
    embedUrl: null,  // Can't embed, just link
  };
}
```

### Supported Auto-Detection

| Platform | Auto-Detected URLs | Result |
|----------|-------------------|--------|
| YouTube | `youtube.com/watch?v=xxx`, `youtu.be/xxx` | Embedded player |
| Vimeo | `vimeo.com/xxx` | Embedded player |
| Loom | `loom.com/share/xxx` | Embedded player |
| Google Drive | `drive.google.com/file/d/xxx` | Embedded preview |
| Any other URL | `*` | Clickable link with title |

Users don't need to think about platforms - just paste the link.

---

## UI/UX Design

### Drawer Trigger Button

```
Position: Fixed, right edge, vertically centered
Size: 48px circular (mobile), 56px circular (desktop)
Style: Matches page theme (amber for rikscha, blue for gerrit)
Icon: Arrow pointing left (←) indicating "pull out drawer"
Label: Small text below button: "Projekt Details"
Animation: Subtle hover effect, arrow rotates when drawer opens

Visual:
    ┌─────────┐
    │         │
    │   ←     │  ← Circular button with inward arrow
    │         │
    └─────────┘
   Projekt Details   ← Small label below
```

When drawer is open, arrow rotates to point right (→) to indicate "close".

### Drawer Panel

```
Position: Fixed, slides in from right
Width: 400px (desktop), full width (mobile)
Background: White with subtle shadow
Header: "Projekt-Meetings" with close button
Content: Scrollable meeting list
Footer: "Powered by l4yercak3" branding (optional)
```

### Meeting Card (in list)

```
┌─────────────────────────────────────┐
│ 📅 15. Jan 2026                     │
│                                     │
│ Kickoff Meeting                     │
│ Projektstart & Zielsetzung          │
│                                     │
│ 📎 3 Dateien  🎬 1 Video            │
└─────────────────────────────────────┘

- Date prominently displayed
- Title in bold
- Brief description/summary
- Icons showing attached content
- Hover: subtle highlight
- Click: opens detail modal
```

### Meeting Detail Modal

```
┌──────────────────────────────────────────────────┐
│  ← Zurück            Kickoff Meeting         ✕   │
├──────────────────────────────────────────────────┤
│                                                  │
│  📅 15. Januar 2026, 14:00 Uhr                   │
│  ⏱️ Dauer: 60 Minuten                            │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  📝 Zusammenfassung                              │
│  Projektstart und Zielsetzung besprochen.        │
│  Budget bestätigt, Timeline festgelegt.          │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  📋 Meeting-Notizen                              │
│  ┌────────────────────────────────────────────┐  │
│  │ ## Besprochene Themen                      │  │
│  │ - Projektziele definiert                   │  │
│  │ - Budget: 3.000€ bestätigt                 │  │
│  │ - Timeline: 4 Wochen                       │  │
│  │                                            │  │
│  │ ## Nächste Schritte                        │  │
│  │ - [ ] Bildmaterial bereitstellen           │  │
│  │ - [ ] Magazin-Specs klären                 │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  🎬 Videos                                       │
│  ┌─────────────────────────────────────┐        │
│  │  ▶️ Meeting-Aufzeichnung            │        │
│  │  [Video Player / Thumbnail]         │        │
│  └─────────────────────────────────────┘        │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  📎 Dateien                                      │
│  ┌─────────────────────────────────────┐        │
│  │ 📄 Flyer_Entwurf_v1.pdf      ⬇️     │        │
│  │ 🖼️ Logo_TuS_Pommern.png      ⬇️     │        │
│  │ 📄 Briefing.docx             ⬇️     │        │
│  └─────────────────────────────────────┘        │
│                                                  │
│  ──────────────────────────────────────────────  │
│                                                  │
│  💬 Kommentare (2)                               │
│  ┌────────────────────────────────────────────┐  │
│  │ Frank · 16. Jan 2026                       │  │
│  │ Super Meeting! Die Entwürfe sehen toll aus │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │ Remington · 16. Jan 2026                   │  │
│  │ Danke! Ich schicke die finalen Versionen   │  │
│  │ bis Freitag.                               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Kommentar schreiben...              [Send] │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Theming

The drawer should adapt to each project page's color scheme:

```typescript
type DrawerTheme = "amber" | "blue" | "emerald" | "neutral";

const themeConfig = {
  amber: {
    primary: "#f0c142",
    primaryHover: "#d4a937",
    accent: "#92400e",
    background: "#fffbeb",
    border: "#fcd34d",
  },
  blue: {
    primary: "#0284c7",
    primaryHover: "#0369a1",
    accent: "#0c4a6e",
    background: "#f0f9ff",
    border: "#7dd3fc",
  },
  // ...
};
```

---

## Implementation Phases

### Phase 1: Backend Foundation
- [ ] Add "meeting" object type to ontology
- [ ] Create `meetingOntology.ts` with queries/mutations
- [ ] Add "has_meeting" link type
- [ ] Create API endpoints for frontend session access
- [ ] Test with sample data

### Phase 2: Frontend Components (Read-Only)
- [ ] Create `ProjectDrawerProvider` context
- [ ] Build `ProjectDrawerTrigger` floating button
- [ ] Build `ProjectDrawer` slide-out panel
- [ ] Build `MeetingList` timeline component
- [ ] Build `MeetingCard` list item
- [ ] Build `MeetingDetailModal` with sections
- [ ] Implement video embedding
- [ ] Implement file downloads

### Phase 3: Authentication
- [ ] Create `LoginPrompt` component
- [ ] Implement magic link request flow
- [ ] Handle magic link callback
- [ ] Session storage and management
- [ ] Auto-refresh expired sessions

### Phase 4: Admin Dashboard
- [ ] Add Meetings tab to project detail view
- [ ] Create meeting form (create/edit)
- [ ] Video link embedding UI
- [ ] File attachment UI
- [ ] Meeting list management

### Phase 5: Polish & Deploy
- [ ] Responsive design testing
- [ ] Animation and transitions
- [ ] Error handling and loading states
- [ ] Email template for magic links
- [ ] Documentation

---

## Configuration Reference

### Per-Project Configuration

```typescript
// Required in each project page
interface ProjectDrawerConfig {
  organizationId: Id<"organizations">;
  projectId: Id<"objects">;
  theme: "amber" | "blue" | "emerald" | "neutral";

  // Optional customization
  drawerTitle?: string;           // Default: "Projekt-Meetings"
  triggerPosition?: "right" | "left";
  triggerOffset?: number;         // Distance from edge
  allowDownloads?: boolean;       // Default: true
  showAttendees?: boolean;        // Default: false
}
```

### Example Configurations

```typescript
// /project/rikscha
const RIKSCHA_CONFIG: ProjectDrawerConfig = {
  organizationId: "xxx" as Id<"organizations">,
  projectId: "yyy" as Id<"objects">,
  theme: "amber",
  drawerTitle: "Projekt-Meetings",
};

// /project/gerrit
const GERRIT_CONFIG: ProjectDrawerConfig = {
  organizationId: "xxx" as Id<"organizations">,
  projectId: "zzz" as Id<"objects">,
  theme: "blue",
  drawerTitle: "Projekt-Updates",
};
```

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Notifications when new meetings added? | **No** - not needed |
| Client comments on meetings? | **Yes** - allow comments |
| Calendar integration? | **No** - not needed yet |
| Search across meetings? | **No** - not needed yet |
| Auto-archive old meetings? | **No** - keep all visible |

## Future Considerations (Not in Scope)

- Email notifications
- Calendar integration (Google/Apple)
- Search functionality
- Auto-archive

---

## Technical Notes

### Why Use Existing Ontology System?

- Consistent with rest of platform
- Automatic audit logging via `objectActions`
- Works with existing permission system
- Can leverage existing media management
- Future: AI can summarize meetings, search across notes

### Why Frontend Sessions (Not Platform Auth)?

- Clients shouldn't access full platform
- Simpler permission model (read-only)
- Separate session expiry (30 days vs 24 hours)
- Can revoke without affecting platform users
- Portal system already battle-tested

---

*Document created: January 2026*
*Last updated: January 2026*
