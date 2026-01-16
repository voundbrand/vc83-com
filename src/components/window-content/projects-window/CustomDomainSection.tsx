/**
 * CUSTOM DOMAIN SECTION
 *
 * Allows users to connect their own domain to a project public page.
 * Handles domain addition, DNS verification, and status display.
 */

"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Globe,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface CustomDomainSectionProps {
  projectId: Id<"objects">;
  projectSlug: string;
  sessionId: string;
  organizationId: Id<"organizations">;
}

interface DomainInfo {
  id: Id<"objects">;
  domainName: string;
  verified: boolean;
  vercelVerified: boolean;
  vercelMisconfigured: boolean;
  projectSlug?: string;
  dnsInstructions?: Array<{
    type: string;
    domain: string;
    value: string;
    reason?: string;
  }>;
}

export function CustomDomainSection({
  projectId,
  projectSlug,
  sessionId,
  organizationId,
}: CustomDomainSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Fetch existing domains for this project
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex types deep instantiation issue
  const domains = useQuery(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    api.api.v1.externalDomains.listExternalDomains,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  ) as DomainInfo[] | undefined;

  // Filter to only domains linked to this project
  const projectDomains = domains?.filter(
    (d) => d.projectSlug === projectSlug
  ) || [];

  // Actions
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex types deep instantiation issue
  const addDomain = useAction(api.api.v1.externalDomains.addExternalDomain);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex types deep instantiation issue
  const checkVerification = useAction(api.api.v1.externalDomains.checkDomainVerification);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex types deep instantiation issue
  const removeDomain = useAction(api.api.v1.externalDomains.removeExternalDomain);

  // Clear messages after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError("Please enter a domain name");
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(newDomain.trim())) {
      setError("Please enter a valid domain name (e.g., example.com)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addDomain({
        sessionId,
        organizationId,
        domainName: newDomain.trim(),
        projectId,
        projectSlug,
      });

      setSuccessMessage(result.message);
      setNewDomain("");
      setIsAdding(false);

      // Auto-expand the new domain to show DNS instructions
      if (result.domainConfigId) {
        setExpandedDomain(result.domainConfigId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (domainId: Id<"objects">) => {
    setIsVerifying(domainId);
    setError(null);

    try {
      const result = await checkVerification({
        sessionId,
        domainConfigId: domainId,
      });

      if (result.verified) {
        setSuccessMessage("Domain verified successfully! Your site is now live.");
      } else if (result.misconfigured) {
        setError("DNS is misconfigured. Please check your DNS settings and try again.");
      } else {
        setError("Domain not yet verified. DNS changes can take up to 48 hours to propagate.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify domain");
    } finally {
      setIsVerifying(null);
    }
  };

  const handleRemove = async (domainId: Id<"objects">, domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}? This will disconnect the domain from your project.`)) {
      return;
    }

    setIsRemoving(domainId);
    setError(null);

    try {
      await removeDomain({
        sessionId,
        domainConfigId: domainId,
      });
      setSuccessMessage(`${domainName} has been removed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain");
    } finally {
      setIsRemoving(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage("Copied to clipboard!");
  };

  return (
    <div
      className="p-4 border-2"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={18} style={{ color: "var(--win95-highlight)" }} />
          <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Custom Domain
          </h4>
        </div>
        {!isAdding && projectDomains.length === 0 && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-1 border-2 transition-colors hover:opacity-90"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-highlight)",
              color: "white",
            }}
          >
            <Plus size={12} />
            Add Domain
          </button>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
        Connect your own domain to this project page. Visitors to your domain will see your project page.
      </p>

      {/* Error/Success Messages */}
      {error && (
        <div
          className="p-3 mb-4 border-2 flex items-start gap-2"
          style={{ borderColor: "var(--error)", background: "#FEE" }}
        >
          <AlertCircle size={14} style={{ color: "var(--error)" }} className="mt-0.5 flex-shrink-0" />
          <span className="text-xs" style={{ color: "var(--error)" }}>{error}</span>
        </div>
      )}
      {successMessage && (
        <div
          className="p-3 mb-4 border-2 flex items-start gap-2"
          style={{ borderColor: "var(--success)", background: "#EFE" }}
        >
          <CheckCircle size={14} style={{ color: "var(--success)" }} className="mt-0.5 flex-shrink-0" />
          <span className="text-xs" style={{ color: "var(--success)" }}>{successMessage}</span>
        </div>
      )}

      {/* Add Domain Form */}
      {isAdding && (
        <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Domain Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
              placeholder="example.com"
              className="flex-1 px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={isSubmitting}
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <button
              onClick={handleAddDomain}
              disabled={isSubmitting || !newDomain.trim()}
              className="px-4 py-2 text-xs font-bold flex items-center gap-1 border-2 transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-highlight)",
                color: "white",
              }}
            >
              {isSubmitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <Plus size={12} />
                  Add
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewDomain("");
                setError(null);
              }}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-bold border-2 transition-colors hover:opacity-90"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              Cancel
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
            Enter your domain without http:// or www. (e.g., mydomain.com)
          </p>
        </div>
      )}

      {/* Domain List */}
      {projectDomains.length > 0 ? (
        <div className="space-y-3">
          {projectDomains.map((domain: DomainInfo) => (
            <DomainCard
              key={domain.id}
              domain={domain as DomainInfo}
              isExpanded={expandedDomain === domain.id}
              onToggleExpand={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
              onVerify={() => handleVerify(domain.id)}
              onRemove={() => handleRemove(domain.id, domain.domainName)}
              onCopy={copyToClipboard}
              isVerifying={isVerifying === domain.id}
              isRemoving={isRemoving === domain.id}
            />
          ))}
        </div>
      ) : !isAdding ? (
        <div
          className="p-4 text-center border-2 border-dashed"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <Globe size={24} className="mx-auto mb-2" style={{ color: "var(--neutral-gray)" }} />
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No custom domain configured. Add one to use your own domain for this project page.
          </p>
        </div>
      ) : null}

      {/* Add Another Domain */}
      {projectDomains.length > 0 && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-3 px-3 py-1.5 text-xs font-bold flex items-center gap-1 border-2 transition-colors hover:opacity-90"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
            color: "var(--win95-text)",
          }}
        >
          <Plus size={12} />
          Add Another Domain
        </button>
      )}
    </div>
  );
}

