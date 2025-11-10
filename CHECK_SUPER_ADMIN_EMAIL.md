# Check Super Admin Email in CRM

Run these commands to debug why `itsmetherealremington@gmail.com` isn't being added to CRM:

## Step 1: Check if email exists as CRM contact

```bash
npx convex run debugCrmContact:findContactByEmail '{"email":"itsmetherealremington@gmail.com"}'
```

**What this shows:**
- Whether the email exists as a CRM contact
- In which organization(s) it exists
- All the contact details (tags, company, source, etc.)

## Step 2: Check if email exists as system user

```bash
npx convex run debugCrmContact:findUserByEmail '{"email":"itsmetherealremington@gmail.com"}'
```

**What this shows:**
- Whether the email exists in the `users` table
- User ID and role information
- **NOTE**: This does NOT affect CRM contact creation - just informational

## Step 3: Simulate what API would do

First, get your organization ID:

```bash
# Get your organization ID (replace with your org name/slug)
npx convex run organizations:getOrgBySlug '{"slug":"voundbrand"}'
```

Then simulate the API lookup:

```bash
# Replace k170abc123... with your actual organization ID from step above
npx convex run debugCrmContact:simulateApiLookup '{
  "email":"itsmetherealremington@gmail.com",
  "organizationId":"k170abc123..."
}'
```

**What this shows:**
- Exactly what the API sees when it processes this email
- Whether the contact already exists in YOUR organization
- Whether API would create new contact or update existing
- The existing contact data if it exists

## Expected Results

### If email is NOT in CRM:
```json
{
  "found": false,
  "count": 0,
  "contacts": []
}
```
**Meaning**: API should create a new CRM contact ✅

### If email IS in CRM:
```json
{
  "found": true,
  "count": 1,
  "contacts": [{
    "_id": "k170contact123...",
    "organizationId": "k170org456...",
    "email": "itsmetherealremington@gmail.com",
    "tags": ["existing", "tags"],
    "source": "api",
    "createdAt": 1234567890000,
    "updatedAt": 1234567891000
  }]
}
```
**Meaning**: API should UPDATE this contact (merge tags, etc.) ✅

### If API would create:
```json
{
  "apiWouldCreate": true,
  "apiWouldUpdate": false,
  "foundExistingContact": false
}
```

### If API would update:
```json
{
  "apiWouldCreate": false,
  "apiWouldUpdate": true,
  "foundExistingContact": true,
  "existingContactData": { ... }
}
```

## Common Issues

### Issue 1: Contact exists but in different organization
**Problem**: API key is for Org A, but you're looking for contacts in Org B

**Solution**: Check which organization your API key belongs to:
```bash
npx convex run api/auth:listApiKeys '{
  "sessionId":"YOUR_SESSION_ID",
  "organizationId":"YOUR_ORG_ID"
}'
```

### Issue 2: Contact was created successfully but you can't see it
**Problem**: Contact exists in CRM but in a different organization

**Solution**: Check ALL organizations for this email:
```bash
npx convex run debugCrmContact:findContactByEmail '{"email":"itsmetherealremington@gmail.com"}'
```

This shows contacts across ALL organizations.

### Issue 3: API is actually working
**Problem**: You think it's not working, but it is - just updating existing contact

**Solution**: Check the `isNewContact` field in API response:
- `isNewContact: true` = New contact created
- `isNewContact: false` = Existing contact updated

Also check `updatedAt` timestamp to see if it's being updated.

## Next Steps

After running the above commands, you'll know:

1. ✅ Whether the email exists as a CRM contact
2. ✅ Which organization it belongs to
3. ✅ What data it has (tags, company, source)
4. ✅ Whether API would create or update
5. ✅ Why it's "not working" (it probably IS working, just updating)

Share the output of these commands and I can help diagnose further!
