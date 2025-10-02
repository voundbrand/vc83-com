# Task 013: Auth Implementation Phase 4 - Organization Management UI

**STATUS**: ❌ 5% COMPLETE - NOT YET IMPLEMENTED (as of 2025-10-02)

## Overview
This task implements the frontend UI for organization management, including the app store interface, member management, organization settings, and the seamless experience of switching between organizations. All UI maintains the retro desktop aesthetic while providing powerful multi-tenant features.

**Parent Task**: 009_convex_auth_implementation.md
**Dependencies**:
- Task 011 (Phase 2 - Frontend Auth UI) ✅ 70% Complete
- Task 012 (Phase 3 - App Store Backend) ❌ NOT STARTED - **BLOCKING**
**Estimated Time**: 4-5 days
**Priority**: 🔴 HIGH - Essential for multi-org functionality

## Implementation Status

✅ **Basic Org Switcher**: Dropdown exists in auth hook
❌ **Everything Else**: No app store UI, no dashboard, no member management, no settings
📝 **See**: [AUTH_STATUS_REVIEW.md](../../AUTH_STATUS_REVIEW.md) for complete list

⚠️ **BLOCKER**: Phase 3 (App Store Backend) must be completed before this phase can begin.

## Success Criteria
- [ ] Users can view and manage their organizations ❌
- [ ] App store grid shows available/installed apps per org ❌
- [ ] Members can be invited and managed with proper roles ❌
- [ ] Organization settings allow business data updates ❌
- [x] Smooth organization switching without re-authentication ✅ (basic implementation)

**Note**: Only org switching works. All UI components for management are missing.

## Phase 4 Breakdown

### 4.1 App Store UI Components (4-5 hours)
**File**: `src/components/app-store/app-store-grid.tsx`

- [ ] Create retro app store grid:
  ```typescript
  interface AppStoreGridProps {
    apps: App[];
    installedApps: AppAccess[];
    onInstall: (appId: string) => void;
    onUninstall: (appId: string) => void;
    onToggleVisibility: (appId: string, hidden: boolean) => void;
  }
  
  export function AppStoreGrid({ apps, installedApps, ... }: AppStoreGridProps) {
    const installedIds = new Set(installedApps.map(a => a.appId));
    
    return (
      <div className="app-store-grid">
        {apps.map(app => (
          <AppIcon
            key={app.appId}
            app={app}
            installed={installedIds.has(app.appId)}
            hidden={installedApps.find(a => a.appId === app.appId)?.hidden}
            onAction={...}
          />
        ))}
      </div>
    );
  }
  ```

- [ ] Style with retro desktop icons:
  ```css
  .app-store-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 20px;
    padding: 20px;
  }
  
  .app-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.1s;
  }
  
  .app-icon:hover {
    transform: scale(1.05);
  }
  
  .app-icon-image {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
    border: 2px solid #000;
    background: #fff;
    padding: 8px;
  }
  
  .app-icon-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    margin-top: 8px;
    text-align: center;
    max-width: 80px;
  }
  ```

### 4.2 App Icon Component (3-4 hours)
**File**: `src/components/app-store/app-icon.tsx`

- [ ] Create interactive app icon:
  ```typescript
  export function AppIcon({ app, installed, hidden, onAction }: AppIconProps) {
    const [showMenu, setShowMenu] = useState(false);
    
    const handleDoubleClick = () => {
      if (installed && !hidden) {
        // Open app window
        openAppWindow(app.appId);
      } else if (!installed) {
        // Show install dialog
        onAction('install', app.appId);
      }
    };
    
    const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setShowMenu(true);
    };
    
    return (
      <div className="relative">
        <div 
          className="app-icon"
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleRightClick}
        >
          <div className={`app-icon-image ${hidden ? 'opacity-50' : ''}`}>
            <span className="text-4xl">{app.icon}</span>
          </div>
          <div className="app-icon-label">
            {app.name}
          </div>
          {installed && (
            <div className="installed-indicator">✓</div>
          )}
        </div>
        
        {showMenu && (
          <AppContextMenu
            app={app}
            installed={installed}
            hidden={hidden}
            onAction={onAction}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
    );
  }
  ```

