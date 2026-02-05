# L4YERCAK3 Builder Mode Architecture

## Overview

This document describes the three-mode architecture for the page builder that separates rapid prototyping from data integration.

## The Problem

Currently, the builder tries to do too much at once:
1. Generate page JSON structure
2. Create real database records (products, events, etc.)
3. Validate against existing data
4. Handle duplicates

This leads to friction during the creative/exploration phase:
- "A product named X already exists" errors interrupt flow
- Users can't quickly iterate on designs
- Every generation triggers validation against real data

## The Solution: Three Modes

### Mode 1: Prototype (Default)

**Purpose:** Fast iteration, design exploration, no side effects

**Behavior:**
- Generates page JSON only
- Uses placeholder/mock data for products, events, pricing
- NO database writes
- NO duplicate checking
- NO tool execution (tools are disabled or return mock results)
- Perfect for:
  - Initial design exploration
  - Testing different layouts
  - Creating training data
  - Quick "what if" scenarios

**UI Indicators:**
- Badge: "Prototype Mode"
- Color: Blue/Cyan
- Icon: Pencil/Draft icon
- Warning: "This page uses placeholder data"

**Data Flow:**
```
User Input → AI → Page JSON → Preview
                     ↓
              (No DB writes)
```

**Tools Available:**
- `generate_page` - Creates page JSON
- `modify_section` - Edits sections
- `suggest_content` - AI content suggestions
- All database tools DISABLED or return mock results

### Mode 2: Connect

**Purpose:** Link prototype to real data with full validation

**Behavior:**
- Takes existing prototype page JSON
- Identifies sections that need real data (pricing, products, events)
- Shows connection panel for each section
- Runs full tooling pipeline with validation
- Creates real database records
- Handles duplicates with user prompts
- Perfect for:
  - Finalizing a design
  - Publishing a page
  - Connecting to real products/events

**UI Indicators:**
- Badge: "Connect Mode"
- Color: Green
- Icon: Link/Plug icon
- Panel: "Connect to Data" sidebar

**Data Flow:**
```
Prototype JSON → Analyze Sections → Show Connection Panel
                                          ↓
                                   For each section:
                                   - Check existing data
                                   - Validate constraints
                                   - User confirms/creates
                                          ↓
                                   Connected Page JSON
                                          ↓
                                   Save to Database
```

**Connection Panel UI:**
```
┌─────────────────────────────────────────┐
│ Connect to Data                    [X]  │
├─────────────────────────────────────────┤
│                                         │
│ 📦 Pricing Section                      │
│    3 products detected                  │
│    [Create New] [Link Existing]         │
│                                         │
│    • Trial Lesson - €89                 │
│      ○ Create as new product            │
│      ○ Link to: "Schnupperkurs" ▼       │
│      ○ Skip (use placeholder)           │
│                                         │
│    • Basic Course - €599                │
│      ⚠️ Similar: "Grundkurs" exists     │
│      ○ Use existing "Grundkurs"         │
│      ○ Create new with this name        │
│      ○ Rename to: [____________]        │
│                                         │
├─────────────────────────────────────────┤
│ 📅 Events Section                       │
│    1 event detected                     │
│    • Summer Camp 2024                   │
│      ○ Create as new event              │
│      ○ Link to existing ▼               │
│                                         │
├─────────────────────────────────────────┤
│         [Cancel]  [Connect All]         │
└─────────────────────────────────────────┘
```

**Tools Available:**
- All tools from main chat (create_product, create_event, etc.)
- Full validation enabled
- Duplicate checking with user prompts
- Tool approval workflow

### Mode 3: Edit

**Purpose:** Modify connected pages, update linked records

**Behavior:**
- Works with already-saved pages
- Changes propagate to linked records
- Full undo/history support
- Version control
- Perfect for:
  - Updating content
  - Changing prices
  - Modifying design after launch

