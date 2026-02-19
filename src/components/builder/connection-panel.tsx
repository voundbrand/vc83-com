"use client";

/**
 * CONNECTION PANEL
 *
 * UI for connecting prototype page data to real database records.
 * Shows detected items (products, events, contacts) and allows:
 * - Creating new records
 * - Linking to existing records
 * - Skipping items (keep as placeholder)
 */

import { useState } from "react";
import {
  useBuilder,
  type SectionConnection,
  type DetectedItem,
  type ExistingRecord,
} from "@/contexts/builder-context";
import {
  Package,
  Calendar,
  User,
  Link as LinkIcon,
  Plus,
  SkipForward,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Loader2,
  FileText,
  Receipt,
  Ticket,
  CalendarCheck,
  Zap,
  CreditCard,
  MessageSquare,
} from "lucide-react";

// ============================================================================
// ITEM TYPE ICONS
// ============================================================================

const ItemTypeIcon = ({ type }: { type: DetectedItem["type"] }) => {
  const icons: Record<DetectedItem["type"], React.ReactNode> = {
    product: <Package className="h-4 w-4 text-emerald-400" />,
    event: <Calendar className="h-4 w-4 text-blue-400" />,
    contact: <User className="h-4 w-4 text-amber-400" />,
    form: <FileText className="h-4 w-4 text-orange-400" />,
    invoice: <Receipt className="h-4 w-4 text-yellow-400" />,
    ticket: <Ticket className="h-4 w-4 text-pink-400" />,
    booking: <CalendarCheck className="h-4 w-4 text-cyan-400" />,
    workflow: <Zap className="h-4 w-4 text-amber-400" />,
    checkout: <CreditCard className="h-4 w-4 text-indigo-400" />,
    conversation: <MessageSquare className="h-4 w-4 text-teal-400" />,
    agent: <User className="h-4 w-4 text-rose-400" />,
  };
  return icons[type] || <Package className="h-4 w-4" />;
};

// ============================================================================
// CONNECTION CHOICE BUTTON
// ============================================================================

interface ChoiceButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: "create" | "link" | "skip";
}

