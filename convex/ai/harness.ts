/**
 * AGENT HARNESS — Self-Awareness Context Builder
 *
 * Makes the agent deeply aware of its own runtime context:
 * - What model it runs
 * - What tools it has access to
 * - What channels it's connected to
 * - Its current session stats
 * - Its own soul/personality
 *
 * Inspired by OpenClaw's Agent Harness concept (Lex Fridman x Peter Steinberger).
 */

interface AgentConfig {
  displayName?: string;
  modelProvider?: string;
  modelId?: string;
  autonomyLevel: "supervised" | "autonomous" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  knowledgeBaseTags?: string[];
  faqEntries?: Array<{ q: string; a: string }>;
  soul?: {
    name: string;
    tagline?: string;
    traits: string[];
  };
  subtype?: string;
}

// ============================================================================
// LAYER ARCHITECTURE (4-Layer Hierarchy)
// ============================================================================

export const LAYER_NAMES: Record<number, string> = {
  1: "Platform",
  2: "Agency",
  3: "Client",
  4: "End-Customer",
};

interface OrgForLayer {
  _id: string;
  parentOrganizationId?: string;
}

/**
 * Determine which layer (1-4) an agent operates at based on
 * org hierarchy position and agent subtype.
 */
export function determineAgentLayer(
  org: OrgForLayer,
  agentSubtype?: string,
  isPlatformOrg?: boolean,
): 1 | 2 | 3 | 4 {
  // Layer 1: Platform org's system agent
  if (isPlatformOrg && agentSubtype === "system") return 1;

  // Layer 2: Top-level org (no parent) — agency PM
  if (!org.parentOrganizationId && agentSubtype === "pm") return 2;

  // Layer 4: Sub-org's customer-facing agent
  if (org.parentOrganizationId && agentSubtype === "customer_service") return 4;

  // Layer 3: Sub-org's PM agent
  if (org.parentOrganizationId && agentSubtype === "pm") return 3;

  // Default: Layer 2 for top-level, Layer 3 for sub-org
  return org.parentOrganizationId ? 3 : 2;
}

interface SessionStats {
  messageCount: number;
  channel: string;
  startedAt?: number;
  lastMessageAt?: number;
  hasCrmContact: boolean;
}

interface TeamAgent {
  _id: string;
  name: string;
  subtype?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customProperties?: Record<string, any>;
}

interface LayerInfo {
  layer: 1 | 2 | 3 | 4;
  parentOrgName?: string;
  parentOrgPlanTier?: string;
  testingMode?: boolean;
}

/**
 * Build the harness self-awareness block for the system prompt.
 * This goes at the very top — the agent's first context is knowing itself.
 */
