/**
 * Chat Widget Exports
 *
 * Embeddable webchat widget for AI agents.
 */

export {
  ChatWidget,
  type ChatWidgetProps,
  type WebchatConfig,
  type ChatWidgetType,
} from "./ChatWidget";

export {
  generateWebchatDeploymentSnippets,
  parseWebchatSnippetRuntimeSeedFromDataset,
  parseWebchatSnippetRuntimeSeedFromQuery,
  type WebchatSnippetBootstrapContract,
  type WebchatSnippetGenerationOptions,
  type WebchatDeploymentSnippets,
  type WebchatRuntimeSeed,
} from "./deploymentSnippets";