function ChoiceButton({ active, onClick, icon, label, variant }: ChoiceButtonProps) {
  const baseClasses = "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all";
  const variantClasses = {
    create: active
      ? "bg-emerald-600 text-white"
      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
    link: active
      ? "bg-blue-600 text-white"
      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
    skip: active
      ? "bg-neutral-600 text-white"
      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// EXISTING RECORD SELECTOR
// ============================================================================

interface RecordSelectorProps {
  matches: ExistingRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  itemType: DetectedItem["type"];
}

function RecordSelector({ matches, selectedId, onSelect, itemType }: RecordSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatches = matches.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRecord = matches.find((m) => m.id === selectedId);

  return (
    <div className="relative mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-left hover:bg-neutral-700 transition-colors"
      >
        <span className={selectedRecord ? "text-neutral-100" : "text-neutral-500"}>
          {selectedRecord ? selectedRecord.name : `Select existing ${itemType}...`}
        </span>
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-neutral-900 border border-neutral-700 rounded-md shadow-lg max-h-48 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-neutral-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-32 overflow-y-auto">
            {filteredMatches.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-500">No matches found</div>
            ) : (
              filteredMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => {
                    onSelect(match.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-800 transition-colors ${selectedId === match.id ? "bg-neutral-800" : ""
                    }`}
                >
                  <div>
                    <div className="text-sm text-neutral-100">{match.name}</div>
                    {match.isExactMatch && (
                      <div className="text-xs text-emerald-400">Exact match</div>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {Math.round(match.similarity * 100)}% match
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DETECTED ITEM ROW
// ============================================================================

interface DetectedItemRowProps {
  item: DetectedItem;
  sectionId: string;
  onChoiceChange: (
    sectionId: string,
    itemId: string,
    choice: "create" | "link" | "skip",
    linkedRecordId?: string
  ) => void;
}

function DetectedItemRow({ item, sectionId, onChoiceChange }: DetectedItemRowProps) {
  const hasExactMatch = item.existingMatches.some((m) => m.isExactMatch);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    item.linkedRecordId
  );

  const handleChoiceChange = (choice: "create" | "link" | "skip") => {
    if (choice === "link") {
      // When selecting link, use the first match as default if none selected
      const recordId = selectedRecordId || item.existingMatches[0]?.id;
      setSelectedRecordId(recordId || null);
      onChoiceChange(sectionId, item.id, choice, recordId);
    } else {
      onChoiceChange(sectionId, item.id, choice);
    }
  };

  const handleRecordSelect = (recordId: string) => {
    setSelectedRecordId(recordId);
    onChoiceChange(sectionId, item.id, "link", recordId);
  };

  return (
    <div className="py-3 border-b border-neutral-800 last:border-b-0">
      {/* Item header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <ItemTypeIcon type={item.type} />
          <div>
            <div className="text-sm font-medium text-neutral-100">
              {item.placeholderData.name || "Unnamed"}
            </div>
            {item.placeholderData.price && (
              <div className="text-xs text-neutral-500">{item.placeholderData.price}</div>
            )}
          </div>
        </div>

        {/* Warning for exact match */}
        {hasExactMatch && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-900/30 text-amber-400 text-xs rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>Duplicate exists</span>
          </div>
        )}
      </div>

      {/* Choice buttons */}
      <div className="flex flex-wrap gap-2 mb-2">
        {/* Tickets cannot be created from client (internalMutation only) */}
        {item.type !== "ticket" && (
          <ChoiceButton
            active={item.connectionChoice === "create"}
            onClick={() => handleChoiceChange("create")}
            icon={<Plus className="h-3.5 w-3.5" />}
            label="Create New"
            variant="create"
          />
        )}
        <ChoiceButton
          active={item.connectionChoice === "link"}
          onClick={() => handleChoiceChange("link")}
          icon={<LinkIcon className="h-3.5 w-3.5" />}
          label="Link Existing"
          variant="link"
        />
        <ChoiceButton
          active={item.connectionChoice === "skip"}
          onClick={() => handleChoiceChange("skip")}
          icon={<SkipForward className="h-3.5 w-3.5" />}
          label="Skip"
          variant="skip"
        />
      </div>

      {/* Record selector (when linking) */}
      {item.connectionChoice === "link" && item.existingMatches.length > 0 && (
        <RecordSelector
          matches={item.existingMatches}
          selectedId={selectedRecordId}
          onSelect={handleRecordSelect}
          itemType={item.type}
        />
      )}

      {/* No matches warning */}
      {item.connectionChoice === "link" && item.existingMatches.length === 0 && (
        <div className="mt-2 px-3 py-2 bg-neutral-800 rounded-md text-xs text-neutral-400">
          No existing {item.type}s found. Consider creating a new one instead.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SECTION CONNECTION CARD
// ============================================================================

interface SectionConnectionCardProps {
  connection: SectionConnection;
  onChoiceChange: (
    sectionId: string,
    itemId: string,
    choice: "create" | "link" | "skip",
    linkedRecordId?: string
  ) => void;
}

function SectionConnectionCard({ connection, onChoiceChange }: SectionConnectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { addManualConnectionItem } = useBuilder();
  const completedItems = connection.detectedItems.filter((i) => i.connectionChoice !== null);
  const progress = connection.detectedItems.length > 0
    ? completedItems.length / connection.detectedItems.length
    : 0;

  // Infer item type from the section for manual add
  const sectionTypeToItemType: Record<string, DetectedItem["type"]> = {
    pricing: "product", products: "product", team: "contact", crm: "contact",
    forms: "form", events: "event", hero: "event", cta: "event",
    invoices: "invoice", tickets: "ticket", bookings: "booking",
    workflows: "workflow", checkout: "checkout", agent: "agent",
  };
  const itemTypeForSection = sectionTypeToItemType[connection.sectionType] || "form";

  const sectionIcons: Record<string, React.ReactNode> = {
    pricing: <Package className="h-4 w-4" />,
    products: <Package className="h-4 w-4" />,
    form: <FileText className="h-4 w-4" />,
    forms: <FileText className="h-4 w-4" />,
    team: <User className="h-4 w-4" />,
    crm: <User className="h-4 w-4" />,
    hero: <Calendar className="h-4 w-4" />,
    cta: <Calendar className="h-4 w-4" />,
    events: <Calendar className="h-4 w-4" />,
    invoices: <Receipt className="h-4 w-4" />,
    tickets: <Ticket className="h-4 w-4" />,
    bookings: <CalendarCheck className="h-4 w-4" />,
    workflows: <Zap className="h-4 w-4" />,
    checkout: <CreditCard className="h-4 w-4" />,
    agent: <User className="h-4 w-4" />,
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-850 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-neutral-400">
            {sectionIcons[connection.sectionType] || <Package className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-neutral-100">{connection.sectionLabel}</div>
            <div className="text-xs text-neutral-500">
              {connection.detectedItems.length > 0
                ? `${connection.detectedItems.length} item${connection.detectedItems.length !== 1 ? "s" : ""} detected`
                : "No items detected"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-neutral-500">
              {completedItems.length}/{connection.detectedItems.length}
            </span>
          </div>

          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
        </div>
      </button>

      {/* Section items */}
      {isExpanded && (
        <div className="px-4 pb-3">
          {connection.detectedItems.length === 0 ? (
            <div className="text-center py-4 text-neutral-500">
              <p className="text-sm mb-2">No items auto-detected</p>
              <button
                onClick={() => addManualConnectionItem(connection.sectionId, itemTypeForSection)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 text-neutral-300 rounded-md hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add manually
              </button>
            </div>
          ) : (
            <>
              {connection.detectedItems.map((item) => (
                <DetectedItemRow
                  key={item.id}
                  item={item}
                  sectionId={connection.sectionId}
                  onChoiceChange={onChoiceChange}
                />
              ))}
              <button
                onClick={() => addManualConnectionItem(connection.sectionId, itemTypeForSection)}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add another
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONNECTION PANEL (Main Export)
// ============================================================================

interface ConnectionPanelProps {
  onClose: () => void;
  onComplete: () => void;
}

export function ConnectionPanel({ onClose, onComplete }: ConnectionPanelProps) {
  const {
    pendingConnections,
    updateConnectionChoice,
    executeConnections,
    addManualConnectionItem,
    isAnalyzingConnections,
    generationError,
    clearError,
    setBuilderMode,
  } = useBuilder();

  const [isExecuting, setIsExecuting] = useState(false);

  // Calculate totals
  const totalItems = pendingConnections.reduce((sum, c) => sum + c.detectedItems.length, 0);
  const completedItems = pendingConnections.reduce(
    (sum, c) => sum + c.detectedItems.filter((i) => i.connectionChoice !== null).length,
    0
  );
  const allItemsConfigured = totalItems > 0 && completedItems === totalItems;

  // Handle execute all
  const handleExecuteAll = async () => {
    setIsExecuting(true);
    try {
      const success = await executeConnections();
      if (success) {
        onComplete();
      }
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setBuilderMode("prototype");
    onClose();
  };

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">Connect to Data</h2>
          <p className="text-xs text-neutral-500">
            Link your design to real products, events, and contacts
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-400">Configuration Progress</span>
          <span className="text-sm font-medium text-neutral-200">
            {completedItems} / {totalItems} items
          </span>
        </div>
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${allItemsConfigured ? "bg-emerald-500" : "bg-blue-500"
              }`}
            style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {generationError && (
        <div className="mx-4 mt-3 rounded-md border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-medium text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Connect validation issue
            </div>
            <button
              onClick={clearError}
              className="text-rose-300/80 hover:text-rose-100 transition-colors"
              aria-label="Dismiss connect error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans">{generationError}</pre>
        </div>
      )}

      {/* Connections list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pendingConnections.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            {isAnalyzingConnections ? (
              <>
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                <p className="text-neutral-300">Analyzing pages for connections...</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p>No connections needed!</p>
                <p className="text-xs mt-1">Your page doesn't have any items that need linking.</p>
              </>
            )}
          </div>
        ) : (
          pendingConnections.map((connection) => (
            <SectionConnectionCard
              key={connection.sectionId}
              connection={connection}
              onChoiceChange={updateConnectionChoice}
            />
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-900/50">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={handleExecuteAll}
          disabled={!allItemsConfigured || isExecuting}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${allItemsConfigured && !isExecuting
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            }`}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Connect All</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ConnectionPanel;