**UI Indicators:**
- Badge: "Editing: [Page Name]"
- Color: Orange/Amber
- Icon: Edit icon
- Shows linked data status

**Data Flow:**
```
Load Saved Page → Identify Links → Track Changes
                                        ↓
                               User makes edits
                                        ↓
                               Detect affected records
                                        ↓
                               Preview changes:
                               - Page content
                               - Product prices
                               - Event details
                                        ↓
                               Save all changes
```

## Implementation Plan

### Phase 1: Mode State Management

Add mode state to BuilderContext:

```typescript
type BuilderMode = "prototype" | "connect" | "edit";

interface BuilderState {
  mode: BuilderMode;
  prototypePageJson: AIGeneratedPageSchema | null;
  connectedPageId: string | null;
  pendingConnections: SectionConnection[];
  linkedRecords: LinkedRecord[];
}

interface SectionConnection {
  sectionId: string;
  sectionType: string;
  detectedItems: DetectedItem[];
  connectionStatus: "pending" | "connected" | "skipped";
}

interface DetectedItem {
  type: "product" | "event" | "contact";
  placeholderData: Record<string, unknown>;
  existingMatches: ExistingRecord[];
  connectionChoice: "create" | "link" | "skip" | null;
  linkedRecordId: string | null;
}
```

### Phase 2: Prototype Mode Implementation

1. **Disable tool execution in prototype mode:**
```typescript
// In chat.ts sendMessage handler
if (context === "page_builder" && builderMode === "prototype") {
  // Don't include database tools in available_tools
  tools = tools.filter(t => PROTOTYPE_ALLOWED_TOOLS.includes(t.name));
}
```

2. **System prompt adjustment:**
```typescript
const prototypeSystemPrompt = `
You are in PROTOTYPE MODE. Generate page designs freely without
database operations. Use realistic placeholder data:
- Product names and prices (will be connected later)
- Event details (dates, locations)
- Contact information (will be linked to CRM)

Do NOT call tools that create database records.
Focus on layout, structure, and content suggestions.
`;
```

3. **Mock tool responses for preview:**
```typescript
const mockToolResponse = (toolName: string, args: any) => {
  if (toolName === "create_product") {
    return {
      success: true,
      mockMode: true,
      product: {
        id: `mock_${Date.now()}`,
        name: args.name,
        price: args.price,
        status: "placeholder"
      }
    };
  }
};
```

### Phase 3: Connect Mode Implementation

1. **Section analyzer:**
```typescript
function analyzePageForConnections(pageJson: AIGeneratedPageSchema): SectionConnection[] {
  const connections: SectionConnection[] = [];

  for (const section of pageJson.sections) {
    if (section.type === "pricing") {
      connections.push({
        sectionId: section.id,
        sectionType: "pricing",
        detectedItems: section.props.tiers?.map(tier => ({
          type: "product",
          placeholderData: {
            name: tier.name,
            price: tier.price,
            description: tier.description
          },
          existingMatches: [], // Populated by search
          connectionChoice: null,
          linkedRecordId: null
        })) || []
      });
    }

    if (section.type === "team") {
      // Detect contacts to link
    }

    if (section.type === "process" && hasEventMarkers(section)) {
      // Detect events
    }
  }

  return connections;
}
```

2. **Existing record matcher:**
```typescript
async function findExistingMatches(item: DetectedItem, orgId: string) {
  if (item.type === "product") {
    const products = await searchProducts({
      orgId,
      query: item.placeholderData.name,
      fuzzy: true
    });

    return products.map(p => ({
      id: p._id,
      name: p.name,
      similarity: calculateSimilarity(item.placeholderData.name, p.name),
      isExactMatch: p.name.toLowerCase() === item.placeholderData.name.toLowerCase()
    }));
  }
}
```

