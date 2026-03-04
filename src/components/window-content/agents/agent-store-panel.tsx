"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AgentStorePanelApi {
  ai: {
    agentStoreCatalog: {
      listCatalogCards: unknown;
      compareCatalogCards: unknown;
      getClonePreflight: unknown;
      getCatalogAgentProductContext: unknown;
    };
    agentExecution: {
      spawn_use_case_agent: unknown;
    };
  };
}

const apiAny = require("../../../../convex/_generated/api").api as AgentStorePanelApi;

type StoreCard = {
  cardId: string;
  catalogAgentNumber: number;
  published: boolean;
  displayName: string;
  verticalCategory: string;
  tier: string;
  abilityTags: string[];
  toolTags: Array<{
    key: string;
    status: "available_now" | "planned";
    requirementLevel: "required" | "recommended" | "optional";
  }>;
  frameworkTags: string[];
  integrationTags: Array<{
    key: string;
    status: "available_now" | "blocked";
  }>;
  strengthTags: string[];
  weaknessTags: string[];
  supportedAccessModes: string[];
  channelAffinity: string[];
  autonomyDefault: string;
  runtimeAvailability: "available_now" | "planned";
  capabilitySnapshotPreview: {
    availableNowCount: number;
    blockedCount: number;
  };
  templateAvailability: {
    hasTemplate: boolean;
    templateAgentId?: Id<"objects">;
  };
};

export type AgentCatalogCard = StoreCard;

type ListCatalogCardsResult = {
  cards: StoreCard[];
  noFitEscalation: {
    minimum: string;
    deposit: string;
    onboarding: string;
  };
};

type CompareCatalogCardsResult = {
  cards: StoreCard[];
  comparison: {
    sharedAbilityTags: string[];
    sharedToolTags: string[];
    sharedFrameworkTags: string[];
    missingIntegrationsByCard: Array<{
      catalogAgentNumber: number;
      missingIntegrations: string[];
    }>;
  };
};

type ClonePreflightResult = {
  card: StoreCard;
  capabilitySnapshot: {
    availableNow: Array<{
      capabilityId: string;
      label: string;
    }>;
    blocked: Array<{
      capabilityId: string;
      label: string;
      blockerType:
        | "integration_missing"
        | "tool_not_enabled"
        | "channel_unavailable"
        | "access_mode_restricted"
        | "runtime_planned";
      blockerKey?: string;
    }>;
  };
  allowClone: boolean;
  noFitEscalation: {
    minimum: string;
    deposit: string;
    onboarding: string;
  };
};

type CatalogProductContextResult = {
  card: StoreCard;
  productPage: {
    entry: {
      name: string;
      category: string;
      tier: string;
      subtype: string;
      toolProfile: string;
      runtimeStatus: string;
      catalogStatus: string;
      published: boolean;
      autonomyDefault: string;
    };
    requirements: {
      requiredIntegrations: string[];
      requiredTools: string[];
      requiredCapabilities: string[];
      supportedAccessModes: string[];
      channelAffinity: string[];
    };
    capabilitySnapshot: ClonePreflightResult["capabilitySnapshot"];
    tools: Array<{
      toolName: string;
      requirementLevel: "required" | "recommended" | "optional";
      implementationStatus: "implemented" | "missing";
      source: "registry" | "interview_tools" | "proposed_new";
      integrationDependency?: string | null;
    }>;
    template: {
      hasTemplate: boolean;
      templateAgentId?: Id<"objects">;
      seedCoverage: "full" | "skeleton" | "missing";
      requiresSoulBuild: boolean;
    };
  };
};

type CloneNowResult =
  | {
      status: "success";
      cloneAgentId: Id<"objects">;
      cloneAgentName: string;
      reused: boolean;
      created: boolean;
      isPrimary: boolean;
      useCase: string;
      useCaseKey: string;
      allowClone: boolean;
    }
  | {
      status: "blocked";
      reason: "catalog_template_mismatch" | "capability_limits_blocked";
      message: string;
      allowClone: false;
    };

