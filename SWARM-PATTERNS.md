# Swarm Patterns & Workflows

## MCP Tool Reference

### Coordination Tools
| Tool | Purpose |
|------|---------|
| `mcp__claude-flow__swarm_init` | Set up coordination topology |
| `mcp__claude-flow__agent_spawn` | Create cognitive patterns |
| `mcp__claude-flow__task_orchestrate` | Break down complex tasks |

### Monitoring Tools
| Tool | Purpose |
|------|---------|
| `mcp__claude-flow__swarm_status` | Coordination effectiveness |
| `mcp__claude-flow__agent_list` | Active cognitive patterns |
| `mcp__claude-flow__agent_metrics` | Coordination performance |
| `mcp__claude-flow__task_status` | Workflow progress |
| `mcp__claude-flow__task_results` | Coordination outcomes |
| `mcp__claude-flow__swarm_monitor` | Real-time tracking |

### Memory & Neural Tools
| Tool | Purpose |
|------|---------|
| `mcp__claude-flow__memory_usage` | Persistent memory |
| `mcp__claude-flow__neural_status` | Pattern effectiveness |
| `mcp__claude-flow__neural_train` | Improve patterns |
| `mcp__claude-flow__neural_patterns` | Analyze approaches |

### GitHub Integration Tools
| Tool | Purpose |
|------|---------|
| `mcp__claude-flow__github_swarm` | GitHub management swarms |
| `mcp__claude-flow__repo_analyze` | Repository analysis |
| `mcp__claude-flow__pr_enhance` | PR improvements |
| `mcp__claude-flow__issue_triage` | Issue classification |
| `mcp__claude-flow__code_review` | Automated code review |

### System Tools
| Tool | Purpose |
|------|---------|
| `mcp__claude-flow__benchmark_run` | Coordination efficiency |
| `mcp__claude-flow__features_detect` | Available capabilities |

---

## Complete Workflow Example

### Task: Build REST API with Auth

**Message 1: Initialize & Spawn**

```javascript
[BatchTool]:
  // MCP coordination
  mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 8, strategy: "parallel" }
  mcp__claude-flow__agent_spawn { type: "system-architect", name: "System Designer" }
  mcp__claude-flow__agent_spawn { type: "coder", name: "API Developer" }
  mcp__claude-flow__agent_spawn { type: "coder", name: "Auth Expert" }
  mcp__claude-flow__agent_spawn { type: "code-analyzer", name: "DB Designer" }
  mcp__claude-flow__agent_spawn { type: "tester", name: "Test Engineer" }
  mcp__claude-flow__agent_spawn { type: "task-orchestrator", name: "Lead" }

  // All todos at once
  TodoWrite { todos: [
    { id: "design", content: "Design API architecture", status: "in_progress", priority: "high" },
    { id: "auth", content: "Implement authentication", status: "pending", priority: "high" },
    { id: "db", content: "Design database schema", status: "pending", priority: "high" },
    { id: "api", content: "Build REST endpoints", status: "pending", priority: "high" },
    { id: "tests", content: "Write comprehensive tests", status: "pending", priority: "medium" },
    { id: "docs", content: "Document API endpoints", status: "pending", priority: "low" },
    { id: "deploy", content: "Setup deployment pipeline", status: "pending", priority: "medium" },
    { id: "monitor", content: "Add monitoring", status: "pending", priority: "medium" }
  ]}

  // Start orchestration
  mcp__claude-flow__task_orchestrate { task: "Build REST API", strategy: "parallel" }
  mcp__claude-flow__memory_usage { action: "store", key: "project/init", value: { started: Date.now() } }
```

**Message 2: Create Structure**

```javascript
[BatchTool]:
  // All directories
  Bash("mkdir -p api/{src,tests,docs,config}")
  Bash("mkdir -p api/src/{models,routes,middleware,services}")
  Bash("mkdir -p api/tests/{unit,integration}")

  // All base files
  Write("api/package.json", packageJsonContent)
  Write("api/.env.example", envContent)
  Write("api/README.md", readmeContent)
  Write("api/src/server.js", serverContent)
  Write("api/src/config/database.js", dbConfigContent)
```

**Message 3: Implementation**

```javascript
[BatchTool]:
  // Read for context
  Read("api/package.json")
  Read("api/src/server.js")

  // Run commands
  Bash("cd api && npm install")
  Bash("cd api && npm run lint")
  Bash("cd api && npm test")
```

---

## Memory Coordination Pattern

```javascript
// Store after each major step
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm-{id}/agent-{name}/{step}",
  value: {
    timestamp: Date.now(),
    decision: "what was decided",
    implementation: "what was built",
    nextSteps: ["step1", "step2"],
    dependencies: ["dep1", "dep2"]
  }
}

// Retrieve coordination data
mcp__claude-flow__memory_usage {
  action: "retrieve",
  key: "swarm-{id}/agent-{name}/{step}"
}

// List all swarm progress
mcp__claude-flow__memory_usage {
  action: "list",
  pattern: "swarm-{id}/*"
}
```

---

## Visual Swarm Status

```
🐝 Swarm Status: ACTIVE
├── 🏗️ Topology: hierarchical
├── 👥 Agents: 6/8 active
├── ⚡ Mode: parallel execution
├── 📊 Tasks: 12 total (4 ✅, 6 🔄, 2 ⭕)
└── 🧠 Memory: 15 coordination points

Agent Activity:
├── 🟢 system-architect: Designing schema...
├── 🟢 coder-1: Implementing auth...
├── 🟢 coder-2: Building CRUD...
├── 🟢 code-analyzer: Optimizing queries...
├── 🟡 tester: Waiting for auth...
└── 🟢 task-orchestrator: Monitoring...
```

---

## SPARC Methodology Phases

### 1. Specification
```bash
npx claude-flow sparc run spec-pseudocode "Define requirements" --parallel
```

### 2. Pseudocode
```bash
npx claude-flow sparc run spec-pseudocode "Create flow pseudocode" --batch-optimize
```

### 3. Architecture
```bash
npx claude-flow sparc run architect "Design service architecture" --parallel
```

### 4. Refinement (TDD)
```bash
npx claude-flow sparc tdd "implement system" --batch-tdd
```

### 5. Completion
```bash
npx claude-flow sparc run integration "integrate components" --parallel
```

---

## Hooks Reference

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources
- Optimize topology
- Cache searches
- Load GitHub context

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage
- Sync GitHub state

### Session Management
- Generate summaries at session end
- Persist state across sessions
- Track metrics
- Restore previous context
- Export workflows

---

## Best Practices

### Do
- Use MCP tools to coordinate complex tasks
- Let swarm break down problems
- Use memory for cross-session context
- Monitor with status tools
- Train neural patterns

### Don't
- Expect agents to write code (Claude Code does that)
- Use MCP for file operations
- Make agents execute bash
- Send sequential messages for related ops

---

## Performance Tips

1. **Batch Everything** - Never single-file operations
2. **Parallel First** - What can run simultaneously?
3. **Memory is Key** - Use for ALL coordination
4. **Monitor Progress** - Real-time tracking
5. **Auto-Optimize** - Let hooks handle selection

---

## Resources

- Docs: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Examples: https://github.com/ruvnet/claude-flow/tree/main/examples