# Claude Code Configuration - Rem's World UI Project

## 🚨 CRITICAL: Always Run Code Quality Checks

**MANDATORY**: After making any code changes, ALWAYS run these commands to catch errors early:

```bash
# Run ALL checks with a single command (RECOMMENDED)
npm run check-all  # Runs typecheck, lint, and format:check

# Or run individual checks:
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint rules
npm run format:check # Check code formatting
```

If any of these commands fail, fix the issues immediately:

- For formatting issues: Run `npm run format` to auto-fix
- For TypeScript/ESLint errors: Fix manually

This prevents deployment failures and maintains code quality.

## Project Overview

Rem's World is a nostalgic web experience featuring a retro Mac OS X/Apple Lisa desktop interface:

- **Retro Desktop Environment**: Authentic Mac OS X/Lisa aesthetics with modern web technology
- **Modular Application System**: Dynamic loading of desktop applications and windows
- **Real-time State Persistence**: Window positions, desktop configurations saved via Convex
- **Multi-device Synchronization**: Seamless experience across devices with user authentication
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Guest Mode Support**: Limited functionality for unauthenticated users
- **Extensible Architecture**: Easy to add new applications and features

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Custom retro design system
- **Database**: Convex for real-time state management
- **Authentication**: Convex Auth with multiple providers
- **State Management**: Zustand for local state, Convex for persistent state
- **Animation**: Framer Motion for retro animations
- **UI Components**: Radix UI primitives with retro styling
- **Deployment**: Vercel with shared Convex database
- **Node Version**: Use Node 20.x or higher

## Development Commands

### Essential Commands

```bash
# Development
npm run dev            # Start development server with Convex

# Quality Checks (RUN AFTER EVERY CHANGE)
npm run check-all      # Run all checks at once (recommended)
npm run typecheck      # TypeScript type checking
npm run lint           # ESLint rules
npm run format         # Auto-fix code formatting

# Manual Build (run when ready to deploy)
npm run build          # Build for production with Convex deploy

# Database
npm run convex         # Start Convex development separately

# Deployment
vercel                 # Deploy to Vercel
vercel --prod          # Deploy to production
```

### Node Version Management

```bash
nvm use 20            # Switch to Node 20 for this project
node --version        # Verify version (should be v20.x.x or higher)
```

## Code Quality Standards

### 🔍 MANDATORY CHECKS AFTER CODE CHANGES

1. **All Checks**: `npm run check-all` - Runs all checks in sequence
2. **Type Check**: `npm run typecheck` - No TypeScript errors allowed
3. **Lint Check**: `npm run lint` - ESLint rules must pass
4. **Format Check**: `npm run format:check` - Code must be properly formatted

### 🏗️ MANUAL BUILD CHECK (before deployment)

- **Build Check**: `npm run build` - Must pass without errors

### Best Practices

- Keep components modular and under 500 lines
- Use proper TypeScript types (avoid `any`)
- Follow retro design patterns consistently
- Maintain authentic Mac OS X/Lisa aesthetics
- Add loading states and error boundaries
- Implement proper window focus management
- Use optimistic updates for smooth interactions
- Test on multiple screen sizes and devices

## Project Structure

```
rems-world-ui/
├── src/                    # Source code
│   ├── app/               # Next.js app directory
│   │   ├── layout.tsx     # Root layout with providers
│   │   ├── page.tsx       # Desktop environment
│   │   └── (auth)/        # Authentication pages
│   ├── components/        # React components
│   │   ├── desktop/       # Desktop environment components
│   │   ├── windows/       # Window system components
│   │   ├── applications/  # Desktop applications
│   │   ├── ui/           # Base UI components
│   │   └── retro/        # Retro-styled components
│   ├── hooks/            # Custom React hooks
│   │   ├── useWindowManager.ts
│   │   ├── useDesktop.ts
│   │   └── useAuth.ts
│   ├── lib/              # Utilities
│   │   ├── types.ts      # TypeScript types
│   │   ├── utils.ts      # Helper functions
│   │   └── constants.ts  # App constants
│   └── stores/           # Zustand stores
│       ├── desktop.ts    # Desktop state
│       └── windows.ts    # Window management
├── convex/               # Database functions
│   ├── schema.ts         # Database schema
│   ├── auth.ts           # Authentication
│   ├── users.ts          # User profiles
│   ├── desktop.ts        # Desktop state
│   ├── applications.ts   # App registry
│   └── _generated/       # Generated types
├── public/               # Static assets
│   ├── fonts/           # Retro system fonts
│   ├── icons/           # Application icons
│   └── sounds/          # System sounds
├── .kiro/               # Kiro specifications
│   └── specs/           # Project requirements
└── .env.local           # Environment variables
```

