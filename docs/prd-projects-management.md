# Product Requirements Document: Projects Management Application

## Executive Summary

The Projects Management Application is a comprehensive project tracking system that enables organizations to manage projects, link them to CRM entities (clients, contacts), track milestones and tasks, and maintain project documentation. This feature leverages the existing ontology framework to provide flexible, scalable project management capabilities integrated with the platform's CRM and event management systems.

## Background & Context

### Current State
- Organizations can manage events, CRM contacts/organizations, and workflows
- The ontology system (objects table) provides universal data storage
- Events UI demonstrates effective patterns for complex entity management

### Problem Statement
Organizations need to:
- Track multiple projects across different clients and teams
- Link projects to CRM entities (organizations and contacts)
- Manage project milestones, tasks, and deliverables
- Monitor project status and progress
- Store project-specific documentation and files
- Generate reports on project performance

### Opportunity
By implementing a projects management system using the ontology framework, we can provide organizations with:
- Unified view of all project work
- Strong connections between projects and CRM data
- Flexible project workflows and status tracking
- Foundation for future enhancements (time tracking, billing, etc.)

## Goals & Success Metrics

### Business Goals
- Enable organizations to manage 10+ concurrent projects effectively
- Reduce project status tracking overhead by 50%
- Increase project completion rate by 30% through better visibility
- Support project-based billing workflows (future)

### User Goals
- **Project Managers**: Track all projects in one place with clear status indicators
- **Team Members**: Know what tasks are assigned and their priorities
- **Executives**: Get high-level view of project portfolio health
- **Clients**: View project progress (future: client portal)

### Success Metrics
- 80%+ of organizations using projects feature within 3 months
- Average 15+ projects created per organization
- 90%+ task completion rate for active projects
- < 2 seconds page load time for project list
- NPS score of 8+ for projects feature

## User Personas

### Primary: Project Manager (Sarah)
- **Role**: Manages 5-10 projects simultaneously
- **Goals**: Track progress, manage resources, meet deadlines
- **Pain Points**: Context switching between tools, manual status updates
- **Tech Savvy**: Medium (comfortable with modern web apps)

### Secondary: Team Member (Alex)
- **Role**: Works on 2-3 projects, executes tasks
- **Goals**: Know what to work on, update task status, collaborate
- **Pain Points**: Unclear priorities, losing track of assignments
- **Tech Savvy**: Medium

### Tertiary: Executive (Maria)
- **Role**: Oversees project portfolio
- **Goals**: Monitor overall health, identify at-risk projects
- **Pain Points**: Too much detail, needs high-level insights
- **Tech Savvy**: Low (prefers simple dashboards)

## Functional Requirements

### 1. Project Management

#### 1.1 Create Project
- **User Story**: As a project manager, I want to create a new project so I can start tracking work
- **Acceptance Criteria**:
  - Form with fields: project name (required), type, status, description
  - Project types: client_project, internal, campaign, product_development, research, other
  - Initial status: draft, planning, active, on_hold, completed, cancelled
  - Start date and target end date (date + time with timezone)
  - Budget (optional): amount and currency
  - Link to CRM organization (client) - optional but recommended
  - Priority: low, medium, high, critical
  - Tags for categorization (comma-separated or multi-select)
  - Rich text description editor
  - Auto-generate project code (e.g., PRJ-2025-001)
  - Custom fields support via customProperties

#### 1.2 View Projects List
- **User Story**: As a project manager, I want to see all projects in a filterable list
- **Acceptance Criteria**:
  - Grid view similar to events list (cards with key info)
  - Filter by: type, status, priority, client/organization, date range, tags
  - Search by project name, code, or description
  - Sort by: created date, start date, end date, priority, status
  - Status badges with appropriate colors
  - Progress indicators (percentage or visual bar)
  - Quick actions: Edit, Archive, View Details, Duplicate
  - Responsive design (mobile-friendly)
  - Pagination or infinite scroll for large datasets
  - Batch operations: bulk status update, archive, export