const DEFAULT_NO_FIT_ESCALATION = {
  minimum: "€5,000 minimum",
  deposit: "€2,500 deposit",
  onboarding: "includes 90-minute onboarding with engineer",
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "core", label: "Core" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health" },
  { value: "coaching", label: "Coaching" },
  { value: "agency", label: "Agency" },
  { value: "trades", label: "Trades" },
  { value: "ecommerce", label: "Ecommerce" },
] as const;

const ACCESS_MODE_OPTIONS = [
  { value: "all", label: "All access modes" },
  { value: "invisible", label: "Invisible" },
  { value: "direct", label: "Direct" },
  { value: "meeting", label: "Meeting" },
] as const;

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "name", label: "Name" },
  { value: "tier", label: "Tier" },
  { value: "newest", label: "Newest" },
] as const;
const DETAIL_TABS: Array<{ id: CatalogDetailTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "tools", label: "Tools" },
  { id: "runtime", label: "Runtime" },
  { id: "dependencies", label: "Dependencies" },
  { id: "capability", label: "Capability limits" },
];

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]["value"];
type AccessModeFilter = (typeof ACCESS_MODE_OPTIONS)[number]["value"];
type SortMode = (typeof SORT_OPTIONS)[number]["value"];
type CatalogDetailTab = "summary" | "tools" | "runtime" | "dependencies" | "capability";

interface AgentStorePanelProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onBack: () => void;
  onOpenAssistant: (card: AgentCatalogCard) => void;
  onRequestCustomOrder: () => void;
}

