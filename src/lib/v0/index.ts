/**
 * v0 Integration Module
 *
 * This module provides utilities for integrating with v0's Platform API
 * to generate LayerCake-connected UI components.
 *
 * @example
 * ```tsx
 * import { buildV0SystemPrompt, fetchV0Context, createMockContext } from '@/lib/v0';
 *
 * // Build prompt with real context
 * const context = await fetchV0Context(orgId, convexUrl, apiKey);
 * const systemPrompt = buildV0SystemPrompt(context);
 *
 * // Or use mock context for testing
 * const mockPrompt = buildV0SystemPrompt(createMockContext());
 * ```
 */

// System prompt template and builder
export {
  buildV0SystemPrompt,
  buildV0MinimalPrompt,
  LAYERCAKE_SYSTEM_PROMPT,
} from "./system-prompt";

// Types
export type {
  V0PromptContext,
  OrganizationContext,
  EventContext,
  FormContext,
  ProductContext,
  BrandScript,
  SalesFunnel,
} from "./system-prompt";

// Context fetching utilities
export {
  fetchV0Context,
  createMockContext,
} from "./context-fetcher";

export type { FetchContextOptions } from "./context-fetcher";
