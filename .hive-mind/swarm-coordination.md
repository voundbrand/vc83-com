# L4YERCAK3.com Development Swarm Configuration

## Swarm Metadata
- **Swarm ID**: `swarm-1764273699293-17kk6gkl7`
- **Session ID**: `session-1764273699294-cd4twcu0t`
- **Name**: hive-1764273699285
- **Objective**: Initialize L4YERCAK3.com development swarm with 8 specialized agents for full-stack development coordination
- **Queen Type**: Strategic Coordinator
- **Topology**: Mesh (peer-to-peer with hierarchical oversight)
- **Strategy**: Parallel execution
- **Workers**: 8 specialized agents
- **Consensus**: Majority voting
- **Auto-scaling**: Enabled
- **Memory System**: ReasoningBank with SQLite persistence

## Agent Composition

### 1. Strategic Coordinator (Queen Agent)
**Type**: Hierarchical Coordinator
**Role**: Overall swarm orchestration and decision-making
**Responsibilities**:
- Task assignment and delegation
- Progress monitoring and bottleneck resolution
- Cross-agent coordination and conflict resolution
- Strategic planning and resource allocation

### 2. Requirements Analyst
**Type**: Researcher Agent
**Role**: Requirements analysis and specification
**Responsibilities**:
- Analyze project requirements and constraints
- Research best practices and architectural patterns
- Document technical specifications
- Identify dependencies and integration points

### 3. System Architect
**Type**: Architect Agent
**Role**: High-level system design and architecture
**Responsibilities**:
- Design system architecture and component relationships
- Define API contracts and data models
- Plan database schema and migration strategies
- Ensure scalability and maintainability

### 4. Backend Developer
**Type**: Coder Agent (Convex/TypeScript)
**Role**: Server-side implementation
**Responsibilities**:
- Implement Convex queries, mutations, and actions
- Develop backend business logic
- Create and maintain database schemas
- Integrate third-party services (Stripe, AI APIs)

### 5. Frontend Developer
**Type**: Coder Agent (React/Next.js)
**Role**: Client-side implementation
**Responsibilities**:
- Build React components and UI windows
- Implement window management and desktop UX
- Create responsive mobile layouts
- Integrate with Convex backend

### 6. QA Engineer
**Type**: Tester Agent
**Role**: Testing and quality assurance
**Responsibilities**:
- Write unit and integration tests
- Perform manual testing and validation
- Document bugs and edge cases
- Ensure code quality and test coverage

### 7. Performance Analyst
**Type**: Analyst Agent
**Role**: Performance optimization and monitoring
**Responsibilities**:
- Analyze performance bottlenecks
- Optimize database queries and API calls
- Monitor system metrics and resource usage
- Recommend architectural improvements

### 8. Documentation Specialist
**Type**: Researcher Agent
**Role**: Documentation and knowledge management
**Responsibilities**:
- Maintain technical documentation
- Create developer guides and API docs
- Document swarm coordination patterns
- Ensure knowledge transfer across sessions

## Coordination Protocol

### Pre-Task Hooks (MANDATORY)
Every agent MUST run these hooks before starting work:

```bash
# Load context and check previous work
npx claude-flow@alpha hooks pre-task \
  --description "[agent-specific task]" \
  --auto-spawn-agents false

# Restore session state and memory
npx claude-flow@alpha hooks session-restore \
  --session-id "session-1764273699294-cd4twcu0t" \
  --load-memory true
```

### During Work Hooks (REQUIRED)
After EVERY major step or file operation:

```bash
# Store progress in memory after file edits
npx claude-flow@alpha hooks post-edit \
  --file "[filepath]" \
  --memory-key "swarm/[agent-name]/[step]"

# Share decisions and findings with other agents
npx claude-flow@alpha hooks notify \
  --message "[what was accomplished]" \
  --telemetry true

# Check coordination with other agents
npx claude-flow@alpha hooks pre-search \
  --query "[what to verify]" \
  --cache-results true
```

### Post-Task Hooks (MANDATORY)
After completing work:

```bash
# Save all results and learnings
npx claude-flow@alpha hooks post-task \
  --task-id "[task-identifier]" \
  --analyze-performance true

# Generate session summary
npx claude-flow@alpha hooks session-end \
  --export-metrics true \
  --generate-summary true
```

## Memory Keys Hierarchy

All agents MUST use this structured memory key pattern:

```
swarm-1764273699293-17kk6gkl7/
├── coordinator/
│   ├── decisions/
│   ├── assignments/
│   └── status/
├── researcher/
│   ├── requirements/
│   ├── patterns/
│   └── constraints/
├── architect/
│   ├── designs/
│   ├── schemas/
│   └── apis/
├── backend-dev/
│   ├── convex/
│   ├── integrations/
│   └── apis/
├── frontend-dev/
│   ├── components/
│   ├── windows/
│   └── hooks/
├── qa-engineer/
│   ├── tests/
│   ├── bugs/
│   └── coverage/
├── performance-analyst/
│   ├── metrics/
│   ├── optimizations/
│   └── bottlenecks/
└── docs-specialist/
    ├── guides/
    ├── api-docs/
    └── patterns/
```

## Project Context

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Convex (serverless, real-time)
- **UI Theme**: Retro desktop (Windows 95-inspired)
- **Integrations**: Stripe, OpenAI, Resend, PostHog
- **Testing**: Vitest with React Testing Library

### Core Features
- Multi-tenant organization system with RBAC
- Retro desktop UI with window management
- CRM, invoicing, payments, events, tickets
- Forms, workflows, templates system
- AI integration with billing tiers
- OAuth and passkey authentication

### Key Directories
- `convex/`: Backend queries, mutations, schemas
- `src/app/`: Next.js app router pages
- `src/components/`: React components
- `src/components/window-content/`: Desktop window contents
- `src/hooks/`: Custom React hooks
- `src/templates/`: Email and PDF templates

## Development Quality Standards

### CRITICAL: Run After Each Change
```bash
npm run typecheck  # Check TypeScript errors
npm run lint       # Fix linting issues
```

### Before Committing
```bash
npm run build     # Ensure production build works
npm test          # Run all tests
```

## Communication Patterns

### Agent-to-Agent
Use Claude Flow memory system:
```bash
# Store for other agents to retrieve
npx claude-flow@alpha hooks notify \
  --message "Backend API endpoints implemented" \
  --telemetry true
```

### Agent-to-Coordinator
Use task status updates:
```bash
npx claude-flow@alpha hooks post-task \
  --task-id "implement-auth" \
  --analyze-performance true
```

### Cross-Session Persistence
All agents use ReasoningBank:
```bash
# Store reasoning patterns
npx claude-flow@alpha agent memory store \
  --pattern "[decision or pattern]" \
  --confidence 0.95
```

## Next Steps

1. ✅ Hive Mind system initialized
2. ✅ ReasoningBank memory system ready
3. ✅ Swarm metadata configured
4. ⏳ Spawn 8 agents using Claude Code Task tool
5. ⏳ Configure agent coordination hooks
6. ⏳ Establish task orchestration
7. ⏳ Verify swarm operational status
8. ⏳ Run system tests and validation

## Resume Command

To resume this swarm session later:
```bash
npx claude-flow@alpha hive-mind resume session-1764273699294-cd4twcu0t
```

---
Generated: 2025-11-27
