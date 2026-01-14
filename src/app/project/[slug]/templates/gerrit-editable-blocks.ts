/**
 * GERRIT TEMPLATE - EDITABLE BLOCKS MANIFEST
 *
 * Defines which content blocks are editable on the Gerrit project page.
 * These blocks can be edited inline by authenticated users.
 *
 * Block ID Convention: {section}.{subsection?}.{field}
 *
 * Content is stored in the ontology (objects table) with:
 * - type="project_content", subtype="block"
 * - name="{projectId}.{blockId}" (e.g., "gerrit.hero.title")
 *
 * DYNAMIC BLOCKS (Systems Section):
 * Email sequences are dynamically rendered and have IDs in this pattern:
 * - systems.{business}.{phase}.item{idx}.email{emailIdx}.subject
 * - systems.{business}.{phase}.item{idx}.email{emailIdx}.preview
 *
 * Where:
 * - business: "segelschule" | "haus"
 * - phase: "vorher" | "waehrend" | "nachher"
 * - idx: 0-3 (item index within the phase)
 * - emailIdx: 0-2 (email index within the item)
 *
 * Examples:
 * - systems.segelschule.vorher.item0.email0.subject
 * - systems.segelschule.vorher.item0.email0.preview
 * - systems.haus.nachher.item2.email1.subject
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
 * All editable blocks for the Gerrit template
 */
