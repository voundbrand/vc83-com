# Template Usage Statistics Queries - Implementation Guide

## Overview

The `templateUsageStats.ts` module provides comprehensive backend queries for tracking template usage across the platform. This enables data-driven insights for template management, including template set membership, render counts, and recent activity.

## Location

**File:** `/Users/foundbrand_001/Development/vc83-com/convex/templateUsageStats.ts`

## Queries Implemented

### 1. `getTemplateUsageStats`

**Purpose:** Get comprehensive usage statistics for a single template.

**Arguments:**
- `sessionId: string` - User session for authentication
- `templateId: Id<"objects">` - The template to get stats for

**Returns:**
```typescript
{
  inSetCount: number;              // Number of template sets containing this template
  setIds: Id<"objects">[];         // IDs of template sets using this template
  lastUsed: number | null;         // Timestamp of last usage (null if never used)
  totalRenders: number;            // Total count of usage actions
  actionCounts: Record<string, number>; // Count by action type
  recentUsage: ObjectAction[];     // Last 10 usage actions
}
```

**Usage Example:**
```typescript
const stats = await ctx.runQuery(api.templateUsageStats.getTemplateUsageStats, {
  sessionId: "user-session-id",
  templateId: templateId,
});

console.log(`Template used ${stats.totalRenders} times`);
console.log(`In ${stats.inSetCount} template sets`);
```

### 2. `getTemplatesWithUsage`

**Purpose:** Get all templates for an organization with usage statistics attached.

**Arguments:**
- `sessionId: string` - User session for authentication
- `organizationId: Id<"organizations">` - Organization ID
- `subtype?: string` - Optional filter by template subtype (e.g., "email", "pdf_ticket")

**Returns:**
```typescript
Array<{
  ...template,           // All template fields
  usage: {
    inSetCount: number;  // Number of template sets
    lastUsed: number | null;
    totalRenders: number;
  }
}>
```

**Usage Example:**
```typescript
// Get all email templates with usage stats
const emailTemplates = await ctx.runQuery(
  api.templateUsageStats.getTemplatesWithUsage,
  {
    sessionId: "user-session-id",
    organizationId: orgId,
    subtype: "email",
  }
);

// Sort by most used
const sortedByUsage = emailTemplates.sort(
  (a, b) => b.usage.totalRenders - a.usage.totalRenders
);
```

### 3. `getTemplateSetUsageStats`

**Purpose:** Get usage statistics for all templates in a template set.

**Arguments:**
- `sessionId: string` - User session for authentication
- `setId: Id<"objects">` - Template set ID

**Returns:**
```typescript
{
  setId: Id<"objects">;
  setName: string;
  totalTemplates: number;       // Count of templates in set
  totalRenders: number;         // Sum of all template renders
  lastUsed: number | null;      // Most recent usage across all templates
  templates: Array<{
    templateId: Id<"objects">;
    templateName: string;
    templateType: string;
    lastUsed: number | null;
    totalRenders: number;
  }>;
}
```

**Usage Example:**
```typescript
const setStats = await ctx.runQuery(
  api.templateUsageStats.getTemplateSetUsageStats,
  {
    sessionId: "user-session-id",
    setId: templateSetId,
  }
);

console.log(`Set "${setStats.setName}" has ${setStats.totalTemplates} templates`);
console.log(`Total renders: ${setStats.totalRenders}`);
```

### 4. `getMostUsedTemplates`

**Purpose:** Get the most frequently used templates in an organization.

**Arguments:**
- `sessionId: string` - User session for authentication
- `organizationId: Id<"organizations">` - Organization ID
- `limit?: number` - Number of templates to return (default: 10)
- `subtype?: string` - Optional filter by template subtype

**Returns:**
```typescript
Array<{
  ...template,          // All template fields
  usageCount: number;   // Total usage count
  lastUsed: number | null;
}>
```

**Usage Example:**
```typescript
// Get top 5 most used PDF templates
const topPdfTemplates = await ctx.runQuery(
  api.templateUsageStats.getMostUsedTemplates,
  {
    sessionId: "user-session-id",
    organizationId: orgId,
    limit: 5,
    subtype: "pdf_ticket",
  }
);
```