function humanizeToken(token: string): string {
  return token
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeBlockerType(
  blockerType:
    | "integration_missing"
    | "tool_not_enabled"
    | "channel_unavailable"
    | "access_mode_restricted"
    | "runtime_planned"
): string {
  switch (blockerType) {
    case "integration_missing":
      return "Integration missing";
    case "tool_not_enabled":
      return "Tool not enabled";
    case "channel_unavailable":
      return "Channel unavailable";
    case "access_mode_restricted":
      return "Access mode restricted";
    case "runtime_planned":
      return "Planned capability";
    default:
      return humanizeToken(blockerType);
  }
}

function chipStyles(status: "available" | "planned" | "blocked") {
  if (status === "available") {
    return {
      borderColor: "var(--tone-success)",
      color: "var(--tone-success)",
      background: "color-mix(in srgb, var(--tone-success) 12%, transparent)",
    };
  }
  if (status === "blocked") {
    return {
      borderColor: "var(--tone-warning)",
      color: "var(--tone-warning)",
      background: "color-mix(in srgb, var(--tone-warning) 12%, transparent)",
    };
  }
  return {
    borderColor: "var(--window-document-border)",
    color: "var(--neutral-gray)",
    background: "var(--window-document-card-bg, var(--window-document-bg))",
  };
}

function resolvePreferredAccessMode(
  modes: string[]
): "invisible" | "direct" | "meeting" | undefined {
  const normalized = new Set(
    (modes || []).map((mode) => mode.trim().toLowerCase())
  );
  if (normalized.has("invisible")) {
    return "invisible";
  }
  if (normalized.has("direct")) {
    return "direct";
  }
  if (normalized.has("meeting")) {
    return "meeting";
  }
  return undefined;
}

export function AgentStorePanel({
  sessionId,
  organizationId,
  onBack,
  onOpenAssistant,
  onRequestCustomOrder,
}: AgentStorePanelProps) {
  const { t } = useNamespaceTranslations("ui.agents");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown;
  const unsafeUseAction = useAction as unknown as (
    actionRef: unknown
  ) => (args: unknown) => Promise<unknown>;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [tier, setTier] = useState("all");
  const [accessMode, setAccessMode] = useState<AccessModeFilter>("all");
  const [onlyReadyNow, setOnlyReadyNow] = useState(false);
  const [sort, setSort] = useState<SortMode>("recommended");
  const [compareNumbers, setCompareNumbers] = useState<number[]>([]);
  const [selectedCatalogNumber, setSelectedCatalogNumber] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<CatalogDetailTab>("summary");
  const [cloneMessage, setCloneMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [cloningCatalogNumber, setCloningCatalogNumber] = useState<number | null>(null);
  const spawnUseCaseAgent = unsafeUseAction(apiAny.ai.agentExecution.spawn_use_case_agent);

  const listArgs = useMemo(() => {
    const filters: Record<string, unknown> = {};
    if (category !== "all") {
      filters.category = category;
    }
    if (tier !== "all") {
      filters.tier = tier;
    }
    if (accessMode !== "all") {
      filters.accessMode = accessMode;
    }
    if (onlyReadyNow) {
      filters.onlyReadyNow = true;
    }
    if (search.trim().length > 0) {
      filters.search = search.trim();
    }

    return {
      sessionId,
      organizationId,
      sort,
      pagination: {
        limit: 60,
      },
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }, [accessMode, category, onlyReadyNow, organizationId, search, sessionId, sort, tier]);

  const listResult = unsafeUseQuery(
    apiAny.ai.agentStoreCatalog.listCatalogCards,
    listArgs
  ) as ListCatalogCardsResult | undefined;
  const cards = listResult?.cards ?? [];

  const availableTiers = useMemo(() => {
    return Array.from(new Set(cards.map((card) => card.tier))).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  useEffect(() => {
    if (availableTiers.length === 0) {
      if (tier !== "all") {
        setTier("all");
      }
      return;
    }
    if (tier !== "all" && !availableTiers.includes(tier)) {
      setTier("all");
    }
  }, [availableTiers, tier]);

  useEffect(() => {
    if (cards.length === 0) {
      if (compareNumbers.length > 0) {
        setCompareNumbers([]);
      }
      if (selectedCatalogNumber !== null) {
        setSelectedCatalogNumber(null);
      }
      return;
    }

    const validNumbers = new Set(cards.map((card) => card.catalogAgentNumber));
    const nextCompare = compareNumbers.filter((number) => validNumbers.has(number));
    if (nextCompare.length !== compareNumbers.length) {
      setCompareNumbers(nextCompare);
    }
    if (selectedCatalogNumber !== null && !validNumbers.has(selectedCatalogNumber)) {
      setSelectedCatalogNumber(null);
    }
  }, [cards, compareNumbers, selectedCatalogNumber]);

  useEffect(() => {
    if (selectedCatalogNumber === null) {
      setDetailTab("summary");
    }
  }, [selectedCatalogNumber]);

  const compareArgs = useMemo(() => {
    if (compareNumbers.length < 2) {
      return "skip";
    }
    return {
      sessionId,
      organizationId,
      catalogAgentNumbers: compareNumbers,
    };
  }, [compareNumbers, organizationId, sessionId]);

  const compareResult = unsafeUseQuery(
    apiAny.ai.agentStoreCatalog.compareCatalogCards,
    compareArgs
  ) as CompareCatalogCardsResult | undefined;

  const preflightArgs = useMemo(() => {
    if (selectedCatalogNumber === null) {
      return "skip";
    }
    return {
      sessionId,
      organizationId,
      catalogAgentNumber: selectedCatalogNumber,
    };
  }, [organizationId, selectedCatalogNumber, sessionId]);

  const preflightResult = unsafeUseQuery(
    apiAny.ai.agentStoreCatalog.getClonePreflight,
    preflightArgs
  ) as ClonePreflightResult | undefined;

  const productContextArgs = useMemo(() => {
    if (selectedCatalogNumber === null) {
      return "skip";
    }
    return {
      sessionId,
      organizationId,
      catalogAgentNumber: selectedCatalogNumber,
    };
  }, [organizationId, selectedCatalogNumber, sessionId]);

  const productContext = unsafeUseQuery(
    apiAny.ai.agentStoreCatalog.getCatalogAgentProductContext,
    productContextArgs
  ) as CatalogProductContextResult | undefined;

  const noFitEscalation =
    preflightResult?.noFitEscalation
    || listResult?.noFitEscalation
    || DEFAULT_NO_FIT_ESCALATION;
  const detailProductContext = productContext && typeof productContext === "object" && "productPage" in productContext
    ? productContext
    : undefined;
  const detailCapabilitySnapshot =
    preflightResult?.capabilitySnapshot
    || detailProductContext?.productPage?.capabilitySnapshot;

  const toggleCompare = (catalogAgentNumber: number) => {
    setCompareNumbers((previous) => {
      if (previous.includes(catalogAgentNumber)) {
        return previous.filter((number) => number !== catalogAgentNumber);
      }
      return [...previous, catalogAgentNumber].sort((a, b) => a - b);
    });
  };

  const handleCloneNow = async (card: StoreCard) => {
    const templateAgentId = card.templateAvailability.templateAgentId;
    if (!templateAgentId) {
      setCloneMessage({
        type: "error",
        text: `Activation blocked for #${card.catalogAgentNumber}: no protected template binding found.`,
      });
      setSelectedCatalogNumber(card.catalogAgentNumber);
      return;
    }

    setCloneMessage(null);
    setSelectedCatalogNumber(card.catalogAgentNumber);
    setCloningCatalogNumber(card.catalogAgentNumber);
    try {
      const result = (await spawnUseCaseAgent({
        sessionId,
        organizationId,
        templateAgentId,
        catalogAgentNumber: card.catalogAgentNumber,
        useCase: card.displayName,
        requestedAccessMode: resolvePreferredAccessMode(card.supportedAccessModes),
        requestedChannel: card.channelAffinity[0],
        spawnReason: "agent_catalog_activate",
        reuseExisting: true,
      })) as CloneNowResult;

      if (result.status === "success") {
        const verb = result.reused ? "Reused" : "Activated";
        const primaryLabel = result.isPrimary ? " Primary assigned." : "";
        setCloneMessage({
          type: "success",
          text: `${verb} "${result.cloneAgentName}" for #${card.catalogAgentNumber}.${primaryLabel}`,
        });
        return;
      }

      setCloneMessage({
        type: "error",
        text: `Activation blocked for #${card.catalogAgentNumber}: ${result.message}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Activation failed.";
      setCloneMessage({
        type: "error",
        text: `Activation failed for #${card.catalogAgentNumber}: ${message}`,
      });
    } finally {
      setCloningCatalogNumber(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <section
        className="border p-3 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div
              className="text-xs font-bold flex items-center gap-1.5"
              style={{ color: "var(--window-document-text)" }}
            >
              <Sparkles size={13} />
              {tx("ui.agents.store.title", "Agent Catalog")}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "ui.agents.store.description",
                "Browse published platform agents, compare capability limits, and activate the right specialist into your operator stack.",
              )}
            </p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border"
            style={{
              borderColor: "var(--window-document-border)",
              color: "var(--window-document-text)",
              background: "var(--window-document-card-bg, var(--window-document-bg))",
            }}
          >
            <ArrowLeft size={12} />
            {tx("ui.agents.shared.back_to_ops", "Agent Ops")}
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.search", "Search")}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tx("ui.agents.store.search_placeholder", "Name, ability, tool, framework")}
              className="mt-1 w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
                color: "var(--window-document-text)",
              }}
            />
          </label>

          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.category", "Category")}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              className="mt-1 w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
                color: "var(--window-document-text)",
              }}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.tier", "Tier")}
            <select
              value={tier}
              onChange={(event) => setTier(event.target.value)}
              className="mt-1 w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
                color: "var(--window-document-text)",
              }}
            >
              <option value="all">{tx("ui.agents.store.all_tiers", "All tiers")}</option>
              {availableTiers.map((optionTier) => (
                <option key={optionTier} value={optionTier}>
                  {humanizeToken(optionTier)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.access_mode", "Access mode")}
            <select
              value={accessMode}
              onChange={(event) => setAccessMode(event.target.value as AccessModeFilter)}
              className="mt-1 w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
                color: "var(--window-document-text)",
              }}
            >
              {ACCESS_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.sort", "Sort")}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="mt-1 w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
                color: "var(--window-document-text)",
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
          <input
            type="checkbox"
            checked={onlyReadyNow}
            onChange={(event) => setOnlyReadyNow(event.target.checked)}
          />
          {tx("ui.agents.store.only_ready_now", "Only show cards ready now (no blocked capability limits)")}
        </label>

        {cloneMessage && (
          <div
            className="border rounded px-2 py-1 text-xs"
            style={{
              borderColor: cloneMessage.type === "success" ? "var(--tone-success)" : "var(--tone-warning)",
              color: cloneMessage.type === "success" ? "var(--tone-success)" : "var(--tone-warning)",
              background:
                cloneMessage.type === "success"
                  ? "color-mix(in srgb, var(--tone-success) 10%, transparent)"
                  : "color-mix(in srgb, var(--tone-warning) 10%, transparent)",
            }}
          >
            {cloneMessage.text}
          </div>
        )}
      </section>

      <section
        className="border p-3 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.catalog_cards", "Catalog agents")}
          </div>
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("ui.agents.store.compare_selected", "Compare {count} selected", {
              count: compareNumbers.length,
            })}
          </div>
        </div>

        {!listResult && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("ui.agents.store.loading_catalog_cards", "Loading catalog cards...")}
          </div>
        )}

        {listResult && cards.length === 0 && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("ui.agents.store.no_cards_matched", "No cards matched the selected filters.")}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {cards.map((card) => {
            const blockedIntegrationCount = card.integrationTags.filter(
              (tag) => tag.status === "blocked"
            ).length;
            return (
              <article
                key={card.cardId}
                className="border p-3 space-y-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-card-bg, var(--window-document-bg))",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {card.displayName}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      #{card.catalogAgentNumber} · {humanizeToken(card.verticalCategory)} · {humanizeToken(card.tier)}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--window-document-text)" }}>
                    <input
                      type="checkbox"
                      aria-label={tx("ui.agents.store.compare_card_aria", "Compare {name}", {
                        name: card.displayName,
                      })}
                      checked={compareNumbers.includes(card.catalogAgentNumber)}
                      onChange={() => toggleCompare(card.catalogAgentNumber)}
                    />
                    {tx("ui.agents.store.compare", "Compare")}
                  </label>
                </div>

                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.agents.store.capability_limits", "Capability limits:")}{" "}
                  <span style={{ color: "var(--tone-success)" }}>
                    {tx("ui.agents.store.available_now_count", "{count} available now", {
                      count: card.capabilitySnapshotPreview.availableNowCount,
                    })}
                  </span>{" "}
                  ·{" "}
                  <span style={{ color: "var(--tone-warning)" }}>
                    {tx("ui.agents.store.blocked_count", "{count} blocked", {
                      count: card.capabilitySnapshotPreview.blockedCount,
                    })}
                  </span>
                </div>

                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.agents.store.runtime", "Runtime:")}{" "}
                  {card.runtimeAvailability === "available_now" ? (
                    <span style={{ color: "var(--tone-success)" }}>
                      {tx("ui.agents.store.available_now", "available now")}
                    </span>
                  ) : (
                    <span style={{ color: "var(--tone-warning)" }}>
                      {tx("ui.agents.store.planned", "planned")}
                    </span>
                  )}{" "}
                  {tx("ui.agents.store.template", "· Template:")}{" "}
                  {card.templateAvailability.hasTemplate ? (
                    <span style={{ color: "var(--tone-success)" }}>
                      {tx("ui.agents.store.ready", "ready")}
                    </span>
                  ) : (
                    <span style={{ color: "var(--tone-warning)" }}>
                      {tx("ui.agents.store.missing", "missing")}
                    </span>
                  )}
                </div>

                <TagRow
                  label={tx("ui.agents.store.abilities", "Abilities")}
                  noneLabel={tx("ui.agents.store.none", "none")}
                  tags={card.abilityTags}
                  status="available"
                />
                <TagRow
                  label={tx("ui.agents.store.frameworks", "Frameworks")}
                  noneLabel={tx("ui.agents.store.none", "none")}
                  tags={card.frameworkTags}
                  status="available"
                />
                <TagRow
                  label={tx("ui.agents.store.tools", "Tools")}
                  noneLabel={tx("ui.agents.store.none", "none")}
                  tags={card.toolTags.map((tag) =>
                    `${tag.key} (${tag.status === "available_now"
                      ? tx("ui.agents.store.available_now", "available now")
                      : tx("ui.agents.store.planned", "planned")})`
                  )}
                  status="planned"
                />

                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.agents.store.integrations_blocked", "Integrations blocked:")} {blockedIntegrationCount}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleCloneNow(card)}
                    className="border px-2 py-1 text-xs font-medium"
                    style={{
                      borderColor: "var(--window-document-border)",
                      color: "var(--window-document-text)",
                      background: "var(--window-document-card-bg, var(--window-document-bg))",
                      opacity:
                        card.templateAvailability.hasTemplate && cloningCatalogNumber !== card.catalogAgentNumber
                          ? 1
                          : 0.7,
                    }}
                    disabled={
                      !card.templateAvailability.hasTemplate ||
                      cloningCatalogNumber === card.catalogAgentNumber
                    }
                    title={
                      card.templateAvailability.hasTemplate
                        ? tx("ui.agents.store.clone_now_title", "Activate now using protected template lifecycle")
                        : tx("ui.agents.store.clone_blocked_title", "Template binding missing for this published agent")
                    }
                  >
                    {cloningCatalogNumber === card.catalogAgentNumber
                      ? tx("ui.agents.store.activating", "Activating...")
                      : tx("ui.agents.store.activate_now", "Activate")}
                  </button>
                  <button
                    onClick={() => onOpenAssistant(card)}
                    className="border px-2 py-1 text-xs font-medium"
                    style={{
                      borderColor: "var(--window-document-border)",
                      color: "var(--window-document-text)",
                      background: "var(--window-document-card-bg, var(--window-document-bg))",
                    }}
                    title={tx(
                      "ui.agents.store.ask_ai_title",
                      "Ask AI about this agent before activation",
                    )}
                  >
                    {tx("ui.agents.store.ask_ai", "Ask AI")}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCatalogNumber(card.catalogAgentNumber);
                      setDetailTab("capability");
                    }}
                    className="border px-2 py-1 text-xs font-medium"
                    style={{
                      borderColor: "var(--window-document-border)",
                      color: "var(--window-document-text)",
                      background: "var(--window-document-card-bg, var(--window-document-bg))",
                    }}
                  >
                    {tx("ui.agents.store.view_capability_limits", "View capability limits")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {compareNumbers.length >= 2 && (
        <section
          className="border p-3 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-surface, var(--desktop-shell-accent))",
          }}
        >
          <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            {tx("ui.agents.store.card_comparison", "Card comparison")}
          </div>
          {!compareResult && (
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx("ui.agents.store.loading_comparison", "Loading comparison...")}
            </div>
          )}
          {compareResult && (
            <div className="space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
              <div>
                <span style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.agents.store.shared_abilities", "Shared abilities:")}
                </span>{" "}
                {compareResult.comparison.sharedAbilityTags.length > 0
                  ? compareResult.comparison.sharedAbilityTags.map(humanizeToken).join(", ")
                  : tx("ui.agents.store.none", "None")}
              </div>
              <div>
                <span style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.agents.store.shared_tools", "Shared tools:")}
                </span>{" "}
                {compareResult.comparison.sharedToolTags.length > 0
                  ? compareResult.comparison.sharedToolTags.map(humanizeToken).join(", ")
                  : tx("ui.agents.store.none", "None")}
              </div>
              <div>
                <span style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.agents.store.shared_frameworks", "Shared frameworks:")}
                </span>{" "}
                {compareResult.comparison.sharedFrameworkTags.length > 0
                  ? compareResult.comparison.sharedFrameworkTags.map(humanizeToken).join(", ")
                  : tx("ui.agents.store.none", "None")}
              </div>
              <div className="space-y-1">
                <div style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.agents.store.missing_integrations_by_card", "Missing integrations by card:")}
                </div>
                {compareResult.comparison.missingIntegrationsByCard.map((entry) => {
                  const card = compareResult.cards.find(
                    (candidate) => candidate.catalogAgentNumber === entry.catalogAgentNumber
                  );
                  return (
                    <div key={entry.catalogAgentNumber}>
                      #{entry.catalogAgentNumber} {card?.displayName || ""}:{" "}
                      {entry.missingIntegrations.length > 0
                        ? entry.missingIntegrations.map(humanizeToken).join(", ")
                        : tx("ui.agents.store.none", "None")}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {selectedCatalogNumber !== null && (
        <section
          className="border p-3 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-surface, var(--desktop-shell-accent))",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.agents.store.catalog_detail", "Catalog detail")}
            </div>
            {preflightResult ? (
              <span
                className="inline-flex items-center gap-1 text-xs"
                style={{
                  color: preflightResult.allowClone ? "var(--tone-success)" : "var(--tone-warning)",
                }}
              >
                {preflightResult.allowClone ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {preflightResult.allowClone
                  ? tx("ui.agents.store.ready_for_clone_handoff", "Ready for clone handoff")
                  : tx("ui.agents.store.blocked_until_gaps_close", "Blocked until gaps close")}
              </span>
            ) : (
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("ui.agents.store.loading_preflight", "Loading preflight...")}
              </span>
            )}
          </div>

          {!detailProductContext ? (
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx("ui.agents.store.loading_catalog_details", "Loading catalog details...")}
            </div>
          ) : (
            <>
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                #{detailProductContext.card.catalogAgentNumber} · {detailProductContext.card.displayName}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DETAIL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className="px-2 py-1 text-[11px] border rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background:
                        detailTab === tab.id
                          ? "var(--window-document-card-bg, var(--window-document-bg))"
                          : "transparent",
                      color:
                        detailTab === tab.id
                          ? "var(--window-document-text)"
                          : "var(--neutral-gray)",
                    }}
                    onClick={() => setDetailTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {detailTab === "summary" && (
                <div className="grid gap-2 md:grid-cols-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                  <div>Category: {humanizeToken(detailProductContext.productPage.entry.category)}</div>
                  <div>Tier: {humanizeToken(detailProductContext.productPage.entry.tier)}</div>
                  <div>Subtype: {humanizeToken(detailProductContext.productPage.entry.subtype)}</div>
                  <div>Tool profile: {humanizeToken(detailProductContext.productPage.entry.toolProfile)}</div>
                  <div>Published: {detailProductContext.productPage.entry.published ? "yes" : "no"}</div>
                  <div>Template ready: {detailProductContext.productPage.template.hasTemplate ? "yes" : "no"}</div>
                </div>
              )}

              {detailTab === "tools" && (
                <div className="space-y-2">
                  {detailProductContext.productPage.tools.length === 0 ? (
                    <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx("ui.agents.store.none", "None")}
                    </div>
                  ) : (
                    detailProductContext.productPage.tools.map((tool) => (
                      <div
                        key={`${tool.toolName}:${tool.requirementLevel}`}
                        className="border rounded p-2 text-xs"
                        style={{ borderColor: "var(--window-document-border)" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ color: "var(--window-document-text)" }}>
                            {humanizeToken(tool.toolName)}
                          </span>
                          <span style={{ color: "var(--neutral-gray)" }}>
                            {tool.requirementLevel} · {tool.implementationStatus}
                          </span>
                        </div>
                        <div style={{ color: "var(--neutral-gray)" }}>
                          {tool.source}
                          {tool.integrationDependency
                            ? ` · ${humanizeToken(tool.integrationDependency)}`
                            : ""}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === "runtime" && (
                <div className="grid gap-2 md:grid-cols-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                  <div>Runtime status: {humanizeToken(detailProductContext.productPage.entry.runtimeStatus)}</div>
                  <div>Runtime availability: {humanizeToken(detailProductContext.card.runtimeAvailability)}</div>
                  <div>Autonomy default: {humanizeToken(detailProductContext.productPage.entry.autonomyDefault)}</div>
                  <div>
                    Supported access modes:{" "}
                    {detailProductContext.productPage.requirements.supportedAccessModes.length > 0
                      ? detailProductContext.productPage.requirements.supportedAccessModes.map(humanizeToken).join(", ")
                      : tx("ui.agents.store.none", "None")}
                  </div>
                  <div className="md:col-span-2">
                    Channel affinity:{" "}
                    {detailProductContext.productPage.requirements.channelAffinity.length > 0
                      ? detailProductContext.productPage.requirements.channelAffinity.map(humanizeToken).join(", ")
                      : tx("ui.agents.store.none", "None")}
                  </div>
                </div>
              )}

              {detailTab === "dependencies" && (
                <div className="space-y-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                  <div>
                    Required integrations:{" "}
                    {detailProductContext.productPage.requirements.requiredIntegrations.length > 0
                      ? detailProductContext.productPage.requirements.requiredIntegrations.map(humanizeToken).join(", ")
                      : tx("ui.agents.store.none", "None")}
                  </div>
                  <div>
                    Required tools:{" "}
                    {detailProductContext.productPage.requirements.requiredTools.length > 0
                      ? detailProductContext.productPage.requirements.requiredTools.map(humanizeToken).join(", ")
                      : tx("ui.agents.store.none", "None")}
                  </div>
                  <div>
                    Required capabilities:{" "}
                    {detailProductContext.productPage.requirements.requiredCapabilities.length > 0
                      ? detailProductContext.productPage.requirements.requiredCapabilities.map(humanizeToken).join(", ")
                      : tx("ui.agents.store.none", "None")}
                  </div>
                </div>
              )}

              {detailTab === "capability" && detailCapabilitySnapshot && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div
                    className="border p-2"
                    style={{
                      borderColor: "var(--tone-success)",
                      background: "color-mix(in srgb, var(--tone-success) 8%, transparent)",
                    }}
                  >
                    <div className="text-xs font-medium" style={{ color: "var(--tone-success)" }}>
                      {tx("ui.agents.store.available_now_with_count", "Available now ({count})", {
                        count: detailCapabilitySnapshot.availableNow.length,
                      })}
                    </div>
                    {detailCapabilitySnapshot.availableNow.length === 0 ? (
                      <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx("ui.agents.store.no_capabilities_available", "No capabilities currently available.")}
                      </div>
                    ) : (
                      <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {detailCapabilitySnapshot.availableNow.map((capability) => (
                          <li key={capability.capabilityId}>{capability.label}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div
                    className="border p-2"
                    style={{
                      borderColor: "var(--tone-warning)",
                      background: "color-mix(in srgb, var(--tone-warning) 8%, transparent)",
                    }}
                  >
                    <div className="text-xs font-medium" style={{ color: "var(--tone-warning)" }}>
                      {tx("ui.agents.store.blocked_with_count", "Blocked ({count})", {
                        count: detailCapabilitySnapshot.blocked.length,
                      })}
                    </div>
                    {detailCapabilitySnapshot.blocked.length === 0 ? (
                      <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {tx("ui.agents.store.no_blocked_capabilities", "No blocked capabilities.")}
                      </div>
                    ) : (
                      <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {detailCapabilitySnapshot.blocked.map((capability) => (
                          <li key={capability.capabilityId}>
                            {capability.label} · {humanizeBlockerType(capability.blockerType)}
                            {capability.blockerKey ? ` (${humanizeToken(capability.blockerKey)})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section
        className="border p-3 space-y-2"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
          {tx("ui.agents.store.cant_find_mix", "Can't find the right mix?")}
        </div>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "ui.agents.store.concierge_purchase_only",
            "Custom-agent concierge is purchase-only. No free-form self-build path is available in operator flows.",
          )}
        </p>
        <div className="text-xs" style={{ color: "var(--window-document-text)" }}>
          {tx(
            "ui.agents.store.terms",
            "Terms: {minimum}, {deposit}, {onboarding}.",
            {
              minimum: noFitEscalation.minimum,
              deposit: noFitEscalation.deposit,
              onboarding: noFitEscalation.onboarding,
            },
          )}
        </div>
        <button
          onClick={onRequestCustomOrder}
          className="border px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: "var(--window-document-border)",
            color: "var(--window-document-text)",
            background: "var(--window-document-card-bg, var(--window-document-bg))",
          }}
        >
          {tx("ui.agents.store.request_concierge", "Request custom-agent concierge")}
        </button>
      </section>
    </div>
  );
}

function TagRow({
  label,
  noneLabel,
  tags,
  status,
}: {
  label: string;
  noneLabel: string;
  tags: string[];
  status: "available" | "planned" | "blocked";
}) {
  if (tags.length === 0) {
    return (
      <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
        {label}: {noneLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={`${label}:${tag}`}
            className="rounded border px-1.5 py-0.5 text-xs"
            style={chipStyles(status)}
          >
            {humanizeToken(tag)}
          </span>
        ))}
      </div>
    </div>
  );
}