- [ ] Add context menu for apps:
  - Install/Uninstall
  - Show/Hide
  - Open (if installed)
  - View Details

### 4.3 App Store Window (4-5 hours)
**File**: `src/components/window-content/app-store-window.tsx`

- [ ] Create full app store interface:
  ```typescript
  export function AppStoreWindow() {
    const { organization } = useAuth();
    const { data: availableApps } = useQuery(api.apps.getAvailableApps);
    const { data: installedApps } = useQuery(api.appAccess.getInstalledApps);
    
    const [filter, setFilter] = useState<string>('all');
    const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);
    
    const installApp = useMutation(api.appAccess.installApp);
    const uninstallApp = useMutation(api.appAccess.uninstallApp);
    
    return (
      <div className="app-store-window">
        <div className="app-store-header">
          <h2 className="pixel-font">App Store - {organization?.name}</h2>
          
          <div className="app-filters">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="retro-select"
            >
              <option value="all">All Categories</option>
              <option value="content">Content</option>
              <option value="tools">Tools</option>
              <option value="productivity">Productivity</option>
              <option value="networking">Networking</option>
            </select>
            
            <label className="retro-checkbox">
              <input 
                type="checkbox"
                checked={showOnlyInstalled}
                onChange={(e) => setShowOnlyInstalled(e.target.checked)}
              />
              <span>Installed Only</span>
            </label>
          </div>
        </div>
        
        <AppStoreGrid 
          apps={filteredApps}
          installedApps={installedApps}
          onInstall={installApp}
          onUninstall={uninstallApp}
        />
        
        {organization?.plan === 'free' && (
          <div className="upgrade-prompt">
            <p>🚀 Upgrade to Pro to access premium apps!</p>
            <RetroButton onClick={openUpgradeWindow}>
              Upgrade Now
            </RetroButton>
          </div>
        )}
      </div>
    );
  }
  ```

### 4.4 Organization Dashboard (5-6 hours)
**File**: `src/components/organizations/organization-dashboard.tsx`