// Domain Card Component
interface DomainCardProps {
  domain: DomainInfo;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onVerify: () => void;
  onRemove: () => void;
  onCopy: (text: string) => void;
  isVerifying: boolean;
  isRemoving: boolean;
}

function DomainCard({
  domain,
  isExpanded,
  onToggleExpand,
  onVerify,
  onRemove,
  onCopy,
  isVerifying,
  isRemoving,
}: DomainCardProps) {
  const isVerified = domain.verified && domain.vercelVerified && !domain.vercelMisconfigured;

  return (
    <div
      className="border-2"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
    >
      {/* Domain Header */}
      <div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {isVerified ? (
            <CheckCircle size={16} style={{ color: "var(--success)" }} />
          ) : domain.vercelMisconfigured ? (
            <XCircle size={16} style={{ color: "var(--error)" }} />
          ) : (
            <AlertCircle size={16} style={{ color: "var(--warning, #F59E0B)" }} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                {domain.domainName}
              </span>
              {isVerified && (
                <a
                  href={`https://${domain.domainName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:opacity-70"
                >
                  <ExternalLink size={12} style={{ color: "var(--win95-highlight)" }} />
                </a>
              )}
            </div>
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {isVerified
                ? "Active - Your domain is live"
                : domain.vercelMisconfigured
                ? "Misconfigured - Check DNS settings"
                : "Pending - Configure DNS to activate"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isVerified && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVerify();
              }}
              disabled={isVerifying}
              className="px-2 py-1 text-xs font-bold flex items-center gap-1 border-2 transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              {isVerifying ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <RefreshCw size={10} />
              )}
              Verify
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={isRemoving}
            className="p-1.5 border-2 transition-colors hover:opacity-90 disabled:opacity-50"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            {isRemoving ? (
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--error)" }} />
            ) : (
              <Trash2 size={12} style={{ color: "var(--error)" }} />
            )}
          </button>
          {isExpanded ? (
            <ChevronUp size={14} style={{ color: "var(--neutral-gray)" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "var(--neutral-gray)" }} />
          )}
        </div>
      </div>

      {/* Expanded DNS Instructions */}
      {isExpanded && (
        <div className="border-t-2 p-3" style={{ borderColor: "var(--win95-border)" }}>
          <DNSInstructions
            domainName={domain.domainName}
            dnsInstructions={domain.dnsInstructions}
            isVerified={isVerified}
            onCopy={onCopy}
          />
        </div>
      )}
    </div>
  );
}

// DNS Instructions Component
interface DNSInstructionsProps {
  domainName: string;
  dnsInstructions?: Array<{
    type: string;
    domain: string;
    value: string;
    reason?: string;
  }>;
  isVerified: boolean;
  onCopy: (text: string) => void;
}

function DNSInstructions({
  domainName,
  dnsInstructions,
  isVerified,
  onCopy,
}: DNSInstructionsProps) {
  if (isVerified) {
    return (
      <div className="flex items-start gap-2 p-3" style={{ background: "#EFE" }}>
        <CheckCircle size={14} style={{ color: "var(--success)" }} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold" style={{ color: "var(--success)" }}>
            Domain is active!
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Your custom domain is properly configured and serving your project page.
          </p>
        </div>
      </div>
    );
  }

  // Determine if apex domain or subdomain
  const isApex = !domainName.includes(".") || domainName.split(".").length === 2;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3" style={{ background: "#FEF3C7" }}>
        <Info size={14} style={{ color: "#D97706" }} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold" style={{ color: "#D97706" }}>
            DNS Configuration Required
          </p>
          <p className="text-xs mt-1" style={{ color: "#92400E" }}>
            Add the following DNS records to your domain provider (GoDaddy, Namecheap, Cloudflare, etc.)
            DNS changes can take up to 48 hours to propagate.
          </p>
        </div>
      </div>

      {/* DNS Records */}
      <div>
        <h5 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Required DNS Records
        </h5>

        <div className="space-y-2">
          {/* If we have specific instructions from Vercel, show those */}
          {dnsInstructions && dnsInstructions.length > 0 ? (
            dnsInstructions.map((instruction, index) => (
              <DNSRecordRow
                key={index}
                type={instruction.type}
                name={instruction.domain.replace(`.${domainName}`, "") || "@"}
                value={instruction.value}
                onCopy={onCopy}
              />
            ))
          ) : (
            /* Default instructions */
            <>
              {isApex ? (
                /* Apex domain - needs A record */
                <>
                  <DNSRecordRow
                    type="A"
                    name="@"
                    value="76.76.21.21"
                    onCopy={onCopy}
                  />
                  <p className="text-xs mt-2 p-2" style={{ background: "var(--win95-bg-light)", color: "var(--neutral-gray)" }}>
                    <strong>Note:</strong> For apex domains (no www), you need an A record. Some DNS providers also support ALIAS or ANAME records which you can point to <code className="px-1 py-0.5" style={{ background: "var(--win95-bg)" }}>cname.vercel-dns.com</code>
                  </p>
                </>
              ) : (
                /* Subdomain - needs CNAME */
                <DNSRecordRow
                  type="CNAME"
                  name={domainName.split(".")[0]}
                  value="cname.vercel-dns.com"
                  onCopy={onCopy}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Optional: www redirect */}
      {isApex && (
        <div>
          <h5 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Optional: www Redirect
          </h5>
          <DNSRecordRow
            type="CNAME"
            name="www"
            value="cname.vercel-dns.com"
            onCopy={onCopy}
          />
          <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
            This will redirect www.{domainName} to {domainName}
          </p>
        </div>
      )}

      {/* Verification Note */}
      <div className="p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          After updating your DNS records, click the <strong>Verify</strong> button above to check the configuration.
          SSL certificates will be automatically provisioned once the domain is verified.
        </p>
      </div>
    </div>
  );
}

// DNS Record Row Component
interface DNSRecordRowProps {
  type: string;
  name: string;
  value: string;
  onCopy: (text: string) => void;
}

function DNSRecordRow({ type, name, value, onCopy }: DNSRecordRowProps) {
  return (
    <div
      className="grid grid-cols-12 gap-2 p-2 text-xs border-2"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
    >
      <div className="col-span-2">
        <span className="font-bold" style={{ color: "var(--win95-text)" }}>Type</span>
        <div className="mt-1 px-2 py-1 font-mono" style={{ background: "var(--win95-bg-light)" }}>
          {type}
        </div>
      </div>
      <div className="col-span-3">
        <span className="font-bold" style={{ color: "var(--win95-text)" }}>Name/Host</span>
        <div className="mt-1 px-2 py-1 font-mono flex items-center justify-between" style={{ background: "var(--win95-bg-light)" }}>
          <span className="truncate">{name}</span>
          <button
            onClick={() => onCopy(name)}
            className="ml-1 p-0.5 hover:opacity-70"
          >
            <Copy size={10} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>
      </div>
      <div className="col-span-7">
        <span className="font-bold" style={{ color: "var(--win95-text)" }}>Value/Points to</span>
        <div className="mt-1 px-2 py-1 font-mono flex items-center justify-between" style={{ background: "var(--win95-bg-light)" }}>
          <span className="truncate">{value}</span>
          <button
            onClick={() => onCopy(value)}
            className="ml-1 p-0.5 hover:opacity-70"
          >
            <Copy size={10} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
