import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Circle,
} from 'tamagui';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Brain,
  Bot,
} from '@tamagui/lucide-icons';

import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  getModelById,
  getModelShortName,
  type Model,
} from '../../config/models';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

export type RuntimeModelAvailability = {
  modelId: string;
  name: string;
  provider: string;
  isDefault: boolean;
  customLabel?: string;
};

type ModelSelectorProps = {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels?: RuntimeModelAvailability[];
};

const IconComponent = ({ icon, color, size = 16 }: { icon: Model['icon']; color: string; size?: number }) => {
  switch (icon) {
    case 'zap':
      return <Zap size={size} color={color} />;
    case 'brain':
      return <Brain size={size} color={color} />;
    case 'bot':
      return <Bot size={size} color={color} />;
    default:
      return <Sparkles size={size} color={color} />;
  }
};

function inferIcon(modelId: string, provider: string): Model['icon'] {
  const normalized = `${provider}/${modelId}`.toLowerCase();
  if (normalized.includes('opus') || normalized.includes('gpt-5') || normalized.includes('reasoning')) {
    return 'brain';
  }
  if (normalized.includes('flash') || normalized.includes('haiku') || normalized.includes('mini')) {
    return 'zap';
  }
  if (normalized.includes('gpt') || normalized.includes('llama') || normalized.includes('deepseek')) {
    return 'bot';
  }
  return 'sparkles';
}