- [ ] Create comprehensive org dashboard:
  ```typescript
  export function OrganizationDashboard() {
    const { organization, user } = useAuth();
    const { data: members } = useQuery(api.memberships.getOrgMembers);
    const { data: apps } = useQuery(api.appAccess.getInstalledApps);
    const { data: stats } = useQuery(api.organizations.getOrgStats);
    
    return (
      <div className="org-dashboard retro-window-content">
        <div className="dashboard-header">
          <h1 className="pixel-font text-xl">
            {organization?.name}
          </h1>
          {organization?.isPersonal && (
            <span className="badge personal">Personal</span>
          )}
          {!organization?.isPersonal && (
            <span className="badge business">Business</span>
          )}
        </div>
        
        <div className="dashboard-grid">
          {/* Organization Info Card */}
          <div className="info-card">
            <h3>Organization Details</h3>
            <dl>
              <dt>Legal Name:</dt>
              <dd>{organization?.legalName}</dd>
              
              <dt>Plan:</dt>
              <dd className={`plan-${organization?.plan}`}>
                {organization?.plan?.toUpperCase()}
              </dd>
              
              <dt>Created:</dt>
              <dd>{formatDate(organization?._creationTime)}</dd>
            </dl>
            
            {organization?.isPersonal && (
              <RetroButton onClick={openUpgradeWindow}>
                Upgrade to Business
              </RetroButton>
            )}
          </div>
          
          {/* Members Card */}
          <div className="members-card">
            <h3>Members ({members?.length || 0})</h3>
            <ul className="member-list">
              {members?.map(member => (
                <li key={member._id}>
                  <span className="member-name">{member.user.name}</span>
                  <span className="member-role">{member.role}</span>
                </li>
              ))}
            </ul>
            
            {!organization?.isPersonal && (
              <RetroButton onClick={openInviteWindow}>
                + Invite Member
              </RetroButton>
            )}
          </div>
          
          {/* Installed Apps Card */}
          <div className="apps-card">
            <h3>Installed Apps ({apps?.length || 0})</h3>
            <div className="mini-app-grid">
              {apps?.map(app => (
                <div key={app.appId} className="mini-app">
                  <span>{app.icon}</span>
                  <span className="app-name">{app.name}</span>
                </div>
              ))}
            </div>
            
            <RetroButton onClick={openAppStoreWindow}>
              Browse App Store
            </RetroButton>
          </div>
          
          {/* Quick Stats */}
          <div className="stats-card">
            <h3>Activity</h3>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-value">{stats?.contentCount || 0}</span>
                <span className="stat-label">Content Items</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats?.activeUsers || 0}</span>
                <span className="stat-label">Active Users</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

### 4.5 Member Management Interface (4-5 hours)
**File**: `src/components/organizations/member-management.tsx`

- [ ] Create member list and controls:
  ```typescript
  export function MemberManagement() {
    const { organization, user } = useAuth();
    const { data: members } = useQuery(api.memberships.getOrgMembers);
    const { data: invitations } = useQuery(api.invitations.getPendingInvitations);
    
    const updateRole = useMutation(api.memberships.updateMemberRole);
    const removeMember = useMutation(api.memberships.removeMember);
    const cancelInvitation = useMutation(api.invitations.cancelInvitation);
    
    const isOwnerOrAdmin = members?.find(m => m.userId === user?._id)?.role !== 'member';
    
    return (
      <div className="member-management">
        <div className="section">
          <h3 className="pixel-font">Current Members</h3>
          
          <table className="retro-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                {isOwnerOrAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members?.map(member => (
                <MemberRow
                  key={member._id}
                  member={member}
                  currentUserRole={currentUserRole}
                  onUpdateRole={updateRole}
                  onRemove={removeMember}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {invitations && invitations.length > 0 && (
          <div className="section">
            <h3 className="pixel-font">Pending Invitations</h3>
            
            <table className="retro-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Sent</th>
                  {isOwnerOrAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {invitations.map(invitation => (
                  <InvitationRow
                    key={invitation._id}
                    invitation={invitation}
                    onCancel={cancelInvitation}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] Add role management dropdown:
  ```typescript
  function MemberRow({ member, currentUserRole, onUpdateRole, onRemove }) {
    const canEdit = currentUserRole === 'owner' || 
      (currentUserRole === 'admin' && member.role === 'member');
      
    const canRemove = currentUserRole === 'owner' && member.role !== 'owner';
    
    return (
      <tr>
        <td>
          <div className="member-info">
            <div className="member-avatar">
              {member.user.name?.[0] || '?'}
            </div>
            <span>{member.user.name || 'Unknown'}</span>
          </div>
        </td>
        <td>{member.user.email}</td>
        <td>
          {canEdit ? (
            <select
              value={member.role}
              onChange={(e) => onUpdateRole({ 
                memberId: member._id, 
                role: e.target.value 
              })}
              className="retro-select small"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {currentUserRole === 'owner' && (
                <option value="owner">Owner</option>
              )}
            </select>
          ) : (
            <span className={`role-badge ${member.role}`}>
              {member.role}
            </span>
          )}
        </td>
        <td>{formatDate(member._creationTime)}</td>
        {canRemove && (
          <td>
            <button 
              onClick={() => onRemove({ memberId: member._id })}
              className="retro-button small danger"
            >
              Remove
            </button>
          </td>
        )}
      </tr>
    );
  }
  ```

### 4.6 Invitation System UI (3-4 hours)
**File**: `src/components/organizations/invite-member-form.tsx`

- [ ] Create invitation form:
  ```typescript
  export function InviteMemberForm({ onClose }: { onClose: () => void }) {
    const { organization } = useAuth();
    const inviteMember = useMutation(api.invitations.sendInvitation);
    
    const [formData, setFormData] = useState({
      email: '',
      role: 'member' as MemberRole,
      message: '',
    });
    
    const [sending, setSending] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSending(true);
      
      try {
        await inviteMember({
          organizationId: organization!._id,
          ...formData,
        });
        
        toast.success('Invitation sent!');
        onClose();
      } catch (error) {
        toast.error('Failed to send invitation');
      } finally {
        setSending(false);
      }
    };
    
    return (
      <form onSubmit={handleSubmit} className="invite-form">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="retro-input"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ 
              ...formData, 
              role: e.target.value as MemberRole 
            })}
            className="retro-select"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Personal Message (Optional)</label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="retro-textarea"
            rows={3}
            placeholder="Add a personal note to the invitation..."
          />
        </div>
        
        <div className="form-actions">
          <RetroButton type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send Invitation'}
          </RetroButton>
          <RetroButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </RetroButton>
        </div>
      </form>
    );
  }
  ```

### 4.7 Organization Settings (4-5 hours)
**File**: `src/components/organizations/organization-settings.tsx`

- [ ] Create settings interface:
  ```typescript
  export function OrganizationSettings() {
    const { organization } = useAuth();
    const updateOrg = useMutation(api.organizations.updateOrganization);
    
    const [formData, setFormData] = useState({
      name: organization?.name || '',
      legalName: organization?.legalName || '',
      taxId: organization?.taxId || '',
      addressLine1: organization?.addressLine1 || '',
      addressLine2: organization?.addressLine2 || '',
      city: organization?.city || '',
      state: organization?.state || '',
      postalCode: organization?.postalCode || '',
      country: organization?.country || 'DE',
      billingEmail: organization?.billingEmail || '',
      phone: organization?.phone || '',
      website: organization?.website || '',
      industry: organization?.industry || '',
      size: organization?.size || '',
    });
    
    const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'apps'>('general');
    
    return (
      <div className="org-settings">
        <div className="settings-tabs">
          <button 
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            Billing & Tax
          </button>
          <button 
            className={`tab ${activeTab === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveTab('apps')}
          >
            App Preferences
          </button>
        </div>
        
        <div className="settings-content">
          {activeTab === 'general' && (
            <GeneralSettings 
              formData={formData}
              onChange={setFormData}
              onSave={handleSave}
            />
          )}
          
          {activeTab === 'billing' && (
            <BillingSettings
              formData={formData}
              onChange={setFormData}
              onSave={handleSave}
              isPersonal={organization?.isPersonal}
            />
          )}
          
          {activeTab === 'apps' && (
            <AppPreferences organizationId={organization?._id} />
          )}
        </div>
      </div>
    );
  }
  ```

### 4.8 Organization List View (3-4 hours)
**File**: `src/components/organizations/organization-list.tsx`

- [ ] Create multi-org management view:
  ```typescript
  export function OrganizationList() {
    const { user, currentOrganization, switchOrganization } = useAuth();
    const { data: organizations } = useQuery(api.organizations.getUserOrganizations);
    const createOrg = useMutation(api.organizations.createOrganization);
    
    return (
      <div className="org-list">
        <h2 className="pixel-font">Your Organizations</h2>
        
        <div className="org-grid">
          {organizations?.map(org => (
            <div 
              key={org._id}
              className={`org-card ${org._id === currentOrganization?._id ? 'active' : ''}`}
              onClick={() => switchOrganization(org._id)}
            >
              <div className="org-icon">
                {org.isPersonal ? '👤' : '🏢'}
              </div>
              
              <div className="org-info">
                <h3>{org.name}</h3>
                <p className="org-type">
                  {org.isPersonal ? 'Personal' : 'Business'}
                </p>
                <p className="org-plan">{org.plan} Plan</p>
              </div>
              
              {org._id === currentOrganization?._id && (
                <div className="current-indicator">Current</div>
              )}
            </div>
          ))}
          
          <div 
            className="org-card new-org"
            onClick={openCreateOrgWindow}
          >
            <div className="org-icon">➕</div>
            <div className="org-info">
              <h3>Create Organization</h3>
              <p>Start a new business</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

### 4.9 App Visibility Settings (2-3 hours)
**File**: `src/components/organizations/app-preferences.tsx`

- [ ] Create app visibility controls:
  ```typescript
  export function AppPreferences({ organizationId }: { organizationId: string }) {
    const { data: installedApps } = useQuery(api.appAccess.getInstalledApps);
    const toggleVisibility = useMutation(api.appAccess.toggleAppVisibility);
    
    return (
      <div className="app-preferences">
        <h3>Installed Apps</h3>
        <p className="help-text">
          Hide apps to declutter your dashboard without uninstalling them.
        </p>
        
        <div className="app-list">
          {installedApps?.map(app => (
            <div key={app.appId} className="app-preference-row">
              <div className="app-info">
                <span className="app-icon">{app.icon}</span>
                <span className="app-name">{app.name}</span>
              </div>
              
              <div className="app-controls">
                <label className="retro-switch">
                  <input
                    type="checkbox"
                    checked={!app.access.hidden}
                    onChange={(e) => toggleVisibility({
                      appId: app.appId,
                      hidden: !e.target.checked,
                    })}
                  />
                  <span className="switch-label">
                    {app.access.hidden ? 'Hidden' : 'Visible'}
                  </span>
                </label>
                
                <button
                  className="retro-button small danger"
                  onClick={() => handleUninstall(app.appId)}
                >
                  Uninstall
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  ```

### 4.10 Integration with Window Manager (3-4 hours)
**File**: `src/hooks/use-window-manager.tsx` (update)

- [ ] Add organization management windows:
  ```typescript
  // Add to window types
  export type WindowType = 
    | 'login'
    | 'register' 
    | 'app-store'
    | 'org-dashboard'
    | 'org-settings'
    | 'member-management'
    | 'create-org'
    | 'invite-member'
    // ... other types
  
  // Add window content mappings
  const windowContent: Record<WindowType, React.ComponentType<any>> = {
    'app-store': AppStoreWindow,
    'org-dashboard': OrganizationDashboardWindow,
    'org-settings': OrganizationSettingsWindow,
    'member-management': MemberManagementWindow,
    'create-org': CreateOrganizationWindow,
    'invite-member': InviteMemberWindow,
    // ... other mappings
  };
  
  // Add helper functions
  export const openAppStoreWindow = () => {
    const { openWindow } = useWindowManager();
    openWindow('app-store', {
      title: 'App Store',
      width: 800,
      height: 600,
      icon: '🛍️',
    });
  };
  
  export const openOrgDashboard = () => {
    const { openWindow } = useWindowManager();
    openWindow('org-dashboard', {
      title: 'Organization Dashboard',
      width: 900,
      height: 700,
      icon: '🏢',
    });
  };
  ```

## UI/UX Guidelines

### Visual Consistency
- Use retro pixel fonts for headers
- Maintain purple/black/white color scheme
- Apply CRT effects sparingly for performance
- Use emoji icons for visual interest
- Keep forms simple and scannable

### Interaction Patterns
- Double-click to open apps/windows
- Right-click for context menus
- Drag windows by title bar
- Use loading states for async operations
- Show success/error feedback clearly

### Responsive Design
- Windows should be resizable (future)
- Minimum window sizes for usability
- Mobile-friendly layouts where possible
- Touch-friendly tap targets

## Testing Checklist

### Organization Management
- [ ] Create new business organization
- [ ] Upgrade personal to business org
- [ ] Switch between multiple orgs
- [ ] Update organization settings
- [ ] Verify data isolation between orgs

### App Store
- [ ] Install free apps
- [ ] Attempt to install pro apps (free plan)
- [ ] Uninstall apps
- [ ] Hide/show apps
- [ ] Filter apps by category

### Member Management
- [ ] Invite new members
- [ ] Change member roles
- [ ] Remove members
- [ ] Cancel invitations
- [ ] Verify permission enforcement

## Next Phase Preview
**Task 014**: Security & Testing
- Comprehensive security audit
- Permission testing
- Cross-org access prevention
- Performance optimization

---

**Remember**: The organization management UI is where users spend most of their time. It must be intuitive, fast, and maintain the retro aesthetic while providing powerful multi-tenant features. Every action must respect organization boundaries.