#### 1.3 View Project Details
- **User Story**: As a team member, I want to see all project information in one place
- **Acceptance Criteria**:
  - Project header with name, code, status, priority
  - Overview section: description, dates, budget, progress
  - Client/organization details (if linked)
  - Team members section (linked contacts with roles)
  - Milestones section (see 2. Milestones)
  - Tasks section (see 3. Tasks)
  - Documents/media section
  - Activity log (audit trail of changes)
  - Project timeline visualization (Gantt-style view - Phase 2)
  - Export options: PDF report, CSV data

#### 1.4 Edit Project
- **User Story**: As a project manager, I want to update project details as things change
- **Acceptance Criteria**:
  - Inline editing for quick updates
  - Full form for comprehensive changes
  - Change history tracking (who changed what when)
  - Validation: end date cannot be before start date
  - Autosave for description field
  - Confirmation modal for status changes
  - Notify team members of significant changes (optional)

#### 1.5 Archive/Delete Project
- **User Story**: As a project manager, I want to archive completed projects
- **Acceptance Criteria**:
  - Archive moves project to archived state (soft delete)
  - Archived projects hidden from main view but searchable
  - Restore from archive option
  - Hard delete only for drafts (with confirmation)
  - Prevent deletion of projects with active tasks
  - Export project data before deletion

### 2. Milestone Management

#### 2.1 Create Milestone
- **User Story**: As a project manager, I want to define key milestones
- **Acceptance Criteria**:
  - Add milestone to project (must have project ID)
  - Fields: name, description, due date, status (pending, in_progress, completed, missed)
  - Link to specific deliverables or tasks
  - Set milestone as "critical" flag
  - Order/sequence milestones within project
  - Notification when milestone is approaching (Phase 2)

#### 2.2 View Milestones
- **User Story**: As a team member, I want to see upcoming milestones
- **Acceptance Criteria**:
  - Timeline view of milestones on project detail page
  - Filter: all, pending, completed, missed
  - Visual indicators for overdue milestones
  - Progress tracking (% complete based on tasks)
  - Export milestone list

#### 2.3 Update Milestone Status
- **User Story**: As a project manager, I want to mark milestones as complete
- **Acceptance Criteria**:
  - One-click status change
  - Auto-record completion date
  - Completion confirmation modal
  - Trigger notifications to stakeholders (Phase 2)

### 3. Task Management

#### 3.1 Create Task
- **User Story**: As a project manager, I want to break down work into tasks
- **Acceptance Criteria**:
  - Add task to project (must have project ID)
  - Fields: title, description, assigned to (contact ID), priority, status
  - Task status: todo, in_progress, blocked, completed, cancelled
  - Due date and estimated hours
  - Link to milestone (optional)
  - Task dependencies (blocks/blocked by) - Phase 2
  - Checklist within task for sub-items
  - Labels/tags for categorization

#### 3.2 View Tasks
- **User Story**: As a team member, I want to see my assigned tasks
- **Acceptance Criteria**:
  - Tasks list on project detail page
  - Filter by assignee, status, priority, milestone
  - Sort by due date, priority, created date
  - My Tasks view (user-specific filter)
  - Overdue tasks highlighted
  - Kanban board view option (Phase 2)
  - Calendar view option (Phase 2)

#### 3.3 Update Task Status
- **User Story**: As a team member, I want to update task status as I work
- **Acceptance Criteria**:
  - Drag and drop status changes (kanban style)
  - Inline status dropdown
  - Quick complete button
  - Time tracking integration (Phase 2)
  - Comment on task with updates
  - Notify project manager of status changes

### 4. Project-CRM Integration

#### 4.1 Link Project to Client
- **User Story**: As a project manager, I want to associate projects with clients
- **Acceptance Criteria**:
  - Select CRM organization as client during project creation
  - Change client after creation
  - View all projects for a specific client (CRM org detail page)
  - Auto-populate client billing information (Phase 2)
  - Client-level project performance analytics (Phase 2)

#### 4.2 Link Team Members
- **User Story**: As a project manager, I want to assign team members to projects
- **Acceptance Criteria**:
  - Add contact (CRM contact) to project as team member
  - Assign role: project_manager, team_lead, contributor, observer
  - Set permissions per role (what they can edit)
  - Remove team members from project
  - View all projects for a team member
  - Capacity planning view (how many projects per person) - Phase 2