## Environment Variables

Required for local development:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment-name

# Optional: Authentication Providers
AUTH_GITHUB_ID=your-github-oauth-id
AUTH_GITHUB_SECRET=your-github-oauth-secret
```

## Common Tasks

### Current Implementation Tasks

The detailed implementation plan and task list is located at:

- **Tasks File**: `.kiro/specs/retro-desktop-interface/tasks.md`
- **Requirements**: `.kiro/specs/retro-desktop-interface/requirements.md`
- **Design**: `.kiro/specs/retro-desktop-interface/design.md`

This file contains the complete checklist for implementation including:

- Convex backend setup and authentication
- Core data models and schemas
- Retro UI component library
- Window management system
- Desktop manager and application registry
- Modular application system
- Responsive design
- Real-time synchronization
- Production deployment

### Adding a New Desktop Application

1. Create application component in `src/components/applications/`
2. Register in Convex applications table
3. Add icon to `public/icons/`
4. Implement application interface
5. **RUN CHECKS**: `npm run check-all`
6. Test window management integration
7. Deploy changes

### Creating Retro UI Components

1. Study Mac OS X/Lisa design patterns
2. Create component with authentic styling
3. Use CSS-in-JS or Tailwind for theming
4. Add proper animations with Framer Motion
5. Include keyboard navigation
6. Test across different themes
7. Document component usage

### Implementing Window Features

1. Use WindowManager hook for state
2. Implement drag and resize handlers
3. Add window chrome (title bar, controls)
4. Handle focus and z-index management
5. Persist window state to Convex
6. Test multi-window scenarios

### Before Deployment

1. Ensure `.env.local` has all required variables
2. Run `npm run build` locally - must succeed
3. Test authentication flow thoroughly
4. Verify desktop state persistence
5. Check responsive design on all devices
6. Test with multiple concurrent users
7. Commit all changes including `convex/_generated/`
8. Deploy with `vercel --prod`

## Troubleshooting

### Build Failures

- Run all checks: `npm run check-all`
- Check TypeScript errors: `npm run typecheck`
- Verify all imports are correct
- Ensure environment variables are set
- Check for circular dependencies

### Convex Issues

- Run `npx convex dev` to sync schema
- Ensure `convex/_generated/` is up to date
- Check NEXT_PUBLIC_CONVEX_URL is correct
- Verify authentication providers are configured
- Test real-time subscriptions

### Window Management Issues

- Check z-index calculations
- Verify drag boundaries
- Test resize constraints
- Ensure focus management works
- Check state persistence timing

### Vercel Deployment

- Verify environment variables in Vercel dashboard
- Check build logs for errors
- Ensure Convex production URL is set
- Test authentication in production
- Monitor real-time performance

## Important Notes

- **ALWAYS** run `npm run check-all` after changes
- **NEVER** deploy without successful local build
- **ALWAYS** test on multiple screen sizes
- Maintain authentic retro aesthetics
- Preserve nostalgic user experience
- Test with keyboard navigation
- Follow existing retro design patterns
- Ensure smooth animations (60fps)
- Handle offline gracefully
- Implement proper error states

## Key Features to Remember

- **Retro Authenticity**: Every UI element should feel like Mac OS X/Lisa
- **Modular Applications**: Apps are dynamically loaded and registered
- **Real-time Sync**: Window states sync across devices instantly
- **Guest Mode**: Provide limited functionality without auth
- **Responsive**: Works on all devices while maintaining aesthetics
- **Extensible**: Easy to add new applications and features
- **Performance**: Optimize for smooth desktop experience
- **Accessibility**: Full keyboard navigation and screen reader support

## Development Workflow

1. Check current task in `.kiro/specs/retro-desktop-interface/tasks.md`
2. Create feature branch if using Git
3. Implement feature following retro design guidelines
4. **RUN CHECKS**: `npm run check-all`
5. Test on multiple devices and screen sizes
6. Update task status in tasks.md
7. Commit with descriptive message
8. Deploy to Vercel for testing
9. Merge to main when complete
