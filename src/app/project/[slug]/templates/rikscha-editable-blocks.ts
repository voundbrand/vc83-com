/**
 * RIKSCHA TEMPLATE - EDITABLE BLOCKS MANIFEST
 *
 * Defines which content blocks are editable on the Rikscha project page.
 * These blocks can be edited inline by authenticated users.
 *
 * Block ID Convention: {section}.{subsection?}.{field}
 *
 * Content is stored in the ontology (objects table) with:
 * - type="project_content", subtype="block"
 * - name="{projectId}.{blockId}" (e.g., "rikscha.hero.title")
 */

export type EditableBlockType = "text" | "multiline";

export interface EditableBlock {
  /** Block identifier - used as key in content storage */
  id: string;
  /** Human-readable label for admin UI */
  label: string;
  /** Input type: single line or multiline */
  type: EditableBlockType;
  /** Maximum character length */
  maxLength: number;
  /** Section for edit locking (groups related fields) */
  section: string;
  /** Description for admin UI */
  description?: string;
}

/**
 * All editable blocks for the Rikscha template
 */
export const RIKSCHA_EDITABLE_BLOCKS: EditableBlock[] = [
  // ============================================
  // HERO SECTION
  // ============================================
  {
    id: "hero.badge",
    label: "Hero Badge",
    type: "text",
    maxLength: 80,
    section: "hero",
    description: "Badge text above the main title",
  },
  {
    id: "hero.title",
    label: "Hero Title",
    type: "text",
    maxLength: 150,
    section: "hero",
    description: "Main headline at the top of the page",
  },
  {
    id: "hero.subtitle",
    label: "Hero Subtitle",
    type: "multiline",
    maxLength: 300,
    section: "hero",
    description: "Subtitle description below the title",
  },

  // ============================================
  // EXECUTIVE SUMMARY SECTION
  // ============================================
  {
    id: "summary.title",
    label: "Summary Section Title",
    type: "text",
    maxLength: 100,
    section: "summary",
    description: "Title for the executive summary section",
  },
  {
    id: "summary.subtitle",
    label: "Summary Subtitle",
    type: "multiline",
    maxLength: 200,
    section: "summary",
    description: "Subtitle for the executive summary",
  },
  {
    id: "summary.oneliner.passengers",
    label: "One-Liner for Passengers",
    type: "multiline",
    maxLength: 400,
    section: "summary",
    description: "Core message for passengers (Fahrgäste)",
  },
  {
    id: "summary.oneliner.pilots",
    label: "One-Liner for Pilots",
    type: "multiline",
    maxLength: 400,
    section: "summary",
    description: "Core message for pilots (Piloten)",
  },

  // ============================================
  // STORYBRAND - FAHRGÄSTE SECTION
  // ============================================
  {
    id: "fahrgaeste.title",
    label: "Fahrgäste Section Title",
    type: "text",
    maxLength: 100,
    section: "fahrgaeste",
    description: "Title for the passengers StoryBrand section",
  },
  {
    id: "fahrgaeste.subtitle",
    label: "Fahrgäste Subtitle",
    type: "multiline",
    maxLength: 300,
    section: "fahrgaeste",
    description: "Subtitle describing the target audience",
  },
  {
    id: "fahrgaeste.hero.description",
    label: "Hero (Fahrgäste) Description",
    type: "multiline",
    maxLength: 400,
    section: "fahrgaeste",
    description: "Description of the hero persona",
  },
  {
    id: "fahrgaeste.problem.external",
    label: "External Problem",
    type: "multiline",
    maxLength: 300,
    section: "fahrgaeste",
    description: "The visible/external problem",
  },
  {
    id: "fahrgaeste.problem.internal",
    label: "Internal Problem",
    type: "multiline",
    maxLength: 300,
    section: "fahrgaeste",
    description: "The emotional/internal problem",
  },
  {
    id: "fahrgaeste.problem.philosophical",
    label: "Philosophical Problem",
    type: "multiline",
    maxLength: 300,
    section: "fahrgaeste",
    description: "The deeper philosophical problem",
  },
  {
    id: "fahrgaeste.guide.empathy",
    label: "Guide Empathy Statement",
    type: "multiline",
    maxLength: 200,
    section: "fahrgaeste",
    description: "Empathy statement for the guide",
  },
  {
    id: "fahrgaeste.guide.authority",
    label: "Guide Authority Statement",
    type: "multiline",
    maxLength: 300,
    section: "fahrgaeste",
    description: "Authority credentials for the guide",
  },

  // ============================================
  // STORYBRAND - PILOTEN SECTION
  // ============================================
  {
    id: "piloten.title",
    label: "Piloten Section Title",
    type: "text",
    maxLength: 100,
    section: "piloten",
    description: "Title for the pilots StoryBrand section",
  },
  {
    id: "piloten.subtitle",
    label: "Piloten Subtitle",
    type: "multiline",
    maxLength: 300,
    section: "piloten",
    description: "Subtitle describing the pilot target audience",
  },
  {
    id: "piloten.hero.description",
    label: "Hero (Piloten) Description",
    type: "multiline",
    maxLength: 400,
    section: "piloten",
    description: "Description of the pilot hero persona",
  },
  {
    id: "piloten.problem.external",
    label: "Pilot External Problem",
    type: "multiline",
    maxLength: 300,
    section: "piloten",
    description: "The visible/external problem for pilots",
  },
  {
    id: "piloten.problem.internal",
    label: "Pilot Internal Problem",
    type: "multiline",
    maxLength: 300,
    section: "piloten",
    description: "The emotional/internal problem for pilots",
  },
  {
    id: "piloten.problem.philosophical",
    label: "Pilot Philosophical Problem",
    type: "multiline",
    maxLength: 300,
    section: "piloten",
    description: "The deeper philosophical problem for pilots",
  },
  {
    id: "piloten.guide.empathy",
    label: "Pilot Guide Empathy",
    type: "multiline",
    maxLength: 200,
    section: "piloten",
    description: "Empathy statement for pilots",
  },
  {
    id: "piloten.guide.authority",
    label: "Pilot Guide Authority",
    type: "multiline",
    maxLength: 300,
    section: "piloten",
    description: "Authority credentials for pilots",
  },

  // ============================================
  // CONTACT / CTA SECTION
  // ============================================
  {
    id: "cta.title",
    label: "CTA Title",
    type: "text",
    maxLength: 100,
    section: "cta",
    description: "Final call-to-action headline",
  },
  {
    id: "cta.description",
    label: "CTA Description",
    type: "multiline",
    maxLength: 400,
    section: "cta",
    description: "Closing paragraph with call to action",
  },
];

/**
 * Get editable blocks grouped by section
 */
export function getBlocksBySection(): Record<string, EditableBlock[]> {
  const grouped: Record<string, EditableBlock[]> = {};
  for (const block of RIKSCHA_EDITABLE_BLOCKS) {
    const section = block.section;
    if (!grouped[section]) {
      grouped[section] = [];
    }
    grouped[section].push(block);
  }
  return grouped;
}

/**
 * Get a specific block by ID
 */
export function getBlockById(id: string): EditableBlock | undefined {
  return RIKSCHA_EDITABLE_BLOCKS.find((b) => b.id === id);
}

/**
 * Get all block IDs (for batch operations)
 */
export function getAllBlockIds(): string[] {
  return RIKSCHA_EDITABLE_BLOCKS.map((b) => b.id);
}
