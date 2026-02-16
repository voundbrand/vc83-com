# Claude Code Configuration - SPARC Development Environment



## Core Principles

**Claude Flow coordinates, Claude Code executes.** MCP tools handle planning and memory; Claude Code does all file operations, code generation, and bash commands.

## Critical Rules

### 1. Batch All Operations in Single Messages

Every message should contain ALL related operations:

```javascript
// ✅ CORRECT: Everything in ONE message
[Single Message]:
  - TodoWrite { todos: [5-10+ todos] }
  - Task("Agent 1 with full instructions")
  - Task("Agent 2 with full instructions")
  - Read("file1.js"), Read("file2.js")
  - Write("output1.js"), Write("output2.js")
  - Bash("npm install && npm test && npm build")
```

**Never send sequential messages for related operations.**

### 2. Tool Responsibilities

**Claude Code executes:**
- All file operations (Read, Write, Edit, MultiEdit)
- All bash commands and system operations
- All code generation and implementation
- TodoWrite and task management
- Git operations, testing, debugging

**MCP Tools coordinate:**
- `swarm_init` - Set up coordination topology
- `agent_spawn` - Create cognitive patterns
- `task_orchestrate` - Break down complex tasks
- `memory_usage` - Persistent context storage
- `swarm_status/monitor` - Track progress

### 3. TodoWrite Requirements

Always batch 5-10+ todos in ONE call with priorities and statuses:

```javascript
TodoWrite { todos: [
  { id: "1", content: "Design architecture", status: "in_progress", priority: "high" },
  { id: "2", content: "Implement core", status: "pending", priority: "high" },
  { id: "3", content: "Write tests", status: "pending", priority: "medium" },
  // ... continue for 5-10+ todos
]}
```

### 4. Agent Coordination Protocol

Every spawned agent MUST use coordination hooks:

```bash
# Before work
npx claude-flow@alpha hooks pre-task --description "[task]"

# After each file operation
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "agent/[step]"

# After completion
npx claude-flow@alpha hooks post-task --task-id "[task]" --analyze-performance true
```

### 5. Agent Count Selection

1. Check CLI args first: `npx claude-flow@alpha --agents N`
2. If no args, auto-decide by complexity:
   - Simple (1-3 components): 3-4 agents
   - Medium (4-6 components): 5-7 agents
   - Complex (7+ components): 8-12 agents

## Quick Reference

### Standard Commands
```bash
npm run build      # Build project
npm run test       # Run tests
npm run lint       # Lint and format
npm run typecheck  # TypeScript checks
```

### SPARC Commands
```bash
npx claude-flow sparc run <mode> "<task>"     # Execute SPARC mode
npx claude-flow sparc tdd "<feature>"         # TDD workflow
npx claude-flow sparc batch <modes> "<task>"  # Parallel modes
```

### MCP Setup
```bash
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

## DANGEROUS COMMANDS — ALWAYS ASK FIRST

**NEVER run these commands without explicit user approval:**

### Git destructive commands (can destroy uncommitted work):
- `git stash` — moves all uncommitted changes to stash, effectively wiping working tree
- `git checkout .` / `git restore .` — discards all local changes
- `git reset --hard` — destroys commits and changes
- `git clean -f` — deletes untracked files permanently
- `git push --force` — overwrites remote history

### Convex deployment commands (can push schema/code to live backend):
- `npx convex dev` — starts live sync that auto-deploys on file changes
- `npx convex dev --once` — single deploy push to Convex backend (changes types, can break other files)
- `npx convex deploy` — production deployment

### Safe alternatives to use instead:
- **TypeScript check (scoped):** `npx tsc --noEmit --pretty -- <files>` — check only the files you changed (local only, no side effects)
- **TypeScript check (full):** `npx tsc --noEmit` — full project check (local only, slower, use sparingly)
- **Lint check:** `npm run lint` (local only)
- **Build check:** `npm run build` (local only)
- **Check git status:** `git status` / `git diff` (read-only)

**Rule:** After making changes, prefer scoped type checks on the files you touched: `npx tsc --noEmit --pretty -- file1.ts file2.ts`. Only run full `npx tsc --noEmit` when needed for cross-file validation. Never use `npx convex dev` for type checking — it deploys code.

## Code Style

- Keep files under 500 lines
- Never hardcode secrets
- Write tests before implementation
- Separate concerns cleanly
- Document architectural decisions

## Visual Status Format

```
📊 Progress: 12 tasks (4 ✅, 6 🔄, 2 ⭕)

🔄 In Progress
   ├── 🔴 001: Design API [HIGH]
   └── 🟡 002: Build endpoints [MED]

📋 Todo
   └── 🟢 003: Documentation [LOW]
```

Priority: 🔴 HIGH, 🟡 MEDIUM, 🟢 LOW

---

See `docs/AGENTS.md` for agent catalog and `docs/SWARM-PATTERNS.md` for detailed workflows.

# 6 - App Registrations
We have a specific method for creating new modules in our code, see: `/Users/foundbrand_001/Development/vc83-com-benefits-platform/docs/APP_REGISTRATION_WORKFLOW.md`