import { v } from "convex/values";

export const INTERVENTION_TEMPLATE_IDS = [
  "send_file",
  "override_draft",
  "handoff_back_to_agent",
] as const;

export type InterventionTemplateId = (typeof INTERVENTION_TEMPLATE_IDS)[number];

export type InterventionTemplateInput = {
  templateId: InterventionTemplateId;
  note?: string;
  fileName?: string;
  fileUrl?: string;
};

export type NormalizedInterventionTemplate = {
  templateId: InterventionTemplateId;
  note?: string;
  fileName?: string;
  fileUrl?: string;
};

export const interventionTemplateValidator = v.object({
  templateId: v.union(
    v.literal("send_file"),
    v.literal("override_draft"),
    v.literal("handoff_back_to_agent")
  ),
  note: v.optional(v.string()),
  fileName: v.optional(v.string()),
  fileUrl: v.optional(v.string()),
});

export function normalizeInterventionTemplateInput(
  input?: InterventionTemplateInput
): NormalizedInterventionTemplate | undefined {
  if (!input) {
    return undefined;
  }

  const note = normalizeOptionalText(input.note);
  const fileName = normalizeOptionalText(input.fileName);
  const fileUrl = normalizeOptionalText(input.fileUrl);

  if (input.templateId === "send_file" && !fileName && !fileUrl) {
    throw new Error("Send file template requires fileName or fileUrl.");
  }

  return {
    templateId: input.templateId,
    note,
    fileName,
    fileUrl,
  };
}

function normalizeOptionalText(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
