# Phase 1: Project Setup - Detailed Checklist

**Duration:** 2 days
**Status:** Not Started
**Goal:** Set up Next.js project with all dependencies and development environment

---

## Overview

This phase creates the foundation for the Gründungswerft benefits platform. We'll create a new Next.js 15 project, install all necessary dependencies, and set up the development environment.

**Success Criteria:**
- ✅ Next.js app running on localhost:3000
- ✅ All dependencies installed and configured
- ✅ Development environment ready
- ✅ Git repository initialized
- ✅ Team can start development

---

## Day 1: Next.js Project Creation (3-4 hours)

### Morning: Create Project

**1. Create Next.js App**

```bash
# Navigate to development directory
cd /Users/foundbrand_001/Development

# Create Next.js project with TypeScript and Tailwind
npx create-next-app@latest provision-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

# Navigate into project
cd provision-app
```

**Configuration during setup:**
- ✅ TypeScript: Yes
- ✅ ESLint: Yes
- ✅ Tailwind CSS: Yes
- ✅ `src/` directory: Yes
- ✅ App Router: Yes
- ✅ Import alias (@/*): Yes
- ✅ Package manager: npm

**2. Verify Installation**

```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
# Should see Next.js welcome page
```

**Checklist - Morning:**
- [ ] Next.js project created
- [ ] Development server runs without errors
- [ ] Can access localhost:3000 in browser

### Afternoon: Install Dependencies

**1. Authentication Dependencies**

```bash
# NextAuth.js for OAuth
npm install next-auth @auth/core

# Types for NextAuth
npm install -D @types/next-auth
```

**2. UI Component Library (shadcn/ui)**

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Configuration:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
```

**Install commonly used components:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add toast
```

**3. Additional Dependencies**

```bash
# Icons
npm install lucide-react

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# Date formatting
npm install date-fns

# Convex client (for backend)
npm install convex
```

**4. Development Dependencies**

```bash
# Types
npm install -D @types/node

# Testing (optional for now, Phase 5)
npm install -D @playwright/test
```

**Checklist - Afternoon:**
- [ ] NextAuth.js installed
- [ ] shadcn/ui initialized
- [ ] All UI components added
- [ ] Additional dependencies installed
- [ ] `package.json` has all packages

---

## Day 2: Configuration & Setup (3-4 hours)

### Morning: Environment Variables

**1. Create Environment Files**

**File:** `.env.example`
```bash
# Gründungswerft OAuth Configuration
GRUENDUNGSWERFT_CLIENT_ID=your_client_id_here
GRUENDUNGSWERFT_CLIENT_SECRET=your_client_secret_here
GRUENDUNGSWERFT_AUTHORIZATION_URL=https://intranet.gruendungswerft.com/oauth/authorize
GRUENDUNGSWERFT_TOKEN_URL=https://intranet.gruendungswerft.com/oauth/token
GRUENDUNGSWERFT_USERINFO_URL=https://intranet.gruendungswerft.com/oauth/userinfo

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_this_with_openssl

# L4YERCAK3 Backend API
L4YERCAK3_API_KEY=your_api_key_here
L4YERCAK3_BASE_URL=https://app.l4yercak3.com
L4YERCAK3_ORGANIZATION_ID=gruendungswerft
```

**File:** `.env.local` (copy from .env.example)
```bash
cp .env.example .env.local

# Generate NextAuth secret
openssl rand -base64 32

# Add generated secret to .env.local
```

**2. Update `.gitignore`**

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore
echo ".vercel" >> .gitignore
```

**Checklist - Morning:**
- [ ] `.env.example` created with all variables
- [ ] `.env.local` created (not committed)
- [ ] NextAuth secret generated
- [ ] `.gitignore` updated

### Afternoon: Project Structure

**1. Create Folder Structure**

```bash
# Create main directories
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(dashboard\)/benefits
mkdir -p src/app/\(dashboard\)/commissions
mkdir -p src/app/\(dashboard\)/profile
mkdir -p src/components/ui
mkdir -p src/components/benefits
mkdir -p src/components/commissions
mkdir -p src/components/layout
mkdir -p src/lib
mkdir -p src/types
```

**2. Create Basic Files**

**File:** `src/types/index.ts`
```typescript
export interface Benefit {
  _id: string;
  title: string;
  description: string;
  category: 'discount' | 'service' | 'product' | 'event';
  contactInfo: string;
  imageUrl?: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Commission {
  _id: string;
  title: string;
  description: string;
  commissionRate: string;
  category: 'sales' | 'consulting' | 'referral' | 'other';
  contactInfo: string;
  requirements?: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  memberNumber?: string;
}
```

**File:** `src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
```

**File:** `src/lib/l4yercak3.ts` (API client placeholder)
```typescript
const API_KEY = process.env.L4YERCAK3_API_KEY!;
const BASE_URL = process.env.L4YERCAK3_BASE_URL!;

export class L4YERCAK3Client {
  private async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Benefits methods (to be implemented in Phase 3)
  async getBenefits() {
    return this.request('/api/v1/benefits');
  }

  async createBenefit(data: any) {
    return this.request('/api/v1/benefits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Commissions methods (to be implemented in Phase 3)
  async getCommissions() {
    return this.request('/api/v1/commissions');
  }

  async createCommission(data: any) {
    return this.request('/api/v1/commissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const l4yercak3 = new L4YERCAK3Client();
```

**3. Update `next.config.js`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.gruendungswerft.com',
      },
      {
        protocol: 'https',
        hostname: '**.convex.cloud',
      },
    ],
  },
  // Enable strict mode
  reactStrictMode: true,
  // Disable x-powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;
```

**4. Update `tailwind.config.js` (Gründungswerft branding)**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gründungswerft brand colors
        gw: {
          blue: '#0066CC',
          'blue-dark': '#004999',
          'blue-light': '#3385D6',
          gray: '#F5F5F5',
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

**Checklist - Afternoon:**
- [ ] Folder structure created
- [ ] Type definitions created
- [ ] Utility functions created
- [ ] L4YERCAK3 API client created
- [ ] `next.config.js` configured
- [ ] `tailwind.config.js` configured

---

## Day 2 Evening: Git Setup & Documentation

**1. Initialize Git**

```bash
# Initialize repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial Next.js project setup

- Next.js 15 with TypeScript
- NextAuth.js for OAuth
- shadcn/ui components
- Tailwind CSS configured
- Project structure created
"
```

**2. Create README.md**

**File:** `README.md`
```markdown
# Gründungswerft Benefits & Provisionsplattform

Member benefits and commission offers platform for Gründungswerft.

## Tech Stack

- Next.js 15
- TypeScript
- NextAuth.js (OAuth)
- Tailwind CSS
- shadcn/ui
- L4YERCAK3 Backend (Convex)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

\`\`\`bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in .env.local with OAuth credentials from Chuck

# Run development server
npm run dev

# Open http://localhost:3000
\`\`\`

### Environment Variables

See `.env.example` for required variables.

**Required from Chuck:**
- GRUENDUNGSWERFT_CLIENT_ID
- GRUENDUNGSWERFT_CLIENT_SECRET
- OAuth endpoint URLs

## Project Structure

\`\`\`
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/              # Utilities and API clients
└── types/            # TypeScript type definitions
\`\`\`

## Development

\`\`\`bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run type-check # Run TypeScript type checking
\`\`\`

## Documentation

See `.kiro/benefits_platform_gw/` for full implementation plan.
```

**3. Add Scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

**Checklist - Evening:**
- [ ] Git repository initialized
- [ ] Initial commit created
- [ ] README.md created
- [ ] npm scripts configured

---

## Final Verification

### Run All Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build (should succeed)
npm run build

# Start dev server
npm run dev
```

**All should pass without errors!**

---

## Completion Checklist

### Dependencies
- [ ] Next.js 15 installed
- [ ] TypeScript configured
- [ ] Tailwind CSS configured
- [ ] NextAuth.js installed
- [ ] shadcn/ui initialized
- [ ] All UI components added
- [ ] Additional dependencies installed

### Configuration
- [ ] Environment variables template created
- [ ] `.env.local` configured (with placeholders)
- [ ] NextAuth secret generated
- [ ] `next.config.js` configured
- [ ] `tailwind.config.js` configured (Gründungswerft branding)

### Project Structure
- [ ] Folder structure created
- [ ] Type definitions created
- [ ] Utility functions created
- [ ] L4YERCAK3 API client placeholder created
- [ ] README.md created

### Git
- [ ] Repository initialized
- [ ] `.gitignore` updated
- [ ] Initial commit created

### Verification
- [ ] `npm run dev` works
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] No errors in console

---

## Blockers for Next Phase

**Phase 2 (OAuth Integration) requires:**

From Chuck:
- [ ] Client ID
- [ ] Client Secret
- [ ] Authorization URL
- [ ] Token URL
- [ ] Userinfo URL
- [ ] Test account credentials

**Send Chuck:** [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md)

---

## Common Issues & Solutions

### Issue: `npx create-next-app` fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Try again
npx create-next-app@latest provision-app
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Issue: shadcn/ui components not found

**Solution:**
```bash
# Ensure components.json exists
cat components.json

# Reinstall shadcn/ui
npx shadcn-ui@latest init --force
```

---

## Next Phase

Once Phase 1 is complete, proceed to **[Phase 2: OAuth Integration](./PHASE_2_CHECKLIST.md)**.

**Note:** You can start Phase 2 even without Chuck's OAuth credentials by creating mock OAuth provider for development.

---

**Phase 1 Status:** Not Started
**Estimated Completion:** Day 2 evening