3. **Connection executor:**
```typescript
async function executeConnections(
  pageJson: AIGeneratedPageSchema,
  connections: SectionConnection[]
): Promise<{ updatedPageJson: AIGeneratedPageSchema; createdRecords: string[] }> {
  const createdRecords: string[] = [];
  const updatedPageJson = { ...pageJson };

  for (const conn of connections) {
    for (const item of conn.detectedItems) {
      if (item.connectionChoice === "create") {
        const record = await createRecord(item);
        createdRecords.push(record._id);
        item.linkedRecordId = record._id;
      } else if (item.connectionChoice === "link") {
        item.linkedRecordId = item.selectedExistingId;
      }
    }

    // Update page JSON with linked record IDs
    updateSectionWithLinks(updatedPageJson, conn);
  }

  return { updatedPageJson, createdRecords };
}
```

### Phase 4: UI Components

1. **Mode Switcher:**
```tsx
function ModeSwitcher({ mode, onModeChange, canConnect, canEdit }) {
  return (
    <div className="flex gap-2">
      <ModeButton
        active={mode === "prototype"}
        onClick={() => onModeChange("prototype")}
        icon={<Pencil />}
        label="Prototype"
        color="cyan"
      />
      <ModeButton
        active={mode === "connect"}
        onClick={() => onModeChange("connect")}
        icon={<Link />}
        label="Connect"
        color="green"
        disabled={!canConnect}
        tooltip={!canConnect ? "Generate a prototype first" : undefined}
      />
      <ModeButton
        active={mode === "edit"}
        onClick={() => onModeChange("edit")}
        icon={<Edit />}
        label="Edit"
        color="amber"
        disabled={!canEdit}
        tooltip={!canEdit ? "Save a page first" : undefined}
      />
    </div>
  );
}
```

2. **Connection Panel:**
```tsx
function ConnectionPanel({ connections, onConnectionChoice, onExecute }) {
  return (
    <div className="connection-panel">
      <h3>Connect to Data</h3>

      {connections.map(conn => (
        <ConnectionSection key={conn.sectionId} connection={conn}>
          {conn.detectedItems.map(item => (
            <ConnectionItem
              key={item.id}
              item={item}
              onChoice={(choice) => onConnectionChoice(conn.sectionId, item.id, choice)}
            />
          ))}
        </ConnectionSection>
      ))}

      <div className="actions">
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary" onClick={onExecute}>
          Connect All
        </Button>
      </div>
    </div>
  );
}
```

### Phase 5: Training Data Benefits

Prototype mode is perfect for collecting training data because:

1. **Clean outputs:** No database IDs or real record references
2. **Faster iteration:** Users can generate many variations quickly
3. **Realistic examples:** Placeholder data looks like real data
4. **No cleanup needed:** Failed experiments don't create orphan records

**Training data collection in prototype mode:**
```typescript
function collectPrototypeTrainingExample(
  userMessage: string,
  generatedPageJson: AIGeneratedPageSchema
) {
  return {
    input: {
      userMessage,
      mode: "prototype"
    },
    output: {
      response: JSON.stringify(generatedPageJson),
      generatedJson: generatedPageJson
    },
    quality: {
      validJson: true,
      isHighQuality: true, // Prototype outputs are clean
      source: "prototype_mode"
    }
  };
}
```

## Migration Path

1. **Phase 1:** Add mode state, default to "prototype" for new conversations
2. **Phase 2:** Implement prototype mode tool filtering
3. **Phase 3:** Build connection analyzer and UI
4. **Phase 4:** Add edit mode for existing pages
5. **Phase 5:** Collect training data from prototype mode

## Summary

| Mode | Purpose | Tools | DB Writes | Validation |
|------|---------|-------|-----------|------------|
| Prototype | Fast iteration | Limited | None | None |
| Connect | Link to real data | Full | Yes | Full |
| Edit | Update existing | Full | Yes | Full |

This architecture lets users:
1. **Explore freely** in prototype mode without friction
2. **Connect intentionally** when ready to use real data
3. **Edit confidently** with full validation and history
