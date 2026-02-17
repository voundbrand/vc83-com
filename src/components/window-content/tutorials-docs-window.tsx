"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronRight,
  ChevronDown,
  PlayCircle,
  CheckCircle,
  SkipForward,
  BookOpen,
  Sparkles,
  Shield,
  Users,
  Rocket,
  Library,
  Zap,
  Monitor,
  Star,
  Globe,
  Plug,
  KeyRound,
  LockOpen,
  LogIn
} from "lucide-react";

interface TutorialsDocsWindowProps {
  initialSection?: "tutorials" | "docs";
  initialItem?: string;
}

type ContentType = "tutorial" | "doc";

interface TreeNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: ContentType;
  children?: TreeNode[];
  content?: {
    title: string;
    description?: string;
    body: string;
  };
}

/**
 * Tutorials & Docs Window
 *
 * Windows 95-style documentation browser with:
 * - Left pane: Collapsible tree navigation
 * - Right pane: Content viewer (tutorials or docs)
 *
 * Features:
 * - Tree-based navigation with accordion sections
 * - Tutorials section (interactive step-by-step guides)
 * - Docs section (static documentation pages)
 * - Retro Windows 95 aesthetics
 */
export function TutorialsDocsWindow({
  initialSection = "tutorials",
  initialItem
}: TutorialsDocsWindowProps) {
  const { openWindow, focusWindow } = useWindowManager();
  const { isSignedIn, sessionId } = useAuth();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([initialSection])
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(
    initialItem || null
  );

  // Load tutorial progress from backend (only if signed in)
  const tutorials = useQuery(
    api.tutorialOntology.getAllTutorialProgress,
    isSignedIn && sessionId ? { sessionId } : "skip"
  );

  // Toggle tree node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Select a node and show its content
  const selectNode = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  // Build tree structure
  const treeData: TreeNode[] = [
    {
      id: "tutorials",
      label: "Tutorials",
      icon: <BookOpen className="h-4 w-4" />,
      type: "tutorial",
      children: [
        {
          id: "tutorial-welcome",
          label: "Welcome to l4yercak3",
          icon: <Sparkles className="h-4 w-4" />,
          type: "tutorial",
          content: {
            title: "Welcome to l4yercak3",
            description: "Get started with your retro workflow platform",
            body: `Welcome to l4yercak3! 

Let's get you set up with l4yercak3 in just a few minutes. This tutorial will show you the key features and help you create your first contact, project, and invoice.

WHAT YOU'LL LEARN

  1. Your API Key
     Connect templates to your backend

  2. Download Templates
     Deploy pre-built websites

  3. Add Contacts
     Manage your CRM

  4. Create Projects
     Track your work

  5. Send Invoices
     Bill your clients

Click "Start Interactive Tutorial" below to begin!`
          }
        },
        {
          id: "tutorial-oauth-setup",
          label: "OAuth Setup for Portals",
          icon: <Shield className="h-4 w-4" />,
          type: "tutorial",
          content: {
            title: "OAuth Setup for Portals",
            description: "Secure authentication for your deployed portals",
            body: `OAuth Setup Tutorial 

Learn how to set up OAuth 2.0 authentication for your freelancer portal in just a few minutes.

WHAT IS OAUTH?

OAuth 2.0 is an industry-standard protocol that allows your contacts to securely log into your portal using their existing Google or Microsoft accounts.

BENEFITS

   No Password Management
     Contacts log in with Google/Microsoft

   Enhanced Security
     Industry-standard authentication

   Quick Setup
     Takes just 2 minutes to configure

TUTORIAL STEPS

This tutorial will guide you through:

  1. Why OAuth?
     Understanding the benefits

  2. Create OAuth App
     One-click application creation

  3. Save Credentials
     Copy your client ID and secret

  4. Complete
     Your portal is ready!

WHEN TO USE OAUTH

Use OAuth when:
  • You want maximum security for your portal
  • Your contacts have Google/Microsoft accounts
  • You're deploying a client-facing portal

ALTERNATIVE: MAGIC LINK

Don't want to set up OAuth? You can use Magic Link authentication instead:
  • Email-based login
  • No OAuth configuration needed
  • Still secure and easy to use

Click "Start Interactive Tutorial" below to configure OAuth for your next portal deployment!`
          }
        },
        {
          id: "tutorial-crm-basics",
          label: "CRM Basics",
          icon: <Users className="h-4 w-4" />,
          type: "tutorial",
          content: {
            title: "CRM Basics",
            description: "Manage contacts and client relationships",
            body: `CRM Basics Tutorial 

Learn how to use the l4yercak3 CRM to manage your contacts and client relationships.

WHAT YOU'LL LEARN

  • Adding and organizing contacts
  • Creating CRM organizations (client companies)
  • Tracking interactions and notes
  • Linking contacts to projects and invoices
  • Inviting contacts to portals

Click "Start Interactive Tutorial" below to begin learning CRM fundamentals!`
          }
        },
        {
          id: "tutorial-portal-deployment",
          label: "Deploying Your First Portal",
          icon: <Rocket className="h-4 w-4" />,
          type: "tutorial",
          content: {
            title: "Deploying Your First Portal",
            description: "Deploy a client-facing freelancer portal",
            body: `Deploying Your First Portal 

Learn how to deploy a professional client portal for your freelance business.

WHAT YOU'LL LEARN

  1. Browse Templates
     Find the Freelancer Portal template

  2. OAuth Setup (Optional)
     Secure authentication

  3. Deploy to Vercel
     One-click deployment

  4. Invite Contacts
     Give clients access

  5. Customize Branding
     Make it yours

PORTAL FEATURES

Your deployed portal includes:

   Dashboard
     Overview of projects and invoices

   Projects
     View assigned projects and milestones

   Invoices
     See billing and payment status

   Profile
     Update contact information

Click "Start Interactive Tutorial" below to deploy your first portal!`
          }
        }
      ]
    },
    {
      id: "docs",
      label: "Documentation",
      icon: <Library className="h-4 w-4" />,
      type: "doc",
      children: [
        {
          id: "docs-getting-started",
          label: "Getting Started",
          icon: <Rocket className="h-4 w-4" />,
          type: "doc",
          children: [
            {
              id: "doc-quick-start",
              label: "Quick Start Guide",
              icon: <Zap className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "Quick Start Guide",
                body: `Quick Start Guide 

Get up and running with l4yercak3 in 5 minutes.

STEP 1: CREATE YOUR ACCOUNT

Sign up for a free l4yercak3 account at app.l4yercak3.com

STEP 2: GET YOUR API KEY

  1. Open Settings → API Keys
  2. Click "Generate New Key"
  3. Copy your API key (starts with sk_live_)
  4. Save it securely - you'll need it for templates

STEP 3: ADD YOUR FIRST CONTACT

  1. Open CRM window
  2. Click "New Contact"
  3. Fill in contact details (name, email, etc.)
  4. Click "Save"

STEP 4: DEPLOY A TEMPLATE

  1. Open Web Publishing window
  2. Browse "Freelancer Portal" template
  3. Click "Deploy to Vercel"
  4. Follow the deployment wizard

STEP 5: INVITE YOUR CONTACT

  1. Go back to CRM window
  2. Click "Invite to Portal" on your contact
  3. Your contact receives an email invitation
  4. They can now log in and see their projects/invoices

That's it! You're ready to start using l4yercak3. `
              }
            },
            {
              id: "doc-system-requirements",
              label: "System Requirements",
              icon: <Monitor className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "System Requirements",
                body: `
## System Requirements 

### Browser Support

l4yercak3 works best on modern browsers:

-  **Chrome** 90+ (recommended)
-  **Firefox** 88+
-  **Safari** 14+
-  **Edge** 90+

### Screen Resolution

- **Minimum**: 1280x720
- **Recommended**: 1920x1080 or higher
- **Mobile**: Responsive design works on tablets and phones

### Internet Connection

- **Minimum**: 1 Mbps
- **Recommended**: 5 Mbps or faster
- Works offline for viewing cached data

### Deployed Portals

When deploying portals (Freelancer Portal template):

- **Vercel** free tier (recommended)
- **Netlify** free tier (alternative)
- Any **Node.js** hosting environment

No special requirements - if you can browse the web, you can use l4yercak3!
                `.trim()
              }
            }
          ]
        },
        {
          id: "docs-features",
          label: "Features",
          icon: <Star className="h-4 w-4" />,
          type: "doc",
          children: [
            {
              id: "doc-crm",
              label: "CRM System",
              icon: <Users className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "CRM System",
                body: `
## CRM System 

Manage your contacts and client relationships with the built-in CRM.

### Features

**Contacts**
- Store contact information (name, email, phone, address)
- Track multiple addresses per contact
- Add custom fields and notes
- Link contacts to organizations

**Organizations**
- Create CRM organizations (client companies)
- Link multiple contacts to one organization
- Track organization-level details

**Interactions**
- Log calls, emails, and meetings
- Track conversation history
- Set follow-up reminders

**Integration**
- Contacts appear in portal invitations
- Link contacts to projects
- Generate invoices for contacts

### Access

Open the **CRM** window from your desktop or app menu.
                `.trim()
              }
            },
            {
              id: "doc-oauth",
              label: "OAuth Authentication",
              icon: <Shield className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "OAuth Authentication",
                body: `
## OAuth Authentication 

Secure, industry-standard authentication for your deployed portals.

### What is OAuth?

OAuth 2.0 is a protocol that allows users to log in using their existing Google or Microsoft accounts without sharing passwords.

### How It Works

1. **You create an OAuth app** in l4yercak3
2. **You get credentials** (Client ID + Secret)
3. **You deploy your portal** with these credentials
4. **Your contacts click "Login with Google"** on your portal
5. **They authorize access** (one time)
6. **They're logged in** securely

### Benefits

-  No passwords to manage
-  Industry-standard security
-  Automatic security updates
-  Familiar login experience

### Supported Providers

Currently supported:
- **Google** (Gmail, Google Workspace)
- **Microsoft** (Outlook, Microsoft 365)

More providers coming soon!

### Alternative: Magic Link

Don't want OAuth? Use **Magic Link** instead:
- Email-based authentication
- No OAuth setup required
- One-click login from email

### Setup

Follow the **OAuth Setup Tutorial** to configure OAuth for your portal.
                `.trim()
              }
            },
            {
              id: "doc-portals",
              label: "Client Portals",
              icon: <Globe className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "Client Portals",
                body: `
## Client Portals 

Deploy professional client-facing portals for your freelance business.

### What are Portals?

Portals are external Next.js websites that your clients can access to:
- View their assigned projects
- See invoice status and pay bills
- Update their contact information
- Track project progress

### Portal Types

**Freelancer Portal**
- Projects dashboard
- Invoice management
- Profile editing
- Built with Next.js 15 + TypeScript

**More Coming Soon**
- Client Portal (white-label)
- Vendor Portal
- Custom portals

### Deployment

Portals can be deployed to:
- **Vercel** (recommended, free tier available)
- **Netlify** (alternative)
- Any Node.js hosting

### Authentication

Choose your authentication method:
- **OAuth 2.0** - Google/Microsoft login (most secure)
- **Magic Link** - Email-based login (simplest)

### Customization

Customize your portal:
- Organization name and logo
- Primary brand color
- Custom domain (Professional tier+)

### Data Source

Portals fetch data from your l4yercak3 backend:
- Real-time project updates
- Invoice status changes
- Contact information sync

All data is scoped to each contact - they only see their own information.
                `.trim()
              }
            }
          ]
        },
        {
          id: "docs-api",
          label: "API Reference",
          icon: <Plug className="h-4 w-4" />,
          type: "doc",
          children: [
            {
              id: "doc-api-keys",
              label: "API Keys",
              icon: <KeyRound className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "API Keys",
                body: `
## API Keys 

Authenticate API requests and connect templates to your l4yercak3 backend.

### What are API Keys?

API keys are secret tokens that authenticate requests from:
- Deployed portals (Freelancer Portal template)
- Custom integrations
- External applications

### Format

API keys start with a prefix:
- \`sk_live_\` - Production keys
- \`sk_test_\` - Test keys (coming soon)

Example: \`sk_live_abc123def456ghi789...\`

### Creating API Keys

1. Open **Settings** → **API Keys**
2. Click **"Generate New Key"**
3. Give it a descriptive name
4. Copy the key immediately (shown only once!)
5. Store it securely

### Security Best Practices

-  **Never commit keys to Git** - Use environment variables
-  **Regenerate if compromised** - Create new key, delete old one
-  **Use different keys per environment** - Dev, staging, production
-  **Rotate keys periodically** - Regenerate every 90 days

### Usage

In your deployed portal:

\`\`\`bash
# .env.local
L4YERCAK3_API_KEY=sk_live_abc123...
\`\`\`

In your Next.js code:

\`\`\`typescript
const apiKey = process.env.L4YERCAK3_API_KEY;

// Use in API requests
headers: {
  'Authorization': \`Bearer \${apiKey}\`
}
\`\`\`

### Scopes

API keys currently have full access to your organization's data. Scoped keys (read-only, specific resources) coming soon!

### Revocation

Revoke a compromised key:
1. Go to **Settings** → **API Keys**
2. Find the key
3. Click **"Delete"**
4. Key is immediately invalidated

Any requests using the old key will fail.
                `.trim()
              }
            },
            {
              id: "doc-oauth-scopes",
              label: "OAuth Scopes",
              icon: <LockOpen className="h-4 w-4" />,
              type: "doc",
              content: {
                title: "OAuth Scopes",
                body: `
## OAuth Scopes 

Control granular access to different parts of your API.

### What are Scopes?

Scopes define what data an OAuth application can access. For example:
- \`contacts:read\` - View contacts
- \`invoices:write\` - Create/update invoices

### Available Scopes

**CRM**
- \`contacts:read\` - View contacts
- \`contacts:write\` - Manage contacts

**Invoicing**
- \`invoices:read\` - View invoices
- \`invoices:write\` - Create/send invoices

**Projects**
- \`projects:read\` - View projects
- \`projects:write\` - Create/manage projects

**Forms**
- \`forms:read\` - View forms
- \`forms:write\` - Create forms

**Events**
- \`events:read\` - View events
- \`events:write\` - Manage events

**Organization**
- \`org:read\` - View org settings
- \`org:write\` - Update org settings 

**Workflows**
- \`workflows:read\` - View workflows
- \`workflows:write\` - Create workflows
- \`workflows:execute\` - Trigger workflows

### Requesting Scopes

When creating an OAuth app, request only the scopes you need:

\`\`\`
contacts:read projects:read invoices:read
\`\`\`

Space-separated list.

### Dangerous Scopes

Some scopes require extra confirmation:
-  \`org:write\` - Can modify organization settings
-  \`sub_org:manage\` - Can manage sub-organizations

### Best Practices

-  Request minimum scopes needed
-  Explain why you need each scope
-  Never request \`org:write\` unless absolutely necessary
                `.trim()
              }
            }
          ]
        }
      ]
    }
  ];

  // Find currently selected node and its content
  const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNodeData = selectedNode ? findNode(treeData, selectedNode) : null;

  // Get tutorial progress for a specific tutorial
  const getTutorialProgress = (tutorialId: string) => {
    if (!tutorials) return null;
    const tutorial = tutorials.find(t => t.id === tutorialId.replace('tutorial-', ''));
    return tutorial?.progress || null;
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--win95-bg)' }}>
      {/* Left Pane - Tree Navigation */}
      <div
        className="w-64 border-r-2 flex flex-col"
        style={{ borderColor: 'var(--win95-border)' }}
      >
        {/* Tree Header */}
        <div
          className="p-3 border-b-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <h3 className="font-pixel text-xs" style={{ color: 'var(--win95-text)' }}>
            Contents
          </h3>
        </div>

        {/* Tree Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          {treeData.map((rootNode) => (
            <TreeNodeComponent
              key={rootNode.id}
              node={rootNode}
              level={0}
              expandedNodes={expandedNodes}
              selectedNode={selectedNode}
              onToggle={toggleNode}
              onSelect={selectNode}
              getTutorialProgress={getTutorialProgress}
            />
          ))}
        </div>
      </div>

      {/* Right Pane - Content Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNodeData?.content ? (
          <>
            {/* Content Header */}
            <div
              className="p-4 border-b-2"
              style={{ borderColor: 'var(--win95-border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedNodeData.icon}</span>
                <div>
                  <h2 className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
                    {selectedNodeData.content.title}
                  </h2>
                  {selectedNodeData.content.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      {selectedNodeData.content.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl prose prose-sm" style={{ color: 'var(--win95-text)' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'inherit' }}>
                  {selectedNodeData.content.body}
                </pre>
              </div>
            </div>

            {/* Content Footer - Actions */}
            {selectedNodeData.type === "tutorial" && (
              <div
                className="p-4 border-t-2"
                style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}
              >
                {!isSignedIn ? (
                  /* Show login prompt if not signed in */
                  <div
                    className="p-4 border-2 rounded text-center"
                    style={{
                      borderColor: 'var(--win95-highlight)',
                      background: 'var(--win95-bg-light)'
                    }}
                  >
                    <p className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                      <span className="inline-flex items-center gap-1">
                        <LogIn className="h-4 w-4" />
                        Sign In Required
                      </span>
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                      Please sign in to start interactive tutorials and track your progress.
                    </p>
                    <RetroButton
                      onClick={() => {
                        // Open login window
                        import('./login-window').then((module) => {
                          const LoginWindow = module.LoginWindow;
                          openWindow(
                            "login",
                            "Sign In",
                            <LoginWindow />,
                            { x: 250, y: 100 },
                            { width: 450, height: 680 },
                            'ui.app.user_account',
                            undefined
                          );
                        });
                      }}
                      className="w-full"
                    >
                      Sign In to Continue
                    </RetroButton>
                  </div>
                ) : (
                  /* Show start tutorial button if signed in */
                  <RetroButton
                    onClick={() => {
                      const tutorialId = selectedNode!.replace('tutorial-', '');
                      // Import TutorialWindow dynamically and pass props
                      // Import both tutorial window and integrations window
                      Promise.all([
                        import('./tutorial-window'),
                        import('./integrations-window'),
                        import('./templates-window'),
                        import('./crm-window'),
                        import('./projects-window'),
                        import('./invoicing-window'),
                      ]).then(([tutorialModule, integrationsModule, templatesModule, crmModule, projectsModule, invoicingModule]) => {
                        const TutorialWindow = tutorialModule.TutorialWindow;
                        const IntegrationsWindow = integrationsModule.IntegrationsWindow;
                        const TemplatesWindow = templatesModule.TemplatesWindow;
                        const CRMWindow = crmModule.CRMWindow;
                        const ProjectsWindow = projectsModule.ProjectsWindow;
                        const InvoicingWindow = invoicingModule.InvoicingWindow;

                        // Define action handler that opens appropriate windows
                        const handleTutorialAction = (action: string) => {
                          console.log('[TutorialsDocsWindow] Handling tutorial action:', action);

                          if (action === "view_api_keys") {
                            openWindow(
                              "integrations",
                              "Integrations & API",
                              <IntegrationsWindow initialPanel="api-keys" />,
                              { x: 150, y: 100 },
                              { width: 900, height: 650 },
                              'ui.windows.integrations.title',
                              undefined
                            );
                            // Bring the integrations window to front
                            setTimeout(() => focusWindow("integrations"), 50);
                          } else if (action === "view_templates") {
                            openWindow("templates", "Templates", <TemplatesWindow />, { x: 220, y: 65 }, { width: 1100, height: 700 }, 'ui.app.templates');
                            setTimeout(() => focusWindow("templates"), 50);
                          } else if (action === "open_crm") {
                            openWindow("crm", "CRM", <CRMWindow />, { x: 190, y: 50 }, { width: 1100, height: 700 }, 'ui.app.crm');
                            setTimeout(() => focusWindow("crm"), 50);
                          } else if (action === "open_projects") {
                            openWindow("projects", "Projects", <ProjectsWindow />, { x: 240, y: 75 }, { width: 1000, height: 700 }, 'ui.app.projects');
                            setTimeout(() => focusWindow("projects"), 50);
                          } else if (action === "open_invoicing") {
                            openWindow("invoicing", "Invoicing", <InvoicingWindow />, { x: 200, y: 55 }, { width: 950, height: 650 }, 'ui.app.invoicing');
                            setTimeout(() => focusWindow("invoicing"), 50);
                          }
                        };

                        openWindow(
                          `tutorial-${tutorialId}`,
                          "Tutorial",
                          <TutorialWindow
                            tutorialId={tutorialId}
                            onClose={() => {
                              // Window will handle its own closing
                            }}
                            onAction={handleTutorialAction}
                          />,
                          { x: 250, y: 80 },
                          { width: 800, height: 650 },
                          undefined,
                          undefined
                        );
                      });
                    }}
                    className="w-full"
                  >
                    <PlayCircle className="h-4 w-4 inline mr-2" />
                    Start Interactive Tutorial
                  </RetroButton>
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <BookOpen className="h-12 w-12" style={{ color: 'var(--win95-highlight)' }} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--win95-text)' }}>
                  Welcome to Tutorials & Docs
                </h3>
                <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
                  Select a topic from the left to get started
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tree Node Component
 */
interface TutorialProgress {
  completed?: boolean;
  skipped?: boolean;
  currentStep?: number;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedNode: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  getTutorialProgress: (tutorialId: string) => TutorialProgress | null;
}

function TreeNodeComponent({
  node,
  level,
  expandedNodes,
  selectedNode,
  onToggle,
  onSelect,
  getTutorialProgress
}: TreeNodeComponentProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 12;

  // Get progress indicator for tutorials
  const progress = node.type === "tutorial" && node.id.startsWith("tutorial-")
    ? getTutorialProgress(node.id)
    : null;

  const getProgressIcon = () => {
    if (!progress) return null;
    if (progress.completed) return <CheckCircle className="h-3 w-3 text-green-600" />;
    if (progress.skipped) return <SkipForward className="h-3 w-3 text-gray-500" />;
    if (progress.currentStep && progress.currentStep > 0) return <PlayCircle className="h-3 w-3 text-blue-600" />;
    return null;
  };

  return (
    <div>
      {/* Node Item */}
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-opacity-50"
        style={{
          paddingLeft: `${8 + indent}px`,
          background: isSelected ? 'var(--win95-hover-bg)' : 'transparent',
          color: isSelected ? 'var(--win95-hover-text)' : 'var(--win95-text)'
        }}
        onClick={() => {
          if (hasChildren) {
            onToggle(node.id);
          }
          if (node.content) {
            onSelect(node.id);
          }
        }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <span className="w-4 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}

        {/* Node Icon */}
        <span className="text-sm flex-shrink-0">{node.icon}</span>

        {/* Node Label */}
        <span className="text-xs flex-1 truncate">{node.label}</span>

        {/* Progress Icon */}
        {getProgressIcon()}
      </div>

      {/* Child Nodes */}
      {hasChildren && isExpanded && node.children && (
        <div>
          {node.children.map((childNode) => (
            <TreeNodeComponent
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onSelect={onSelect}
              getTutorialProgress={getTutorialProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
}