function buildRuntimeModels(models: RuntimeModelAvailability[] | undefined): Model[] {
  if (!models || models.length === 0) {
    return AVAILABLE_MODELS;
  }

  return models.map((item, index) => {
    const known = getModelById(item.modelId);
    const normalizedProvider = item.provider?.trim() || item.modelId.split('/')[0] || 'unknown';
    const displayName = item.customLabel || item.name || known?.name || item.modelId;
    return {
      id: item.modelId,
      name: displayName,
      provider: normalizedProvider,
      contextLength: known?.contextLength || 200000,
      pricing: known?.pricing || { prompt: 0, completion: 0 },
      description: known?.description || `${normalizedProvider} runtime model`,
      icon: known?.icon || inferIcon(item.modelId, normalizedProvider),
      isPrimary: index < 3 || item.isDefault,
    };
  });
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
  availableModels,
}: ModelSelectorProps) {
  const { t } = useAppPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);

  const runtimeModels = useMemo(() => buildRuntimeModels(availableModels), [availableModels]);
  const defaultRuntimeModelId = useMemo(
    () => availableModels?.find((model) => model.isDefault)?.modelId,
    [availableModels]
  );
  const sortedRuntimeModels = useMemo(() => {
    if (!defaultRuntimeModelId) {
      return runtimeModels;
    }
    return [...runtimeModels].sort((left, right) => {
      if (left.id === defaultRuntimeModelId) return -1;
      if (right.id === defaultRuntimeModelId) return 1;
      return 0;
    });
  }, [runtimeModels, defaultRuntimeModelId]);
  const primaryModels = useMemo(
    () => sortedRuntimeModels.slice(0, Math.min(3, sortedRuntimeModels.length)),
    [sortedRuntimeModels]
  );
  const moreModels = useMemo(
    () => sortedRuntimeModels.slice(primaryModels.length),
    [sortedRuntimeModels, primaryModels.length]
  );

  const currentModel = useMemo(
    () =>
      runtimeModels.find((model) => model.id === selectedModel)
      || getModelById(selectedModel)
      || primaryModels[0]
      || runtimeModels[0]
      || DEFAULT_MODEL,
    [runtimeModels, selectedModel, primaryModels]
  );

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    setIsOpen(false);
    setShowMoreModels(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowMoreModels(false);
  };

  const getModelDescription = (model: Model): string => {
    switch (model.id) {
      case 'anthropic/claude-opus-4':
        return t('model.description.claudeOpus');
      case 'anthropic/claude-sonnet-4':
        return t('model.description.claudeSonnet');
      case 'anthropic/claude-haiku-4':
        return t('model.description.claudeHaiku');
      case 'openai/gpt-4o':
        return t('model.description.gpt4o');
      case 'openai/gpt-4-turbo':
        return t('model.description.gpt4Turbo');
      case 'google/gemini-2.0-flash-exp:free':
        return t('model.description.geminiFlash');
      case 'deepseek/deepseek-chat':
        return t('model.description.deepSeek');
      case 'meta-llama/llama-3.1-70b-instruct':
        return t('model.description.llama');
      default:
        return model.description;
    }
  };

  const renderModelItem = (model: Model) => {
    const isSelected = model.id === selectedModel;
    const isFree = model.pricing.prompt === 0 && model.pricing.completion === 0;

    return (
      <Pressable key={model.id} onPress={() => handleSelect(model.id)}>
        <XStack
          paddingVertical={14}
          paddingHorizontal={16}
          alignItems="center"
          gap={12}
          backgroundColor={isSelected ? '$glass' : 'transparent'}
          pressStyle={{ backgroundColor: '$glass' }}
        >
          <Circle
            size={40}
            backgroundColor={isSelected ? '$primary' : '$glass'}
            alignItems="center"
            justifyContent="center"
          >
            <IconComponent
              icon={model.icon}
              color={isSelected ? 'white' : '$colorTertiary'}
              size={20}
            />
          </Circle>

          <YStack flex={1} gap={2}>
            <XStack alignItems="center" gap={6}>
              <Text
                color="$color"
                fontSize={16}
                fontWeight={isSelected ? '600' : '500'}
              >
                {model.name}
              </Text>
              {isFree ? (
                <Text
                  color="$success"
                  fontSize={10}
                  fontWeight="600"
                  backgroundColor="rgba(34, 197, 94, 0.12)"
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={4}
                  textTransform="uppercase"
                >
                  {t('common.free')}
                </Text>
              ) : null}
            </XStack>
            <Text color="$colorTertiary" fontSize={13}>
              {getModelDescription(model)}
            </Text>
          </YStack>

          {isSelected ? (
            <Check size={20} color="$primary" strokeWidth={3} />
          ) : null}
        </XStack>
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setIsOpen(true);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <XStack
          alignItems="center"
          gap="$2"
          paddingHorizontal="$3"
          paddingVertical="$2"
          backgroundColor="$glass"
          borderRadius={20}
          borderWidth={1}
          borderColor="$glassBorder"
        >
          <Text color="$color" fontSize={15} fontWeight="500">
            {getModelShortName(currentModel)}
          </Text>
          <ChevronDown size={16} color="$colorTertiary" />
        </XStack>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onPress={handleClose}
        >
          <YStack flex={1} justifyContent="flex-end" paddingHorizontal={16} paddingBottom={140}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <YStack
                backgroundColor="$background"
                borderRadius={16}
                width={320}
                maxWidth="100%"
                overflow="hidden"
                borderWidth={1}
                borderColor="$borderColor"
                shadowColor="black"
                shadowOffset={{ width: 0, height: 8 }}
                shadowOpacity={0.15}
                shadowRadius={24}
                elevation={8}
              >
                <XStack
                  paddingHorizontal={16}
                  paddingVertical={14}
                  borderBottomWidth={1}
                  borderBottomColor="$borderColor"
                >
                  <Text color="$color" fontSize={15} fontWeight="600">
                    {t('model.title')}
                  </Text>
                </XStack>

                <YStack paddingTop={8}>
                  {primaryModels.map(renderModelItem)}
                </YStack>

                {moreModels.length > 0 ? (
                  <Pressable onPress={() => setShowMoreModels(!showMoreModels)}>
                    <XStack
                      paddingVertical={14}
                      paddingHorizontal={16}
                      alignItems="center"
                      justifyContent="space-between"
                      borderTopWidth={1}
                      borderTopColor="$borderColor"
                      marginTop={8}
                    >
                      <Text color="$colorTertiary" fontSize={14} fontWeight="500">
                        {t('model.moreModels')}
                      </Text>
                      {showMoreModels ? (
                        <ChevronUp size={18} color="$colorTertiary" />
                      ) : (
                        <ChevronDown size={18} color="$colorTertiary" />
                      )}
                    </XStack>
                  </Pressable>
                ) : null}

                {showMoreModels && moreModels.length > 0 ? (
                  <ScrollView style={{ maxHeight: 250 }}>
                    <YStack paddingBottom={8}>
                      {moreModels.map(renderModelItem)}
                    </YStack>
                  </ScrollView>
                ) : null}
              </YStack>
            </Pressable>
          </YStack>
        </Pressable>
      </Modal>
    </>
  );
}

export default ModelSelector;