export const GERRIT_EDITABLE_BLOCKS: EditableBlock[] = [
  // ============================================
  // HERO SECTION
  // ============================================
  {
    id: "hero.title",
    label: "Hero Title",
    type: "text",
    maxLength: 100,
    section: "hero",
    description: "Main headline at the top of the page",
  },
  {
    id: "hero.highlight",
    label: "Hero Highlight",
    type: "text",
    maxLength: 150,
    section: "hero",
    description: "Emphasized tagline below the title",
  },
  {
    id: "hero.description",
    label: "Hero Description",
    type: "multiline",
    maxLength: 500,
    section: "hero",
    description: "Opening paragraph describing the offer",
  },

  // ============================================
  // UNDERSTANDING SECTION - THREE WORLDS
  // ============================================
  {
    id: "understanding.sailing.title",
    label: "Sailing World Title",
    type: "text",
    maxLength: 80,
    section: "understanding",
    description: "Title for the sailing world section",
  },
  {
    id: "understanding.sailing.description",
    label: "Sailing World Description",
    type: "multiline",
    maxLength: 600,
    section: "understanding",
    description: "Description of the sailing school aspect",
  },
  {
    id: "understanding.location.title",
    label: "Location World Title",
    type: "text",
    maxLength: 80,
    section: "understanding",
    description: "Title for the location section",
  },
  {
    id: "understanding.location.description",
    label: "Location World Description",
    type: "multiline",
    maxLength: 600,
    section: "understanding",
    description: "Description of the Haff location",
  },
  {
    id: "understanding.house.title",
    label: "House World Title",
    type: "text",
    maxLength: 80,
    section: "understanding",
    description: "Title for the vacation house section",
  },
  {
    id: "understanding.house.description",
    label: "House World Description",
    type: "multiline",
    maxLength: 600,
    section: "understanding",
    description: "Description of the vacation rental house",
  },

  // ============================================
  // PROBLEM SECTION
  // ============================================
  {
    id: "problem.external",
    label: "External Problem",
    type: "multiline",
    maxLength: 400,
    section: "problem",
    description: "The external/visible problem the client faces",
  },
  {
    id: "problem.internal",
    label: "Internal Problem",
    type: "multiline",
    maxLength: 400,
    section: "problem",
    description: "The internal/emotional problem the client feels",
  },
  {
    id: "problem.philosophical",
    label: "Philosophical Problem",
    type: "multiline",
    maxLength: 400,
    section: "problem",
    description: "The deeper 'why it matters' problem",
  },

  // ============================================
  // GUIDE SECTION
  // ============================================
  {
    id: "guide.title",
    label: "Guide Section Title",
    type: "text",
    maxLength: 100,
    section: "guide",
    description: "Title for the guide/expert section",
  },
  {
    id: "guide.description",
    label: "Guide Description",
    type: "multiline",
    maxLength: 600,
    section: "guide",
    description: "Why you're the right person for this project",
  },

  // ============================================
  // SUCCESS / TRANSFORMATION SECTION
  // ============================================
  {
    id: "success.title",
    label: "Success Section Title",
    type: "text",
    maxLength: 100,
    section: "success",
    description: "Title for the transformation/success section",
  },
  {
    id: "success.description",
    label: "Success Description",
    type: "multiline",
    maxLength: 600,
    section: "success",
    description: "Vision of what success looks like",
  },

  // ============================================
  // SYSTEMS SECTION - EMAIL SEQUENCES
  // Each email in the automation sequences
  // ============================================

  // Segelschule - Anticipation Sequence
  {
    id: "systems.segelschule.anticipation.email1.subject",
    label: "Sailing Anticipation Email 1 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.segelschule",
    description: "Subject line for 7-days-before email",
  },
  {
    id: "systems.segelschule.anticipation.email1.preview",
    label: "Sailing Anticipation Email 1 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.segelschule",
    description: "Preview text for 7-days-before email",
  },
  {
    id: "systems.segelschule.anticipation.email2.subject",
    label: "Sailing Anticipation Email 2 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.segelschule",
    description: "Subject line for 3-days-before email",
  },
  {
    id: "systems.segelschule.anticipation.email2.preview",
    label: "Sailing Anticipation Email 2 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.segelschule",
    description: "Preview text for 3-days-before email",
  },
  {
    id: "systems.segelschule.anticipation.email3.subject",
    label: "Sailing Anticipation Email 3 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.segelschule",
    description: "Subject line for 1-day-before email",
  },
  {
    id: "systems.segelschule.anticipation.email3.preview",
    label: "Sailing Anticipation Email 3 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.segelschule",
    description: "Preview text for 1-day-before email",
  },

  // Segelschule - Follow-up Sequence
  {
    id: "systems.segelschule.followup.email1.subject",
    label: "Sailing Follow-up Email 1 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.segelschule",
    description: "Subject line for day-after follow-up",
  },
  {
    id: "systems.segelschule.followup.email1.preview",
    label: "Sailing Follow-up Email 1 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.segelschule",
    description: "Preview text for day-after follow-up",
  },

  // Segelschule - Review Request
  {
    id: "systems.segelschule.review.email1.subject",
    label: "Sailing Review Request Subject",
    type: "text",
    maxLength: 100,
    section: "systems.segelschule",
    description: "Subject line for review request email",
  },
  {
    id: "systems.segelschule.review.email1.preview",
    label: "Sailing Review Request Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.segelschule",
    description: "Preview text for review request email",
  },

  // Segelschule - Upsell
  {
    id: "systems.segelschule.upsell.email1.subject",
    label: "Sailing Upsell Email Subject",
    type: "text",
    maxLength: 100,
    section: "systems.segelschule",
    description: "Subject line for upsell email",
  },
  {
    id: "systems.segelschule.upsell.email1.preview",
    label: "Sailing Upsell Email Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.segelschule",
    description: "Preview text for upsell email",
  },

  // Haus - Anticipation Sequence
  {
    id: "systems.haus.anticipation.email1.subject",
    label: "House Anticipation Email 1 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.haus",
    description: "Subject line for 7-days-before email",
  },
  {
    id: "systems.haus.anticipation.email1.preview",
    label: "House Anticipation Email 1 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.haus",
    description: "Preview text for 7-days-before email",
  },
  {
    id: "systems.haus.anticipation.email2.subject",
    label: "House Anticipation Email 2 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.haus",
    description: "Subject line for 3-days-before email",
  },
  {
    id: "systems.haus.anticipation.email2.preview",
    label: "House Anticipation Email 2 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.haus",
    description: "Preview text for 3-days-before email",
  },

  // Haus - Follow-up Sequence
  {
    id: "systems.haus.followup.email1.subject",
    label: "House Follow-up Email 1 Subject",
    type: "text",
    maxLength: 100,
    section: "systems.haus",
    description: "Subject line for day-after follow-up",
  },
  {
    id: "systems.haus.followup.email1.preview",
    label: "House Follow-up Email 1 Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.haus",
    description: "Preview text for day-after follow-up",
  },

  // Haus - Review Request
  {
    id: "systems.haus.review.email1.subject",
    label: "House Review Request Subject",
    type: "text",
    maxLength: 100,
    section: "systems.haus",
    description: "Subject line for review request email",
  },
  {
    id: "systems.haus.review.email1.preview",
    label: "House Review Request Preview",
    type: "multiline",
    maxLength: 300,
    section: "systems.haus",
    description: "Preview text for review request email",
  },

  // ============================================
  // PRICING SECTION
  // ============================================
  {
    id: "pricing.option1.title",
    label: "Pricing Option 1 Title",
    type: "text",
    maxLength: 80,
    section: "pricing",
    description: "Name of the first pricing package",
  },
  {
    id: "pricing.option1.subtitle",
    label: "Pricing Option 1 Subtitle",
    type: "text",
    maxLength: 150,
    section: "pricing",
    description: "Tagline for the first pricing package",
  },
  {
    id: "pricing.option2.title",
    label: "Pricing Option 2 Title",
    type: "text",
    maxLength: 80,
    section: "pricing",
    description: "Name of the second pricing package",
  },
  {
    id: "pricing.option2.subtitle",
    label: "Pricing Option 2 Subtitle",
    type: "text",
    maxLength: 150,
    section: "pricing",
    description: "Tagline for the second pricing package",
  },
  {
    id: "pricing.option3.title",
    label: "Pricing Option 3 Title",
    type: "text",
    maxLength: 80,
    section: "pricing",
    description: "Name of the third pricing package",
  },
  {
    id: "pricing.option3.subtitle",
    label: "Pricing Option 3 Subtitle",
    type: "text",
    maxLength: 150,
    section: "pricing",
    description: "Tagline for the third pricing package",
  },

  // ============================================
  // FINAL CTA SECTION
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
  for (const block of GERRIT_EDITABLE_BLOCKS) {
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
  return GERRIT_EDITABLE_BLOCKS.find((b) => b.id === id);
}

/**
 * Get all block IDs (for batch operations)
 */
export function getAllBlockIds(): string[] {
  return GERRIT_EDITABLE_BLOCKS.map((b) => b.id);
}
