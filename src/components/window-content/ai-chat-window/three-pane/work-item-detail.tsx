"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import {
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building2,
  Phone,
  Briefcase,
  Check,
  X,
  Loader2,
  FileText
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../../convex/_generated/api") as { api: any }
import { Id } from "../../../../../convex/_generated/dataModel"
import { AIWorkItemDetail } from "./ai-work-item-detail"

interface WorkItem {
  id: Id<"contactSyncs"> | Id<"emailCampaigns"> | Id<"aiWorkItems">;
  type: "contact_sync" | "email_campaign" | `ai_${string}`;
  name: string;
  status: string;
  createdAt: number;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface WorkItemDetailProps {
  item: WorkItem;
  onActionComplete?: () => void;
}

interface ContactSyncRecord {
  provider: string
  userName: string
  startedAt: number
  completedAt?: number
  totalContacts: number
  created: number
  updated: number
  skipped: number
  failed: number
  status: string
}

interface ContactSyncItemRecord {
  id: string
  sourceName: string
  sourceEmail: string
  match: {
    action: string
    reason: string
  }
  data?: {
    companyName?: string
    jobTitle?: string
    mobilePhone?: string
  } | null
}

interface EmailCampaignRecord {
  name: string
  userName: string
  createdAt: number
  sentAt?: number
  aiTone?: string
  totalRecipients: number
  sent: number
  queued?: number
  failed: number
  status: string
}

interface EmailCampaignItemRecord {
  recipientId: string
  recipientName: string
  recipientEmail: string
  subject: string
  body: string
  personalization: Record<string, string | number | boolean | null | undefined>
}

// Action Buttons Component
function ActionButtons({
  itemType,
  itemId,
  status,
  onActionComplete,
}: {
  itemType: "contact_sync" | "email_campaign";
  itemId: Id<"contactSyncs"> | Id<"emailCampaigns">;
  status: string;
  onActionComplete?: () => void;
}) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params)
    return translated === key ? fallback : translated
  }
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const approveContactSync = useAction(apiAny.ai.workItemActions.approveContactSync);
  const cancelContactSync = useMutation(apiAny.ai.workItemActions.cancelContactSync);
  const approveEmailCampaign = useAction(apiAny.ai.workItemActions.approveEmailCampaign);
  const cancelEmailCampaign = useMutation(apiAny.ai.workItemActions.cancelEmailCampaign);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      if (itemType === "contact_sync") {
        await approveContactSync({ syncId: itemId as Id<"contactSyncs"> });
      } else {
        await approveEmailCampaign({ campaignId: itemId as Id<"emailCampaigns"> });
      }

      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(tx("ui.ai_assistant.work_items.cancel_confirm", "Are you sure you want to cancel this? This action cannot be undone."))) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      if (itemType === "contact_sync") {
        await cancelContactSync({ syncId: itemId as Id<"contactSyncs"> });
      } else {
        await cancelEmailCampaign({ campaignId: itemId as Id<"emailCampaigns"> });
      }

      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setIsCancelling(false);
    }
  };

  // Only show buttons for preview/draft/pending statuses
  const canApprove = status === "preview" || status === "draft" || status === "pending";

  if (!canApprove) {
    return null;
  }

  return (
    <div className="p-3 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
      {error && (
        <div
          className="retro-error mb-2"
        >
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {/* Approve Button - Uses primary variant for emphasis */}
        <button
          onClick={handleApprove}
          disabled={isApproving || isCancelling}
          className="desktop-shell-button desktop-shell-button-primary flex-1 flex items-center justify-center gap-2 text-sm"
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{tx("ui.ai_assistant.work_items.approving", "Approving...")}</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{tx("ui.ai_assistant.work_items.approve", "Approve")}</span>
            </>
          )}
        </button>

        {/* Cancel Button - Uses outline variant for secondary action */}
        <button
          onClick={handleCancel}
          disabled={isApproving || isCancelling}
          className="desktop-shell-button flex-1 flex items-center justify-center gap-2 text-sm"
        >
          {isCancelling ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{tx("ui.ai_assistant.work_items.cancelling", "Cancelling...")}</span>
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              <span>{tx("ui.ai_assistant.work_items.cancel", "Cancel")}</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs mt-2 text-center" style={{ color: 'var(--window-document-text-muted)' }}>
        {itemType === "contact_sync"
          ? tx("ui.ai_assistant.work_items.contact_sync_approve_hint", "Approve to create/update contacts in CRM")
          : tx("ui.ai_assistant.work_items.email_campaign_approve_hint", "Approve to send emails to all recipients")}
      </p>
    </div>
  );
}

