# Convex Setup Instructions

Follow these steps to set up Convex from your command line:

## 1. Login to Convex

First, you'll need to authenticate with Convex:

```bash
npx convex login
```

This will open your browser to authenticate. Follow the prompts to log in or create an account.

## 2. Initialize Convex in the Project

Run the Convex development server which will guide you through project setup:

```bash
npx convex dev
```

When prompted:

- Choose "Create a new project"
- Enter a project name (e.g., "rems-world")
- Select your team (or create a new one)
- Choose your deployment region

## 3. Environment Variables

The `npx convex dev` command will automatically:

- Create/update your `.env.local` file with the correct values
- Generate the `convex/_generated` directory with TypeScript types
- Push your schema to the Convex backend

Your `.env.local` should now contain:

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=prod:your-project
```

## 4. Verify Schema Push

Your schema from `convex/schema.ts` should be automatically pushed. You can verify this in the Convex dashboard or by checking that `convex/_generated` contains generated files.

## 5. Set Up Authentication (Optional)

To add authentication providers:

```bash
# In the Convex dashboard, go to Settings > Environment Variables
# Add your OAuth provider credentials:
# AUTH_GITHUB_ID=your-github-oauth-id
# AUTH_GITHUB_SECRET=your-github-oauth-secret
```

Then update `convex/auth.ts` to include your providers:

```typescript
import { GitHub } from "@convex-dev/auth/providers/GitHub";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub],
});
```

## 6. Development Workflow

For ongoing development, you need to run both servers:

**Option 1: Two terminals (recommended)**

```bash
# Terminal 1: Run Convex dev server
npm run convex
# or
npx convex dev

# Terminal 2: Run Next.js dev server
npm run dev
```

**Option 2: Using a process manager**

```bash
# Install concurrently
npm install --save-dev concurrently

# Add to package.json scripts:
"dev:all": "concurrently \"npm run convex\" \"npm run dev\""

# Then run:
npm run dev:all
```

## 7. Production Deployment

### For Vercel:

1. Push your code to GitHub (including `convex/_generated` directory)

2. In Vercel dashboard:
   - Import your GitHub repository
   - Add environment variables:
     ```
     NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
     CONVEX_DEPLOYMENT=prod:your-project
     ```

3. Deploy! Vercel will automatically run `npm run build` which includes `convex deploy`

### Manual Production Deploy:

```bash
# Deploy Convex functions to production
npx convex deploy --prod

# Build and deploy your Next.js app
npm run build
vercel --prod
```

## Using Shared Database for Dev/Prod

To use the same Convex database for both development and production (simpler setup):

1. Use the same environment variables in both `.env.local` and Vercel
2. Always use `npx convex dev` for development (not `--prod`)
3. Your dev and prod will share the same data

For separate databases, create multiple Convex projects and use different environment variables.

## Troubleshooting

### "Cannot connect to Convex" error

- Check that your `.env.local` file exists and has the correct URLs
- Ensure you're running `npx convex dev` in another terminal
- Try `npx convex dev --once` to reinitialize

### Schema validation errors

- Check `convex/schema.ts` for TypeScript errors
- Ensure all imports are correct
- Run `npm run typecheck` to find issues

### Authentication not working

- Verify environment variables are set in Convex dashboard
- Check that your callback URLs are configured in your OAuth provider
- Ensure `convex/auth.ts` matches your providers

## Useful Commands

```bash
# Check Convex CLI version
npx convex version

# List your Convex projects
npx convex list

# Open Convex dashboard
npx convex dashboard

# Run Convex functions locally
npx convex run <function_name>

# Clear local Convex cache
rm -rf .convex
```