#### 4.3 Project Contacts Widget
- **User Story**: As a team member, I want to quickly contact people on the project
- **Acceptance Criteria**:
  - Contact cards on project detail showing avatar, name, role
  - Click to email or call (if contact info available)
  - Status indicator (online/offline) - Phase 2
  - Add new contact directly from project

### 5. Project Media & Documents

#### 5.1 Upload Project Files
- **User Story**: As a team member, I want to attach relevant documents
- **Acceptance Criteria**:
  - Upload files to project (images, PDFs, documents, etc.)
  - Use existing organizationMedia table
  - Link media to project via customProperties (similar to events)
  - Categorize files: contract, spec, design, report, other
  - Version control for documents (Phase 2)
  - Maximum file size: 50MB (configurable)

#### 5.2 View Project Files
- **User Story**: As a team member, I want to find project documents quickly
- **Acceptance Criteria**:
  - File list with thumbnails (for images)
  - Filter by file type, category, uploaded date
  - Search file names
  - Download or preview files
  - Share file link with team
  - File permissions (who can view/download) - Phase 2

### 6. Project Analytics & Reporting

#### 6.1 Project Dashboard
- **User Story**: As a project manager, I want to see project health at a glance
- **Acceptance Criteria**:
  - Progress gauge (% complete)
  - Status indicators: on track, at risk, behind
  - Budget tracking: spent vs. allocated
  - Timeline: days remaining until target end date
  - Task completion rate
  - Milestone completion status
  - Recent activity feed

#### 6.2 Portfolio View
- **User Story**: As an executive, I want to see all projects' health
- **Acceptance Criteria**:
  - Grid of project cards with key metrics
  - Color-coded status (green, yellow, red)
  - Filter by client, status, team member
  - Sort by risk level, end date, budget
  - Export portfolio report (PDF/CSV)
  - Drill down to project details

#### 6.3 Time Tracking (Phase 2)
- **User Story**: As a team member, I want to log time spent on tasks
- **Acceptance Criteria**:
  - Start/stop timer on tasks
  - Manual time entry
  - Time logs per project/task
  - Time reports for billing
  - Integration with invoicing

### 7. Workflow & Automation (Phase 2)

#### 7.1 Status Transitions
- **User Story**: As a project manager, I want automatic actions on status changes
- **Acceptance Criteria**:
  - When project status changes to "active", send notification to team
  - When all milestones are complete, suggest marking project as complete
  - When project is overdue, alert project manager and executive

#### 7.2 Recurring Tasks
- **User Story**: As a project manager, I want to create repeating tasks
- **Acceptance Criteria**:
  - Define task recurrence pattern (daily, weekly, monthly)
  - Auto-create tasks based on schedule
  - End date or occurrence count for series
  - Edit single occurrence or entire series

## Non-Functional Requirements

### Performance
- Projects list loads in < 2 seconds for 1000+ projects
- Project detail page loads in < 1 second
- Search returns results in < 500ms
- Support 50+ concurrent users per organization

### Scalability
- Support 10,000+ projects per organization
- Handle 100,000+ tasks across all projects
- Efficient indexing on objects table for queries
- Pagination for large datasets

### Security
- All projects scoped to organization (no cross-org leaks)
- RBAC integration for permissions
- Session-based authentication for all mutations
- Audit log for sensitive operations (delete, archive, budget changes)
- PII handling for client data (GDPR compliance)

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation for all features
- Screen reader support
- High contrast mode support
- Mobile-responsive design

### Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile: iOS Safari, Chrome Android

### Data Integrity
- Consistent use of organizationId for scoping
- Proper cleanup of objectLinks on project deletion
- Transaction-like operations for complex updates
- Backup and restore capabilities

## Data Model (Ontology Schema)

