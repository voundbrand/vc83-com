"use client";

export const KNOWLEDGE_CONTEXT_CONTRACT_VERSION = "knowledge_context_v1" as const;
export const KNOWLEDGE_CONTEXT_OPEN_CONTEXT_PREFIX = "knowledge_context:";

export type KnowledgeContextReferenceStatus = "ready" | "error";

export interface KnowledgeContextReferencePayload {
  fileId: string;
  name: string;
  path: string;
  fileKind: string;
  mimeType?: string;
  language?: string;
  source?: string;
  sizeBytes?: number;
  retrievalUrl?: string;
  status: KnowledgeContextReferenceStatus;
  content?: string;
  error?: string;
}

export interface KnowledgeContextKickoffPayload {
  contractVersion: typeof KNOWLEDGE_CONTEXT_CONTRACT_VERSION;
  contextSource: "finder" | "layers";
  organizationId?: string;
  projectId?: string;
  projectScope?: "project" | "org";
  scopeLabel?: string;
  authorityLabel?: string;
  citationQualityLabel?: string;
  requestedAt: number;
  referenceCount: number;
  references: KnowledgeContextReferencePayload[];
}

function encodeUtf8Base64(value: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return window.btoa(binary);
  } catch {
    return null;
  }
}

function decodeUtf8Base64(value: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const binary = window.atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeKnowledgeContextOpenContext(
  payload: KnowledgeContextKickoffPayload
): string {
  const encoded = encodeUtf8Base64(JSON.stringify(payload));
  return encoded
    ? `${KNOWLEDGE_CONTEXT_OPEN_CONTEXT_PREFIX}${encoded}`
    : KNOWLEDGE_CONTEXT_OPEN_CONTEXT_PREFIX.slice(0, -1);
}

export function parseKnowledgeContextOpenContext(
  openContext?: string
): KnowledgeContextKickoffPayload | null {
  if (!openContext || !openContext.startsWith(KNOWLEDGE_CONTEXT_OPEN_CONTEXT_PREFIX)) {
    return null;
  }

  const encodedPayload = openContext
    .slice(KNOWLEDGE_CONTEXT_OPEN_CONTEXT_PREFIX.length)
    .trim();
  if (!encodedPayload) {
    return null;
  }

  const decoded = decodeUtf8Base64(encodedPayload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as KnowledgeContextKickoffPayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
