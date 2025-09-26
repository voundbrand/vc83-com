# 003 - Convex Backend Tasks

## Objective
Set up Convex backend structure for podcast content management and email functionality.

## Database Schema Tasks

### 1. Podcast Episodes Schema
- [ ] Create episodes table schema
  - id: string
  - title: string
  - description: string
  - audioUrl: string (Convex storage)
  - publishDate: number (timestamp)
  - duration: number (seconds)
  - episodeNumber: number
  - season: number (optional)
  - thumbnailUrl: string (optional)
  - transcript: string (optional)
  - featured: boolean

### 2. Contact Form Schema
- [ ] Create contacts table schema
  - id: string
  - name: string
  - email: string
  - subject: string
  - message: string
  - createdAt: number (timestamp)
  - status: string (new/read/replied)

### 3. Subscriber Schema (optional)
- [ ] Create subscribers table schema
  - id: string
  - email: string
  - subscribedAt: number
  - isActive: boolean

## Convex Functions Tasks

### 1. Episode Management
- [ ] Create episodes.ts with functions:
  - getAllEpisodes (with pagination)
  - getEpisodeById
  - getFeaturedEpisodes
  - searchEpisodes

### 2. Contact Form
- [ ] Create contacts.ts with functions:
  - submitContactForm (mutation)
  - sendContactEmail (action)

### 3. File Storage
- [ ] Set up Convex storage for:
  - Podcast audio files
  - Episode thumbnails
  - Other media assets

## Implementation Structure

```
convex/
├── schema.ts          # Database schema definitions
├── episodes.ts        # Episode queries and mutations
├── contacts.ts        # Contact form handling
├── email.ts          # Email sending actions
└── _generated/       # Auto-generated Convex files
```

## Environment Variables Required
```
CONVEX_DEPLOYMENT=
CONVEX_URL=
EMAIL_API_KEY= (if using external email service)
```