### Projects Table (objects table)
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "project", // Fixed value
  subtype: "client_project" | "internal" | "campaign" | "product_development" | "research" | "other",
  name: string, // "Website Redesign"
  description: string, // "Complete redesign of corporate website"
  status: "draft" | "planning" | "active" | "on_hold" | "completed" | "cancelled" | "archived",
  customProperties: {
    projectCode: string, // "PRJ-2025-001"
    startDate: number, // Timestamp
    targetEndDate: number, // Timestamp
    actualEndDate?: number, // Timestamp (when completed)
    budget?: {
      amount: number,
      currency: string, // "USD", "EUR"
    },
    priority: "low" | "medium" | "high" | "critical",
    progress: number, // 0-100 percentage
    tags: string[], // ["web", "design", "client"]
    clientOrgId?: Id<"objects">, // Link to CRM organization
    projectManagerId?: Id<"objects">, // Link to CRM contact
    healthStatus: "on_track" | "at_risk" | "behind", // Calculated
    detailedDescription?: string, // Rich HTML (like events)
    mediaLinks?: Array<{
      mediaId: Id<"organizationMedia">,
      category: "contract" | "spec" | "design" | "report" | "other",
      displayOrder: number,
    }>,
  },
  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number,
}
```

### Milestones (objects table)
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "milestone",
  subtype: "phase" | "deliverable" | "review" | "launch" | "other",
  name: string, // "Design Phase Complete"
  description: string,
  status: "pending" | "in_progress" | "completed" | "missed",
  customProperties: {
    projectId: Id<"objects">, // Parent project
    dueDate: number, // Timestamp
    completedDate?: number, // Timestamp
    isCritical: boolean,
    displayOrder: number,
    deliverables?: string[], // List of expected deliverables
  },
  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number,
}
```

### Tasks (objects table)
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "task",
  subtype: "feature" | "bug" | "design" | "documentation" | "research" | "other",
  name: string, // "Create homepage mockup"
  description: string,
  status: "todo" | "in_progress" | "blocked" | "completed" | "cancelled",
  customProperties: {
    projectId: Id<"objects">, // Parent project
    milestoneId?: Id<"objects">, // Optional milestone
    assignedToId?: Id<"objects">, // CRM contact ID
    priority: "low" | "medium" | "high" | "critical",
    dueDate?: number, // Timestamp
    completedDate?: number, // Timestamp
    estimatedHours?: number,
    actualHours?: number, // Phase 2: time tracking
    checklist?: Array<{
      id: string,
      text: string,
      completed: boolean,
    }>,
    labels?: string[],
    blockedBy?: Id<"objects">[], // Task IDs (Phase 2)
  },
  createdBy: Id<"users">,
  createdAt: number,
  updatedAt: number,
}
```

### Object Links
```typescript
// Project -> Client Organization
{
  fromObjectId: Id<"objects">, // project ID
  toObjectId: Id<"objects">, // crm_organization ID
  linkType: "client",
  properties: {},
}

// Project -> Team Member
{
  fromObjectId: Id<"objects">, // project ID
  toObjectId: Id<"objects">, // crm_contact ID
  linkType: "team_member",
  properties: {
    role: "project_manager" | "team_lead" | "contributor" | "observer",
    joinedDate: number,
    permissions: string[], // ["edit_tasks", "manage_team"]
  },
}