## Action Types Tracked

The queries track the following action types from the `objectActions` table:

1. **`template_applied`** - Template was applied to a page
2. **`template_rendered`** - Template was rendered (general)
3. **`email_sent`** - Email was sent using this template
4. **`pdf_generated`** - PDF was generated using this template
5. **`template_used`** - Generic template usage event

## Data Sources

### objectLinks Table
- **LinkType:** `"includes_template"`
- **Direction:** Template is the `toObjectId` (target of the link)
- Used to count template set membership

### objectActions Table
- **Indexed by:** `by_object` (objectId)
- **Ordered by:** `performedAt` (descending for recent actions)
- Used to track usage events

## Performance Considerations

1. **Query Limits:**
   - `getTemplateUsageStats`: Takes up to 100 actions per template
   - `getTemplatesWithUsage`: Takes up to 20 actions per template (batched)
   - `getTemplateSetUsageStats`: Takes up to 20 actions per template
   - `getMostUsedTemplates`: Takes up to 100 actions per template

2. **Optimization Tips:**
   - Use `subtype` filter to reduce templates queried
   - Use `limit` parameter in `getMostUsedTemplates` to control results
   - Consider caching results for frequently accessed statistics

## Integration Points

### Frontend Integration

**Example: Template List with Usage Stats**
```typescript
const TemplatesList = () => {
  const templates = useQuery(api.templateUsageStats.getTemplatesWithUsage, {
    sessionId,
    organizationId,
    subtype: "email",
  });

  return (
    <div>
      {templates?.map(template => (
        <div key={template._id}>
          <h3>{template.name}</h3>
          <p>Used {template.usage.totalRenders} times</p>
          <p>In {template.usage.inSetCount} template sets</p>
          {template.usage.lastUsed && (
            <p>Last used: {new Date(template.usage.lastUsed).toLocaleDateString()}</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Backend Integration

**Example: Add Usage Tracking to Template Operations**
```typescript
// After rendering an email template
await ctx.db.insert("objectActions", {
  organizationId: template.organizationId,
  objectId: templateId,
  actionType: "email_sent",
  actionData: {
    recipientEmail: email,
    subject: emailSubject,
  },
  performedBy: userId,
  performedAt: Date.now(),
});
```

## Security & Permissions

All queries check for the `"view_templates"` permission before returning data. Users must:
1. Be authenticated (valid `sessionId`)
2. Have permission to view templates in the organization
3. Have valid organization membership

## Testing

**Manual Testing Commands:**
```typescript
// Test individual template stats
npx convex run templateUsageStats:getTemplateUsageStats \
  --sessionId "session-123" \
  --templateId "template-id"

// Test templates with usage
npx convex run templateUsageStats:getTemplatesWithUsage \
  --sessionId "session-123" \
  --organizationId "org-id" \
  --subtype "email"

// Test most used templates
npx convex run templateUsageStats:getMostUsedTemplates \
  --sessionId "session-123" \
  --organizationId "org-id" \
  --limit 5
```

## Future Enhancements

Potential additions to consider:

1. **Time-based filtering:**
   - Usage stats for specific date ranges
   - Trending analysis (usage increasing/decreasing)

2. **Advanced analytics:**
   - Usage by user/role
   - Geographic distribution of template usage
   - Conversion metrics for email/PDF templates

3. **Caching:**
   - Pre-computed usage statistics for popular templates
   - Real-time update triggers when actions are logged

4. **Export:**
   - CSV export of usage statistics
   - Dashboard visualizations

## Quality Checks

✅ **TypeScript**: No type errors
✅ **Linting**: No ESLint errors or warnings
✅ **Permissions**: All queries check RBAC permissions
✅ **Documentation**: Comprehensive JSDoc comments

## Author Notes

- Implementation follows existing ontology patterns
- Uses established objectLinks and objectActions tables
- Maintains consistency with template-related queries in `templateOntology.ts`
- All queries are authenticated and permission-checked
- Performance optimized with appropriate limits
