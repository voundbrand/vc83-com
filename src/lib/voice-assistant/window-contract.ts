export type VoiceAssistantWindowId = "ai-assistant" | "brain-voice";
export type VoiceAssistantProductCode = VoiceAssistantWindowId;

export interface VoiceAssistantServiceContract {
  id: "voice-runtime-shared.v1";
  runtimeHook: "use-voice-runtime";
  orchestrationGuarantee: "single_runtime_path";
  fallbackPolicy: "user_preference->org_default->browser";
}

export interface VoiceAssistantWindowContract {
  windowId: VoiceAssistantWindowId;
  productCode: VoiceAssistantProductCode;
  title: string;
  titleKey?: string;
  iconId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  serviceContractId: VoiceAssistantServiceContract["id"];
}

export const VOICE_ASSISTANT_SERVICE_CONTRACT: VoiceAssistantServiceContract = Object.freeze({
  id: "voice-runtime-shared.v1",
  runtimeHook: "use-voice-runtime",
  orchestrationGuarantee: "single_runtime_path",
  fallbackPolicy: "user_preference->org_default->browser",
});

const VOICE_ASSISTANT_WINDOW_CONTRACTS: Record<VoiceAssistantWindowId, VoiceAssistantWindowContract> = {
  "ai-assistant": {
    windowId: "ai-assistant",
    productCode: "ai-assistant",
    title: "AI Assistant",
    titleKey: "ui.app.ai_assistant",
    iconId: "ai-assistant",
    position: { x: 230, y: 70 },
    size: { width: 1400, height: 1200 },
    serviceContractId: VOICE_ASSISTANT_SERVICE_CONTRACT.id,
  },
  "brain-voice": {
    windowId: "brain-voice",
    productCode: "brain-voice",
    title: "Brain Voice",
    iconId: "brain-voice",
    position: { x: 210, y: 65 },
    size: { width: 1120, height: 760 },
    serviceContractId: VOICE_ASSISTANT_SERVICE_CONTRACT.id,
  },
};

const VOICE_ASSISTANT_PRODUCT_CODE_SET = new Set<VoiceAssistantProductCode>(
  Object.values(VOICE_ASSISTANT_WINDOW_CONTRACTS).map((contract) => contract.productCode),
);

export function getVoiceAssistantWindowContract(windowId: VoiceAssistantWindowId): VoiceAssistantWindowContract {
  return VOICE_ASSISTANT_WINDOW_CONTRACTS[windowId];
}

export function isVoiceAssistantProductCode(code: string): code is VoiceAssistantProductCode {
  return VOICE_ASSISTANT_PRODUCT_CODE_SET.has(code as VoiceAssistantProductCode);
}