// Milestone -> Project (implicit via customProperties.projectId)
// Task -> Project (implicit via customProperties.projectId)
// Task -> Milestone (implicit via customProperties.milestoneId)
// Task -> Assignee (implicit via customProperties.assignedToId)
```

## UI/UX Specifications

### Projects Window Layout
Following the events window pattern:

```
┌─────────────────────────────────────────────────┐
│ Projects                                [−][□][×]│
├─────────────────────────────────────────────────┤
│ [+ New Project]                                  │
│                                                  │
│ Filters: [Type ▾] [Status ▾] [Priority ▾]       │
│          [Client ▾] [Search___________] [Clear] │
│                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │ PRJ-2025-001│ │ PRJ-2025-002│ │ PRJ-2025-003││
│ │ Website     │ │ Marketing   │ │ New Product ││
│ │ Redesign    │ │ Campaign    │ │ Launch      ││
│ │             │ │             │ │             ││
│ │ ●●●●●○○○ 60%│ │ ●●○○○○○○ 25%│ │ ●●●●●●●○ 85%││
│ │             │ │             │ │             ││
│ │ [Active]    │ │ [Planning]  │ │ [Active]    ││
│ │ Acme Corp   │ │ Internal    │ │ TechStart   ││
│ │             │ │             │ │             ││
│ │ [Edit][View]│ │ [Edit][View]│ │ [Edit][View]││
│ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                  │
│ [Load More]                                      │
└─────────────────────────────────────────────────┘
```

### Project Detail View
```
┌─────────────────────────────────────────────────┐
│ Project: Website Redesign          [Edit] [Back]│
├─────────────────────────────────────────────────┤
│ PRJ-2025-001 │ [Active] │ High Priority │ 60%   │
│                                                  │
│ ┌─ Overview ────────────────────────────────────┐
│ │ Client: Acme Corporation                      │
│ │ Start: Jan 15, 2025 → Target: Mar 30, 2025   │
│ │ Budget: €50,000 (€32,000 spent)              │
│ │ Manager: John Doe                             │
│ │                                               │
│ │ Description: [Rich text content...]          │
│ └───────────────────────────────────────────────┘
│                                                  │
│ ┌─ Team Members (5) ─────────────────────────▼──┐
│ │ 👤 John Doe (Project Manager)                │
│ │ 👤 Jane Smith (Designer)                     │
│ │ 👤 Bob Wilson (Developer)                    │
│ └───────────────────────────────────────────────┘
│                                                  │
│ ┌─ Milestones (3) ───────────────────────────▼──┐
│ │ ✓ Discovery Phase - Completed                │
│ │ ⊙ Design Phase - In Progress (Due: Feb 15)  │
│ │ ○ Development Phase - Pending (Due: Mar 20) │
│ └───────────────────────────────────────────────┘
│                                                  │
│ ┌─ Tasks (12) ───────────────────────────────▼──┐
│ │ [Filter: All ▾] [Sort: Priority ▾] [Kanban]  │
│ │                                               │
│ │ □ Create homepage mockup [High] @Jane        │
│ │ □ Review color palette [Medium] @John        │
│ │ ☑ User research completed [High] @Bob        │
│ │ [+ Add Task]                                  │
│ └───────────────────────────────────────────────┘
│                                                  │
│ ┌─ Documents (8) ────────────────────────────▼──┐
│ │ 📄 Project Brief.pdf                          │
│ │ 🎨 Design Mockups.fig                         │
│ │ [+ Upload File]                               │
│ └───────────────────────────────────────────────┘
│                                                  │
│ ┌─ Activity Log ─────────────────────────────▼──┐
│ │ 2h ago - Jane updated task "Create mockup"   │
│ │ 5h ago - John added milestone "Design Phase" │
│ └───────────────────────────────────────────────┘
└─────────────────────────────────────────────────┘
```

### Color Scheme (Win95 Theme)
- **Active Projects**: `--win95-highlight` (purple)
- **Completed**: `--success` (green)
- **On Hold**: `--warning` (orange)
- **Cancelled**: `--error` (red)
- **Draft/Planning**: `--neutral-gray`

### Status Badges
- Draft: Gray with pencil icon
- Planning: Blue with clipboard icon
- Active: Purple with play icon
- On Hold: Orange with pause icon
- Completed: Green with checkmark icon
- Cancelled: Red with X icon

## API Endpoints (Convex Functions)

### projectOntology.ts

#### Queries
- `getProjects(sessionId, organizationId, filters?)` - List all projects
- `getProject(sessionId, projectId)` - Get single project
- `getProjectsByClient(sessionId, clientOrgId)` - Projects for a client
- `getProjectTeam(sessionId, projectId)` - Get team members
- `getProjectMilestones(sessionId, projectId)` - Get milestones
- `getProjectTasks(sessionId, projectId, filters?)` - Get tasks
- `getProjectMedia(sessionId, projectId)` - Get files/documents
- `getProjectAnalytics(sessionId, projectId)` - Get project metrics
- `getTasksByAssignee(sessionId, contactId)` - My tasks view

#### Mutations
- `createProject(sessionId, organizationId, data)` - Create new project
- `updateProject(sessionId, projectId, data)` - Update project
- `archiveProject(sessionId, projectId)` - Soft delete
- `deleteProject(sessionId, projectId)` - Hard delete (drafts only)
- `linkClientToProject(sessionId, projectId, clientOrgId)` - Associate client
- `linkTeamMember(sessionId, projectId, contactId, role)` - Add team member
- `unlinkTeamMember(sessionId, projectId, contactId)` - Remove team member
- `createMilestone(sessionId, projectId, data)` - Add milestone
- `updateMilestone(sessionId, milestoneId, data)` - Update milestone
- `completeMilestone(sessionId, milestoneId)` - Mark complete
- `createTask(sessionId, projectId, data)` - Add task
- `updateTask(sessionId, taskId, data)` - Update task
- `assignTask(sessionId, taskId, contactId)` - Assign to team member
- `completeTask(sessionId, taskId)` - Mark complete
- `linkMediaToProject(sessionId, projectId, mediaId, category)` - Attach file
- `unlinkMediaFromProject(sessionId, projectId, mediaId)` - Remove file

## Implementation Phases

### Phase 1: Core Projects (MVP) - 2-3 weeks
**Goal**: Basic project creation, listing, and viewing

- [ ] Create convex/projectOntology.ts with CRUD functions
- [ ] Add database indexes for project queries
- [ ] Create projects-window UI components:
  - [ ] projects-list.tsx (grid view with filters)
  - [ ] project-form.tsx (create/edit)
  - [ ] project-detail-modal.tsx (full view)
- [ ] Implement project status workflow
- [ ] Basic analytics (progress, status)
- [ ] Testing and polish

**Deliverables**:
- Working projects list and create/edit forms
- Project detail view with basic info
- Status transitions working

### Phase 2: Milestones & Tasks - 2 weeks
**Goal**: Break down projects into actionable work

- [ ] Milestone management (create, list, complete)
- [ ] Task management (create, assign, complete)
- [ ] Task filtering and sorting
- [ ] My Tasks view (assigned to me)
- [ ] Task checklists
- [ ] Priority and due date management

**Deliverables**:
- Milestones showing on project detail
- Tasks list with assignment
- Filtering by assignee, status, priority

### Phase 3: CRM Integration - 1-2 weeks
**Goal**: Connect projects to clients and team members

- [ ] Link projects to CRM organizations (clients)
- [ ] Team member management (add/remove)
- [ ] Role-based permissions for team members
- [ ] Client-level project views in CRM
- [ ] Team member capacity view (all projects per person)

**Deliverables**:
- Projects show client organization
- Team members list on project
- CRM org detail shows related projects

### Phase 4: Media & Documents - 1 week
**Goal**: Attach relevant files to projects

- [ ] File upload to projects (using organizationMedia)
- [ ] File categorization (contract, spec, design, etc.)
- [ ] File list with preview/download
- [ ] Search and filter files
- [ ] File permissions (who can access)

**Deliverables**:
- Upload files to project
- View and download files
- Categorize files

### Phase 5: Advanced Analytics - 1-2 weeks
**Goal**: Insights and reporting

- [ ] Project dashboard (health metrics)
- [ ] Portfolio view (all projects overview)
- [ ] Risk indicators (overdue, over budget)
- [ ] Export reports (PDF, CSV)
- [ ] Charts and visualizations

**Deliverables**:
- Project dashboard on detail page
- Portfolio view for executives
- Export functionality

### Phase 6: Workflow Automation (Future)
**Goal**: Reduce manual work with automation

- [ ] Status transition triggers
- [ ] Recurring tasks
- [ ] Notifications for milestones approaching
- [ ] Auto-alerts for at-risk projects
- [ ] Email digests

### Phase 7: Time Tracking & Billing (Future)
**Goal**: Support project-based billing

- [ ] Time tracking on tasks
- [ ] Time reports
- [ ] Integration with invoicing
- [ ] Budget vs. actual tracking
- [ ] Client billing reports

## Technical Considerations

### Convex Schema Changes
- No changes to core schema required (uses existing objects table)
- Add indexes for performance:
  - `by_org_type` already exists
  - `by_project_status`: `(organizationId, type="project", status)`
  - `by_project_client`: `(organizationId, type="project", customProperties.clientOrgId)`
  - `by_milestone_project`: `(organizationId, type="milestone", customProperties.projectId)`
  - `by_task_project`: `(organizationId, type="task", customProperties.projectId)`
  - `by_task_assignee`: `(organizationId, type="task", customProperties.assignedToId)`

### Frontend Components
Following events pattern:
- `src/components/window-content/projects-window/`
  - `projects-list.tsx` - Main list view
  - `project-form.tsx` - Create/edit form
  - `project-detail-modal.tsx` - Full project view
  - `ProjectOverviewSection.tsx` - Overview widget
  - `ProjectTeamSection.tsx` - Team members
  - `ProjectMilestonesSection.tsx` - Milestones
  - `ProjectTasksSection.tsx` - Tasks list
  - `ProjectMediaSection.tsx` - Documents
  - `milestone-form.tsx` - Add/edit milestone
  - `task-form.tsx` - Add/edit task

### Reusable Patterns from Events
- Rich text editor (description)
- Media linking (documents)
- Status badges and transitions
- Filter and sort UI
- Confirmation modals
- Form validation
- Timezone handling

### Performance Optimization
- Lazy load project details (don't fetch all at once)
- Pagination for large task lists
- Cache frequently accessed projects
- Optimize queries with proper indexes
- Debounce search inputs
- Virtual scrolling for long lists

### Testing Strategy
- Unit tests for ontology functions
- Integration tests for workflows
- E2E tests for critical user journeys:
  - Create project → Add tasks → Complete
  - Link client → View from CRM
  - Team member assignment
- Performance tests for large datasets
- Mobile responsiveness tests

## Risks & Mitigation

### Risk 1: Complexity Creep
**Risk**: Feature scope expands, delaying MVP
**Mitigation**: Strict adherence to phase 1 scope, defer nice-to-haves

### Risk 2: Performance with Large Datasets
**Risk**: Slow queries with 10,000+ projects/tasks
**Mitigation**: Proper indexing, pagination, query optimization from day 1

### Risk 3: User Adoption
**Risk**: Users don't switch from existing tools
**Mitigation**: Excellent UX, clear migration path, training materials

### Risk 4: Data Integrity
**Risk**: Orphaned tasks/milestones when projects deleted
**Mitigation**: Cascade deletes or prevent deletion if children exist

### Risk 5: Mobile Experience
**Risk**: Complex UI doesn't work well on mobile
**Mitigation**: Mobile-first design, simplified views for small screens

## Dependencies

- Existing ontology system (objects, objectLinks, objectActions)
- CRM system (organizations, contacts)
- organizationMedia table (for file uploads)
- RBAC system (for permissions)
- Translation system (for UI text)
- Session management (for authentication)

## Open Questions

1. **Gantt Chart Timeline View**: Should we include a visual timeline in Phase 1 or defer to Phase 5?
   - **Recommendation**: Defer to Phase 5 (complexity vs. value for MVP)

2. **Task Dependencies**: Support blocking relationships between tasks?
   - **Recommendation**: Phase 2 (adds complexity but high value)

3. **Recurring Projects**: Support project templates or recurring projects?
   - **Recommendation**: Phase 6 (automation phase)

4. **Client Portal**: Allow clients to view their projects?
   - **Recommendation**: Separate PRD (public-facing feature)

5. **Integration with External Tools**: Sync with Jira, Asana, etc.?
   - **Recommendation**: Phase 7 or later (requires API strategy)

6. **Multi-organization Projects**: Support projects spanning multiple clients?
   - **Recommendation**: Not initially (adds complexity, unclear use case)

7. **Budget Tracking**: Detailed expense tracking or just high-level?
   - **Recommendation**: High-level in Phase 1, detailed in Phase 7 with time tracking

## Appendices

### A. Glossary
- **Project**: A container for organized work with defined goals and timeline
- **Milestone**: A significant checkpoint or deliverable within a project
- **Task**: A single unit of work that can be assigned and completed
- **Client**: A CRM organization linked to a project (the customer)
- **Team Member**: A CRM contact assigned to work on a project
- **Health Status**: Calculated indicator of project risk (on track, at risk, behind)
- **Project Code**: Auto-generated unique identifier (e.g., PRJ-2025-001)

### B. Competitive Analysis
- **Asana**: Excellent task management, but complex for small teams
- **Monday.com**: Visual boards, but expensive
- **Basecamp**: Simple, but lacks advanced features
- **Notion**: Flexible, but requires setup
- **Our Advantage**: Integrated with CRM, retro UI, ontology flexibility

### C. User Research Findings
(To be filled in after user interviews)

### D. Design Mockups
(Link to Figma once created)

### E. API Documentation
(Link to generated API docs once implemented)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-04
**Author**: Claude Code (AI Assistant)
**Reviewers**: TBD
**Status**: Draft - Pending Review
