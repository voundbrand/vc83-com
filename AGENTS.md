# Agent Catalog & Usage Patterns

## Available Agents (54 Total)

### Core Development
| Agent | Purpose |
|-------|---------|
| `coder` | Implementation specialist |
| `reviewer` | Code quality assurance |
| `tester` | Test creation and validation |
| `planner` | Strategic planning |
| `researcher` | Information gathering |

### Swarm Coordination
| Agent | Purpose |
|-------|---------|
| `hierarchical-coordinator` | Queen-led coordination |
| `mesh-coordinator` | Peer-to-peer networks |
| `adaptive-coordinator` | Dynamic topology |
| `collective-intelligence-coordinator` | Hive-mind intelligence |
| `swarm-memory-manager` | Distributed memory |

### Consensus & Distributed Systems
| Agent | Purpose |
|-------|---------|
| `byzantine-coordinator` | Byzantine fault tolerance |
| `raft-manager` | Leader election protocols |
| `gossip-coordinator` | Epidemic dissemination |
| `consensus-builder` | Decision-making algorithms |
| `crdt-synchronizer` | Conflict-free replication |
| `quorum-manager` | Dynamic quorum management |
| `security-manager` | Cryptographic security |

### Performance & Optimization
| Agent | Purpose |
|-------|---------|
| `perf-analyzer` | Bottleneck identification |
| `performance-benchmarker` | Performance testing |
| `task-orchestrator` | Workflow optimization |
| `memory-coordinator` | Memory management |
| `smart-agent` | Intelligent coordination |

### GitHub & Repository
| Agent | Purpose |
|-------|---------|
| `github-modes` | Comprehensive GitHub integration |
| `pr-manager` | Pull request management |
| `code-review-swarm` | Multi-agent code review |
| `issue-tracker` | Issue management |
| `release-manager` | Release coordination |
| `workflow-automation` | CI/CD automation |
| `project-board-sync` | Project tracking |
| `repo-architect` | Repository optimization |
| `multi-repo-swarm` | Cross-repository coordination |

### SPARC Methodology
| Agent | Purpose |
|-------|---------|
| `sparc-coord` | SPARC orchestration |
| `sparc-coder` | TDD implementation |
| `specification` | Requirements analysis |
| `pseudocode` | Algorithm design |
| `architecture` | System design |
| `refinement` | Iterative improvement |

### Specialized Development
| Agent | Purpose |
|-------|---------|
| `backend-dev` | API development |
| `mobile-dev` | React Native development |
| `ml-developer` | Machine learning |
| `cicd-engineer` | CI/CD pipelines |
| `api-docs` | OpenAPI documentation |
| `system-architect` | High-level design |
| `code-analyzer` | Code quality analysis |
| `base-template-generator` | Boilerplate creation |

### Testing & Validation
| Agent | Purpose |
|-------|---------|
| `tdd-london-swarm` | Mock-driven TDD |
| `production-validator` | Real implementation validation |

### Migration & Planning
| Agent | Purpose |
|-------|---------|
| `migration-planner` | System migrations |
| `swarm-init` | Topology initialization |

---

## Concurrent Usage Patterns

### Full-Stack Development (8 agents)

```javascript
Task("System architecture", "...", "system-architect")
Task("Backend APIs", "...", "backend-dev")
Task("Frontend mobile", "...", "mobile-dev")
Task("Database design", "...", "coder")
Task("API documentation", "...", "api-docs")
Task("CI/CD pipeline", "...", "cicd-engineer")
Task("Performance testing", "...", "performance-benchmarker")
Task("Production validation", "...", "production-validator")
```

### Distributed Systems (6 agents)

```javascript
Task("Byzantine consensus", "...", "byzantine-coordinator")
Task("Raft coordination", "...", "raft-manager")
Task("Gossip protocols", "...", "gossip-coordinator")
Task("CRDT synchronization", "...", "crdt-synchronizer")
Task("Security management", "...", "security-manager")
Task("Performance monitoring", "...", "perf-analyzer")
```

### GitHub Workflow (5 agents)

```javascript
Task("PR management", "...", "pr-manager")
Task("Code review", "...", "code-review-swarm")
Task("Issue tracking", "...", "issue-tracker")
Task("Release coordination", "...", "release-manager")
Task("Workflow automation", "...", "workflow-automation")
```

### SPARC TDD (7 agents)

```javascript
Task("Requirements spec", "...", "specification")
Task("Algorithm design", "...", "pseudocode")
Task("System architecture", "...", "architecture")
Task("TDD implementation", "...", "sparc-coder")
Task("London school tests", "...", "tdd-london-swarm")
Task("Iterative refinement", "...", "refinement")
Task("Production validation", "...", "production-validator")
```

---

## Agent Selection Strategy

| Priority | Agent Count | Use Case |
|----------|-------------|----------|
| High | 3-5 | Critical path tasks |
| Medium | 5-8 | Complex features |
| Large | 8-12 | Multi-component projects |

### Memory Management Tips

- Use `memory-coordinator` for cross-agent state
- Use `swarm-memory-manager` for distributed coordination
- Use `collective-intelligence-coordinator` for decision-making

---

## Agent Prompt Template

When spawning agents, include coordination instructions:

```
You are the [Agent Type] agent in a coordinated swarm.

MANDATORY COORDINATION:
1. START: Run `npx claude-flow@alpha hooks pre-task --description "[task]"`
2. DURING: After each file op, run `npx claude-flow@alpha hooks post-edit --file "[file]"`
3. MEMORY: Store decisions using `npx claude-flow@alpha hooks notify --message "[decision]"`
4. END: Run `npx claude-flow@alpha hooks post-task --task-id "[task]"`

Your task: [detailed description]

Coordinate with other agents by checking memory BEFORE making decisions.
```