export function buildHarnessContext(
  config: AgentConfig,
  filteredToolNames?: string[],
  sessionStats?: SessionStats,
  teamAgents?: TeamAgent[],
  currentAgentId?: string,
  orgInfo?: { name: string; slug: string; planTier: string },
  layerInfo?: LayerInfo,
): string {
  const lines: string[] = [];
  lines.push("=== YOUR HARNESS (Self-Awareness) ===");

  // Organization context
  if (orgInfo) {
    lines.push(`**Organization:** ${orgInfo.name}`);
    lines.push(`**Plan:** ${orgInfo.planTier}`);
  }

  // Identity
  const name = config.soul?.name || config.displayName || "AI Agent";
  lines.push(`**Identity:** ${name}`);

  // Model
  const model = config.modelId || "anthropic/claude-sonnet-4.5";
  const provider = config.modelProvider || "openrouter";
  lines.push(`**Model:** ${model} (via ${provider})`);

  // Autonomy
  const autonomyLabels: Record<string, string> = {
    supervised: "Supervised — all tool actions require human approval",
    autonomous: "Autonomous — you can act freely within guardrails",
    draft_only: "Draft Only — generate responses but do NOT execute tools",
  };
  lines.push(`**Autonomy:** ${autonomyLabels[config.autonomyLevel] || config.autonomyLevel}`);

  // Channels
  const activeChannels = config.channelBindings
    ?.filter((c) => c.enabled)
    .map((c) => c.channel) || [];
  if (activeChannels.length > 0) {
    lines.push(`**Connected channels:** ${activeChannels.join(", ")}`);
  }

  // Tools
  if (filteredToolNames && filteredToolNames.length > 0) {
    lines.push(`\n**Available tools (${filteredToolNames.length}):**`);
    for (const toolName of filteredToolNames) {
      lines.push(`- ${toolName}`);
    }
  } else {
    lines.push("\n**Tools:** None available");
  }

  // Rate limits
  const maxMsg = config.maxMessagesPerDay || 100;
  const maxCost = config.maxCostPerDay || 5.0;
  lines.push(`\n**Rate limits:** ${maxMsg} messages/day, $${maxCost.toFixed(2)} max cost/day`);

  // Knowledge
  const kbTags = config.knowledgeBaseTags?.length || 0;
  const faqCount = config.faqEntries?.length || 0;
  if (kbTags > 0 || faqCount > 0) {
    const kbParts = [];
    if (kbTags > 0) kbParts.push(`${kbTags} knowledge base tag(s)`);
    if (faqCount > 0) kbParts.push(`${faqCount} FAQ entries`);
    lines.push(`**Knowledge loaded:** ${kbParts.join(", ")}`);
  }

  // Session stats
  if (sessionStats) {
    lines.push("\n**Current session:**");
    lines.push(`- Channel: ${sessionStats.channel}`);
    lines.push(`- Messages in conversation: ${sessionStats.messageCount}`);
    if (sessionStats.startedAt) {
      lines.push(`- Session started: ${new Date(sessionStats.startedAt).toISOString()}`);
    }
    if (sessionStats.lastMessageAt) {
      const minutesAgo = Math.round((Date.now() - sessionStats.lastMessageAt) / 60000);
      lines.push(`- Last message: ${minutesAgo < 1 ? "just now" : `${minutesAgo}min ago`}`);
    }
    lines.push(`- CRM contact linked: ${sessionStats.hasCrmContact ? "Yes" : "No"}`);
  }

  // Team roster (multi-agent coordination)
  if (teamAgents && teamAgents.length > 1) {
    lines.push("");
    lines.push("=== YOUR TEAM ===");
    lines.push("You are the lead agent (PM) for this organization.");
    lines.push("You coordinate the team. Handle general questions yourself.");
    lines.push("Tag in a specialist when their expertise is needed.");
    lines.push("");
    lines.push("Team members:");

    for (const agent of teamAgents) {
      if (currentAgentId && agent._id === currentAgentId) continue; // Skip self
      const props = agent.customProperties;
      const agentName = props?.displayName || agent.name;
      const soul = props?.soul;
      const tagline = soul?.tagline || agent.subtype || "general";
      const traits = soul?.traits?.slice(0, 3)?.join(", ") || "";

      lines.push(`- **${agentName}** (${agent.subtype || "general"}): ${tagline}`);
      if (traits) lines.push(`  Traits: ${traits}`);
    }

    lines.push("");
    lines.push("Use the `tag_in_specialist` tool to bring in a team member.");
    lines.push("Use `list_team_agents` to see the current team roster.");
    lines.push("=== END TEAM ===");
  }

  // Soul evolution awareness (Step 7)
  if (config.soul && (config.soul as { version?: number }).version) {
    const soulVersion = (config.soul as { version?: number; lastUpdatedAt?: number }).version;
    const lastUpdated = (config.soul as { lastUpdatedAt?: number }).lastUpdatedAt;
    lines.push(`\n**Soul version:** v${soulVersion}${lastUpdated ? ` (last updated: ${new Date(lastUpdated).toISOString()})` : ""}`);
    lines.push("**Self-evolution:** You can propose updates to your own personality using `propose_soul_update`.");
    lines.push("  - Use this when you notice recurring patterns that your current rules don't address.");
    lines.push("  - All proposals require owner approval — you never change yourself silently.");
    lines.push("  - Use `review_own_soul` to check your current personality before proposing changes.");
  }

  // Media tools awareness (Step 9)
  const mediaToolNames = ["transcribe_audio", "analyze_image", "parse_document", "download_media"];
  const availableMediaTools = filteredToolNames?.filter(t => mediaToolNames.includes(t)) || [];
  if (availableMediaTools.length > 0) {
    lines.push("\n**Media handling:**");
    lines.push("You can process rich media (voice notes, images, documents) using your media tools.");
    lines.push("When a message includes attachments:");
    lines.push("  1. Check what type of media it is (the attachment metadata tells you)");
    lines.push("  2. Choose the right tool (transcribe_audio for voice, analyze_image for photos, etc.)");
    lines.push("  3. Process the media, then respond using the extracted content");
    lines.push("  4. If you're unsure about a file, use download_media to inspect it first");
    lines.push("Don't tell the user you can't handle media — try your tools first.");
  }

  // Builder deployment awareness
  const builderToolNames = ["create_webapp", "deploy_webapp", "check_deploy_status"];
  const availableBuilderTools = filteredToolNames?.filter(t => builderToolNames.includes(t)) || [];
  if (availableBuilderTools.length > 0) {
    lines.push("\n**Web App Builder:**");
    lines.push("You can create and deploy full web applications for users.");
    lines.push("When a user asks for a website, landing page, or web app:");
    lines.push("  1. Generate a page schema JSON with sections (hero, features, pricing, testimonials, etc.)");
    lines.push("     - Schema format: { version: \"1.0\", metadata: { title, description }, theme: { primaryColor, ... }, sections: [{ id, type, props }] }");
    lines.push("     - Section types: hero, features, cta, testimonials, pricing, gallery, team, faq, process");
    lines.push("  2. Call `create_webapp` with the name and pageSchema to create a builder app");
    lines.push("  3. Call `deploy_webapp` with the returned appId to push to GitHub and get a Vercel deploy link");
    lines.push("  4. Share the GitHub URL and Vercel deploy link with the user");
    lines.push("");
    lines.push("You can also use `check_deploy_status` to verify GitHub is connected before deploying.");
    lines.push("If GitHub is not connected, tell the user to connect it in Settings > Integrations.");
  }

  // Builder data connection awareness
  const connectionToolNames = ["detect_webapp_connections", "connect_webapp_data"];
  const availableConnectionTools = filteredToolNames?.filter(t => connectionToolNames.includes(t)) || [];
  if (availableConnectionTools.length > 0) {
    lines.push("\n**Data Connection Workflow:**");
    lines.push("After creating a web app with `create_webapp`, you can connect its placeholder data to real org records.");
    lines.push("  1. Call `detect_webapp_connections` with the appId to scan for connectable items");
    lines.push("  2. Review the results: products (from pricing), contacts (from team), events (from dates), forms, etc.");
    lines.push("  3. For each detected item, decide:");
    lines.push("     - **Link**: Connect to an existing record (use the record ID from existingMatches)");
    lines.push("     - **Create**: Create a new record from the placeholder data");
    lines.push("     - **Skip**: Leave as placeholder, don't connect");
    lines.push("  4. For exact matches (similarity 1.0), auto-link and inform the user");
    lines.push("  5. For lower confidence matches or no matches, ask the user what to do");
    lines.push("  6. Call `connect_webapp_data` with all decisions in one batch");
    lines.push("  7. Then call `deploy_webapp` to deploy with connected data");
    lines.push("");
    lines.push("Example flow:");
    lines.push("  You: 'I found 3 pricing tiers in your page. \"Basic Plan\" matches your existing product — I'll link that.'");
    lines.push("  You: 'Should I create new records for \"Pro Plan\" and \"Enterprise Plan\"?'");
    lines.push("  User: 'Yes, create them'");
    lines.push("  → Call connect_webapp_data with link for 1 item, create for 2 items");
  }

  // Layer awareness (4-Layer Architecture)
  if (layerInfo) {
    const layer = layerInfo.layer;
    lines.push("");
    lines.push("## Your Position in the Organization Hierarchy");
    lines.push("");
    lines.push(`**Layer:** ${layer} of 4`);
    lines.push(`**Layer name:** ${LAYER_NAMES[layer]}`);

    if (layer >= 3 && layerInfo.parentOrgName) {
      lines.push(`**Parent agency:** ${layerInfo.parentOrgName}${layerInfo.parentOrgPlanTier ? ` (${layerInfo.parentOrgPlanTier} tier)` : ""}`);
    }

    if (layer === 2) {
      lines.push(`**Role:** You manage client sub-organizations and their agents.`);
      lines.push(`**You can:** Create sub-orgs, deploy bots, monitor client performance.`);
      lines.push(`**You cannot:** Directly modify client agent souls or execute tools on behalf of client agents.`);
    }

    if (layer === 3) {
      const orgName = orgInfo?.name || "this organization";
      lines.push(`**Role:** You manage operations for "${orgName}" under the ${layerInfo.parentOrgName || "parent"} agency.`);
      lines.push(`**You can:** Manage contacts, products, events, and team within your org.`);
      lines.push(`**You cannot:** Access parent agency data, create sub-orgs, or modify agency-level settings.`);
      lines.push(`**Escalation:** Use escalate_to_parent to send issues to your agency PM.`);
    }

    if (layer === 4) {
      const orgName = orgInfo?.name || "this organization";
      lines.push(`**Role:** You handle customer conversations for "${orgName}".`);
      lines.push(`**You can:** Answer questions, search products, create bookings, log interactions.`);
      lines.push(`**You cannot:** Modify org settings, access analytics, manage team, or propose soul changes.`);
      lines.push(`**Escalation:** Use escalate_to_parent to send complex issues to the PM.`);
    }

    if (layerInfo.testingMode) {
      lines.push("");
      lines.push("⚠️ TESTING MODE: This conversation is from the agency owner testing your capabilities.");
      lines.push("Behave exactly as you would with a real customer, but acknowledge this is a test if asked.");
    }
  }

  // Agency model awareness (Step 11: Sub-Org Management)
  const agencyToolNames = ["create_client_org", "list_client_orgs", "get_client_org_stats"];
  const availableAgencyTools = filteredToolNames?.filter(t => agencyToolNames.includes(t)) || [];
  if (availableAgencyTools.length > 0) {
    lines.push("\n**Agency Model:**");
    lines.push("You are the PM for an agency. You can create client sub-organizations.");
    lines.push("- Use `create_client_org` to set up a new client");
    lines.push("- Use `list_client_orgs` to see all your clients");
    lines.push("- Use `get_client_org_stats` to check a client's performance");
    lines.push("- When the owner says they want to build an agent for a client, guide them through:");
    lines.push("  1. Business name and industry");
    lines.push("  2. Target audience (who are their customers?)");
    lines.push("  3. What the agent should do");
    lines.push("  4. Language and tone preferences");
    lines.push("  5. Then call create_client_org with all the details");
  }

  // Self-awareness instructions
  lines.push("\n**Self-awareness rules:**");
  lines.push("- You know exactly which tools you have. Don't claim capabilities you lack.");
  lines.push("- If a tool fails, explain what happened and suggest alternatives.");
  lines.push("- If asked \"what can you do?\", reference your actual tool list above.");
  lines.push("- Be consistent with your soul and personality at all times.");

  lines.push("=== END HARNESS ===\n");
  return lines.join("\n");
}