// Contact Sync Detail View
function ContactSyncDetail({
  syncId,
  onActionComplete,
}: {
  syncId: Id<"contactSyncs">;
  onActionComplete?: () => void;
}) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params)
    return translated === key ? fallback : translated
  }
  const sync = useQuery(apiAny.ai.workItems.getContactSync, { syncId }) as ContactSyncRecord | null | undefined;
  const items = useQuery(apiAny.ai.workItems.getContactSyncItems, { syncId }) as ContactSyncItemRecord[] | undefined;

  if (!sync) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
          {tx("ui.ai_assistant.work_items.loading_sync_details", "Loading sync details...")}
        </p>
      </div>
    );
  }

  // Action badge configuration
  const actionConfig: Record<string, { color: string; bgColor: string; icon: typeof CheckCircle2; label: string }> = {
    create: { color: 'var(--success)', bgColor: 'var(--success-bg)', icon: CheckCircle2, label: 'Create' },
    update: { color: 'var(--info)', bgColor: 'var(--info-bg)', icon: AlertCircle, label: 'Update' },
    skip: { color: 'var(--window-document-text-muted)', bgColor: 'var(--window-document-border)', icon: XCircle, label: 'Skip' },
    merge: { color: 'var(--warning)', bgColor: 'var(--warning-bg)', icon: AlertCircle, label: 'Merge' },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sync Info */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          {tx("ui.ai_assistant.work_items.contact_sync_title", "{provider} Contact Sync", {
            provider: sync.provider === "microsoft"
              ? tx("ui.ai_assistant.work_items.provider_microsoft", "Microsoft")
              : tx("ui.ai_assistant.work_items.provider_google", "Google"),
          })}
        </p>
        <div className="space-y-1 text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
          <p>{tx("ui.ai_assistant.work_items.initiated_by", "Initiated by:")} {sync.userName}</p>
          <p>{tx("ui.ai_assistant.work_items.started", "Started:")} {new Date(sync.startedAt).toLocaleString()}</p>
          {sync.completedAt && (
            <p>{tx("ui.ai_assistant.work_items.completed", "Completed:")} {new Date(sync.completedAt).toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          {tx("ui.ai_assistant.work_items.statistics", "Statistics")}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.total", "Total:")}</p>
            <p className="font-semibold" style={{ color: 'var(--window-document-text)' }}>{sync.totalContacts}</p>
          </div>
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.created", "Created:")}</p>
            <p className="font-semibold" style={{ color: 'var(--success)' }}>{sync.created}</p>
          </div>
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.updated", "Updated:")}</p>
            <p className="font-semibold" style={{ color: 'var(--info)' }}>{sync.updated}</p>
          </div>
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.skipped", "Skipped:")}</p>
            <p className="font-semibold" style={{ color: 'var(--window-document-text-muted)' }}>{sync.skipped}</p>
          </div>
          {sync.failed > 0 && (
            <div>
              <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.failed", "Failed:")}</p>
              <p className="font-semibold" style={{ color: 'var(--error)' }}>{sync.failed}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        itemType="contact_sync"
        itemId={syncId}
        status={sync.status}
        onActionComplete={onActionComplete}
      />

      {/* Contact Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--window-document-text)' }}>
            {tx("ui.ai_assistant.work_items.contacts_count", "Contacts ({count})", {
              count: items?.length || 0,
            })}
          </p>
          {!items || items.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--window-document-text-muted)' }}>
              {tx("ui.ai_assistant.work_items.no_preview_data", "No preview data available")}
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((contact: ContactSyncItemRecord) => {
                const config = actionConfig[contact.match.action];
                const ActionIcon = config.icon;

                return (
                  <div
                    key={contact.id}
                    className="p-2 border rounded"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      background: 'var(--window-document-bg)'
                    }}
                  >
                    {/* Contact Header */}
                    <div className="flex items-start gap-2 mb-2">
                      <User className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--window-document-text)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--window-document-text)' }}>
                          {contact.sourceName}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--window-document-text-muted)' }}>
                          {contact.sourceEmail}
                        </p>
                      </div>
                    </div>

                    {/* Action Badge */}
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs mb-1"
                      style={{
                        background: config.bgColor,
                        color: config.color
                      }}
                    >
                      <ActionIcon className="w-3 h-3" />
                      {config.label}
                    </div>

                    {/* Match Reason */}
                    <p className="text-xs mt-1" style={{ color: 'var(--window-document-text-muted)' }}>
                      {contact.match.reason}
                    </p>

                    {/* Contact Details */}
                    {contact.data && (
                      <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: 'var(--window-document-border)' }}>
                        {(contact.data as { companyName?: string; jobTitle?: string; mobilePhone?: string }).companyName && (
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="w-3 h-3" style={{ color: 'var(--window-document-text-muted)' }} />
                            <span style={{ color: 'var(--window-document-text)' }}>{(contact.data as { companyName?: string }).companyName}</span>
                          </div>
                        )}
                        {(contact.data as { companyName?: string; jobTitle?: string; mobilePhone?: string }).jobTitle && (
                          <div className="flex items-center gap-1 text-xs">
                            <Briefcase className="w-3 h-3" style={{ color: 'var(--window-document-text-muted)' }} />
                            <span style={{ color: 'var(--window-document-text)' }}>{(contact.data as { jobTitle?: string }).jobTitle}</span>
                          </div>
                        )}
                        {(contact.data as { companyName?: string; jobTitle?: string; mobilePhone?: string }).mobilePhone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" style={{ color: 'var(--window-document-text-muted)' }} />
                            <span style={{ color: 'var(--window-document-text)' }}>{(contact.data as { mobilePhone?: string }).mobilePhone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Email Campaign Detail View
function EmailCampaignDetail({
  campaignId,
  onActionComplete,
}: {
  campaignId: Id<"emailCampaigns">;
  onActionComplete?: () => void;
}) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params)
    return translated === key ? fallback : translated
  }
  const campaign = useQuery(apiAny.ai.workItems.getEmailCampaign, { campaignId }) as EmailCampaignRecord | null | undefined;
  const items = useQuery(apiAny.ai.workItems.getEmailCampaignItems, { campaignId }) as EmailCampaignItemRecord[] | undefined;

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
          {tx("ui.ai_assistant.work_items.loading_campaign_details", "Loading campaign details...")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Campaign Info */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          {campaign.name}
        </p>
        <div className="space-y-1 text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
          <p>{tx("ui.ai_assistant.work_items.created_by", "Created by:")} {campaign.userName}</p>
          <p>{tx("ui.ai_assistant.work_items.created_at", "Created:")} {new Date(campaign.createdAt).toLocaleString()}</p>
          {campaign.sentAt && (
            <p>{tx("ui.ai_assistant.work_items.sent", "Sent:")} {new Date(campaign.sentAt).toLocaleString()}</p>
          )}
          {campaign.aiTone && (
            <p>{tx("ui.ai_assistant.work_items.tone", "Tone:")} {campaign.aiTone}</p>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--window-document-text)' }}>
          {tx("ui.ai_assistant.work_items.statistics", "Statistics")}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.recipients", "Recipients:")}</p>
            <p className="font-semibold" style={{ color: 'var(--window-document-text)' }}>{campaign.totalRecipients}</p>
          </div>
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.sent", "Sent:")}</p>
            <p className="font-semibold" style={{ color: 'var(--success)' }}>{campaign.sent}</p>
          </div>
          <div>
            <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.queued", "Queued:")}</p>
            <p className="font-semibold" style={{ color: 'var(--info)' }}>{campaign.queued || 0}</p>
          </div>
          {campaign.failed > 0 && (
            <div>
              <p style={{ color: 'var(--window-document-text-muted)' }}>{tx("ui.ai_assistant.work_items.failed", "Failed:")}</p>
              <p className="font-semibold" style={{ color: 'var(--error)' }}>{campaign.failed}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        itemType="email_campaign"
        itemId={campaignId}
        status={campaign.status}
        onActionComplete={onActionComplete}
      />

      {/* Email Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--window-document-text)' }}>
            {tx("ui.ai_assistant.work_items.emails_count", "Emails ({count})", {
              count: items?.length || 0,
            })}
          </p>
          {!items || items.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--window-document-text-muted)' }}>
              {tx("ui.ai_assistant.work_items.no_preview_data", "No preview data available")}
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((email: EmailCampaignItemRecord, index: number) => (
                <div
                  key={`${email.recipientId}-${index}`}
                  className="p-2 border rounded"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'var(--window-document-bg)'
                  }}
                >
                  {/* Recipient Header */}
                  <div className="flex items-start gap-2 mb-2">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--window-document-text)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--window-document-text)' }}>
                        {email.recipientName}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--window-document-text-muted)' }}>
                        {email.recipientEmail}
                      </p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.ai_assistant.work_items.subject", "Subject:")}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--window-document-text-muted)' }}>
                      {email.subject}
                    </p>
                  </div>

                  {/* Body Preview */}
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.ai_assistant.work_items.preview", "Preview:")}
                    </p>
                    <p
                      className="text-xs line-clamp-3"
                      style={{ color: 'var(--window-document-text-muted)' }}
                    >
                      {email.body}
                    </p>
                  </div>

                  {/* Personalization */}
                  {Object.keys(email.personalization).length > 0 && (
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                        {tx("ui.ai_assistant.work_items.personalization", "Personalization:")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(email.personalization).slice(0, 3).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-block px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: 'var(--window-document-border)',
                              color: 'var(--window-document-text-muted)'
                            }}
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Detail Component
export function WorkItemDetail({ item, onActionComplete }: WorkItemDetailProps): ReactNode {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params)
    return translated === key ? fallback : translated
  }

  // Check if this is an AI work item (starts with "ai_")
  const isAIWorkItem = item.type.startsWith("ai_")

  // Get icon based on type
  const getIcon = () => {
    if (item.type === "contact_sync") return Users
    if (item.type === "email_campaign") return Mail
    return FileText
  }

  const Icon = getIcon()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 border-b"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--desktop-shell-accent)'
        }}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--window-document-text)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--window-document-text)' }}>
          {tx("ui.ai_assistant.work_items.details", "Details")}
        </span>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-hidden">
        {isAIWorkItem ? (
          <AIWorkItemDetail itemId={item.id as Id<"aiWorkItems">} />
        ) : item.type === "contact_sync" ? (
          <ContactSyncDetail
            syncId={item.id as Id<"contactSyncs">}
            onActionComplete={onActionComplete}
          />
        ) : (
          <EmailCampaignDetail
            campaignId={item.id as Id<"emailCampaigns">}
            onActionComplete={onActionComplete}
          />
        )}
      </div>
    </div>
  );
}
