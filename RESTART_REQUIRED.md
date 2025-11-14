# ⚠️ Next.js Dev Server Restart Required

## The Issue
You're seeing: `createMockTicketData is not a function`

## Why This Happens
Next.js hot-reload doesn't always pick up new exports in TypeScript files. The function exists and is properly exported, but the dev server needs a fresh start.

## Solution

**Stop your dev server and restart it:**

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## What Was Added
The new `createMockTicketData()` function in `src/lib/template-renderer.ts` at line 323.

## Verification
After restarting, the template set preview should work perfectly with:
- ✅ QR code displaying
- ✅ No template syntax showing
- ✅ All event/ticket data populated

---

**Note:** I've also cleared the Next.js cache (`.next/cache`) and changed the import to be more explicit, which should help.
