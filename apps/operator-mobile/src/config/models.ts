/**
 * Available AI models via OpenRouter
 */

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  description: string;
  icon: 'sparkles' | 'zap' | 'brain' | 'bot';
  isPrimary?: boolean; // Show in main dropdown (top 3)
}

// Primary models - Claude 4.5 family (shown by default)
export const PRIMARY_MODELS: Model[] = [
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 15, completion: 75 },
    description: 'Most capable for complex work',
    icon: 'brain',
    isPrimary: true,
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 3, completion: 15 },
    description: 'Best for everyday tasks',
    icon: 'sparkles',
    isPrimary: true,
  },
  {
    id: 'anthropic/claude-haiku-4',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    contextLength: 200000,
    pricing: { prompt: 0.25, completion: 1.25 },
    description: 'Fastest for quick answers',
    icon: 'zap',
    isPrimary: true,
  },
];

// Additional models - shown when "More models" is expanded
export const MORE_MODELS: Model[] = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { prompt: 2.5, completion: 10 },
    description: 'Very fast, good quality',
    icon: 'bot',
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { prompt: 10, completion: 30 },
    description: 'Great for code',
    icon: 'bot',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    contextLength: 1048576,
    pricing: { prompt: 0, completion: 0 },
    description: 'Free tier, huge context',
    icon: 'zap',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextLength: 163840,
    pricing: { prompt: 0.3, completion: 1.2 },
    description: 'Very cheap, decent quality',
    icon: 'bot',
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    contextLength: 131072,
    pricing: { prompt: 0.35, completion: 0.4 },
    description: 'Open source',
    icon: 'bot',
  },
];

// All models combined
export const AVAILABLE_MODELS: Model[] = [...PRIMARY_MODELS, ...MORE_MODELS];

// Default model - Claude Opus 4.5 (most capable)
export const DEFAULT_MODEL = PRIMARY_MODELS[0];

/**
 * Get a model by ID
 */
export function getModelById(id: string): Model | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

/**
 * Get display name for a model (shortened for header)
 */
export function getModelShortName(model: Model): string {
  // For Claude models, show variant name
  if (model.name.includes('Claude')) {
    if (model.name.includes('Opus')) return 'Opus 4.5';
    if (model.name.includes('Sonnet')) return 'Sonnet 4.5';
    if (model.name.includes('Haiku')) return 'Haiku 4.5';
    const match = model.name.match(/Claude (\d+(\.\d+)?|\w+\s*\d*)/);
    return match ? match[0] : model.name.split(' ').slice(0, 2).join(' ');
  }
  // For other models, show first 2 words
  return model.name.split(' ').slice(0, 2).join(' ');
}

/**
 * Format pricing for display
 */
export function formatPricing(model: Model): string {
  if (model.pricing.prompt === 0 && model.pricing.completion === 0) {
    return 'Free';
  }
  return `$${model.pricing.prompt}/$${model.pricing.completion} per 1M tokens`;
}
