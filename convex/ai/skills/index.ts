/**
 * SKILL REGISTRY
 *
 * Maps composition skills from SKILL.md blueprints to executable tool chains.
 * Skills are metadata — they teach the LLM which tools to call in what order.
 * The LLM reads the skill catalog and calls underlying tools directly.
 *
 * Skills are NOT separate executables. They're a knowledge layer that maps
 * use cases to tool sequences with credit cost awareness.
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: "ontology" | "automation" | "content" | "integration";
  riskLevel: "low" | "sensitive" | "external_send" | "unknown";
  requiresHumanApproval: boolean;
  creditCost: number;
  toolsUsed: string[];
  createsObjects: string[];
  requiredObjects?: string[];
}

/**
 * Registry of all composition skills.
 * Each skill maps to one or more tools in the TOOL_REGISTRY.
 */
export const SKILL_REGISTRY: Record<string, SkillDefinition> = {
  // Ontology Skills (1 credit each)
  create_form: {
    id: "create_form",
    name: "Create Form",
    description: "Create a registration, survey, or application form with fields",
    category: "ontology",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["create_form"],
    createsObjects: ["form"],
  },
  create_product: {
    id: "create_product",
    name: "Create Product",
    description: "Create a ticket, physical, or digital product with pricing",
    category: "ontology",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["create_product"],
    createsObjects: ["product"],
  },
  create_crm_pipeline: {
    id: "create_crm_pipeline",
    name: "Create CRM Pipeline",
    description: "Create a CRM pipeline with stages for tracking contacts",
    category: "ontology",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["manage_crm"],
    createsObjects: ["crm_pipeline"],
  },
  create_crm_contact: {
    id: "create_crm_contact",
    name: "Create CRM Contact",
    description: "Create a new contact in the CRM",
    category: "ontology",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["create_contact"],
    createsObjects: ["crm_contact"],
  },
  create_event: {
    id: "create_event",
    name: "Create Event",
    description: "Create an event with date, location, and details",
    category: "ontology",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["create_event"],
    createsObjects: ["event"],
  },
  create_checkout: {
    id: "create_checkout",
    name: "Create Checkout",
    description: "Create a checkout page wiring products and forms",
    category: "ontology",
    riskLevel: "external_send",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["create_checkout_page"],
    createsObjects: ["checkout"],
  },

  // Automation Skills (2 credits each)
  create_layers_workflow: {
    id: "create_layers_workflow",
    name: "Create Layers Workflow",
    description: "Create a visual automation workflow with nodes, edges, and triggers",
    category: "automation",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 2,
    toolsUsed: ["create_layers_workflow"],
    createsObjects: ["layer_workflow"],
  },
  create_sequence: {
    id: "create_sequence",
    name: "Create Automation Sequence",
    description: "Create a multi-step email/SMS/WhatsApp sequence with timing",
    category: "automation",
    riskLevel: "external_send",
    requiresHumanApproval: true,
    creditCost: 2,
    toolsUsed: ["manage_sequences"],
    createsObjects: ["automation_sequence"],
  },
  link_objects: {
    id: "link_objects",
    name: "Link Objects",
    description: "Create relationships between objects (form->product, workflow->sequence)",
    category: "automation",
    riskLevel: "sensitive",
    requiresHumanApproval: true,
    creditCost: 0,
    toolsUsed: ["link_objects"],
    createsObjects: [],
    requiredObjects: ["any"],
  },
  activate_workflow: {
    id: "activate_workflow",
    name: "Activate Workflow",
    description: "Set a workflow to active/live state",
    category: "automation",
    riskLevel: "external_send",
    requiresHumanApproval: true,
    creditCost: 1,
    toolsUsed: ["enable_workflow"],
    createsObjects: [],
    requiredObjects: ["layer_workflow"],
  },
};

export function getSkillsRequiringHumanApproval(): string[] {
  return Object.values(SKILL_REGISTRY)
    .filter((skill) => skill.requiresHumanApproval)
    .map((skill) => skill.id)
    .sort((left, right) => left.localeCompare(right));
}

function normalizeSkillPolicyToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSkillPolicyTokenArray(values?: string[]): string[] {
  if (!values) {
    return [];
  }
  return Array.from(
    new Set(
      values
        .map((entry) => normalizeSkillPolicyToken(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function isExternalSkillRiskLevel(
  riskLevel: SkillDefinition["riskLevel"],
): boolean {
  return riskLevel === "external_send" || riskLevel === "unknown";
}

export function getExternalSendSkillToolNames(): string[] {
  return Array.from(
    new Set(
      Object.values(SKILL_REGISTRY)
        .filter((skill) => isExternalSkillRiskLevel(skill.riskLevel))
        .flatMap((skill) => skill.toolsUsed)
        .map((toolName) => normalizeSkillPolicyToken(toolName))
        .filter((toolName): toolName is string => Boolean(toolName)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function isExternalSendSkillTool(toolName: string): boolean {
  const normalized = normalizeSkillPolicyToken(toolName);
  if (!normalized) {
    return false;
  }
  return getExternalSendSkillToolNames().includes(normalized);
}

export function resolveKanzleiApprovedExternalToolNames(args?: {
  approvedToolNames?: string[];
  approvedSkillIds?: string[];
}): string[] {
  const approvedToolNames = new Set(
    normalizeSkillPolicyTokenArray(args?.approvedToolNames),
  );
  const approvedSkillIds = new Set(
    normalizeSkillPolicyTokenArray(args?.approvedSkillIds),
  );
  if (approvedSkillIds.size === 0) {
    return Array.from(approvedToolNames).sort((left, right) =>
      left.localeCompare(right),
    );
  }
  for (const [registryKey, skill] of Object.entries(SKILL_REGISTRY)) {
    const registryKeyToken = normalizeSkillPolicyToken(registryKey);
    const skillIdToken = normalizeSkillPolicyToken(skill.id);
    const matched =
      (registryKeyToken && approvedSkillIds.has(registryKeyToken))
      || (skillIdToken && approvedSkillIds.has(skillIdToken));
    if (!matched || !isExternalSkillRiskLevel(skill.riskLevel)) {
      continue;
    }
    for (const toolName of skill.toolsUsed) {
      const normalized = normalizeSkillPolicyToken(toolName);
      if (normalized) {
        approvedToolNames.add(normalized);
      }
    }
  }
  return Array.from(approvedToolNames).sort((left, right) =>
    left.localeCompare(right),
  );
}

/**
 * Generate a formatted skill catalog for injection into the LLM system prompt.
 * Teaches the AI which skills exist, what they cost, and how to chain them.
 */
export function getSkillCatalog(): string {
  const ontologySkills = Object.values(SKILL_REGISTRY).filter(s => s.category === "ontology");
  const automationSkills = Object.values(SKILL_REGISTRY).filter(s => s.category === "automation");

  const formatSkill = (s: SkillDefinition) =>
    `- **${s.name}** (${s.creditCost} credit${s.creditCost !== 1 ? "s" : ""}) — ${s.description}. Tool: \`${s.toolsUsed.join(", ")}\`. Creates: ${s.createsObjects.length > 0 ? s.createsObjects.join(", ") : "n/a"}. Risk: ${s.riskLevel}. Human approval: ${s.requiresHumanApproval ? "required" : "not required"}`;

  return `## Skill Catalog

### How to Use Skills
Skills are compositions of tools. To execute a skill, call the tool(s) listed below.
Always create objects first, then link them together. Follow dependency order:
1. Create objects (forms, products, events, contacts)
2. Create automations (workflows, sequences)
3. Link everything together (link_objects — FREE)
4. Activate (enable_workflow)

### Ontology Skills (Create Objects)
${ontologySkills.map(formatSkill).join("\n")}

### Automation Skills (Wire Automations)
${automationSkills.map(formatSkill).join("\n")}

### Composition Patterns
**Lead Gen Funnel** (~6 credits): create_form → create_crm_pipeline → create_layers_workflow → create_sequence → link_objects
**Event Setup** (~7 credits): create_event → create_form → create_product → create_layers_workflow → create_sequence → link_objects
**Booking System** (~5 credits): create_form → create_layers_workflow → create_sequence → link_objects
**E-commerce** (~6 credits): create_product → create_checkout → create_form → create_layers_workflow → link_objects`;
}
