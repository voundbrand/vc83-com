"use client"

import { useState, useRef, useEffect } from "react"
import { useMutation } from "convex/react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useNotification } from "@/hooks/use-notification"
import { useAIChatVoiceInputLanguage } from "@/hooks/use-ai-chat-voice-input-language"
import { StopCircle, SendHorizontal, Loader2, Mic, MicOff, ImagePlus, Lightbulb, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import {
  consumeVoiceAgentCoCreationHandoff,
  VOICE_AGENT_HANDOFF_EVENT,
} from "@/lib/voice-assistant/agent-co-creation-handoff"
import { buildFrontlineFeatureIntakeKickoff } from "@/lib/ai/frontline-feature-intake"
import {
  getCreditRecoveryAction,
  openCreditRecoveryAction,
} from "@/lib/credits/credit-recovery"
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any }

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike

interface ComposerImageAttachment {
  clientId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  previewUrl: string
  file?: File
  attachmentId?: string
}

const MAX_IMAGE_ATTACHMENTS = 4
const MAX_IMAGE_ATTACHMENT_BYTES = 20 * 1024 * 1024

function buildAttachmentClientId(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function revokeAttachmentPreview(previewUrl: string): void {
  if (previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl)
  }
}

function resolveSpeechRecognitionCtor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") {
    return null
  }

  const host = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructorLike
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike
  }

  return host.SpeechRecognition || host.webkitSpeechRecognition || null
}

export function ChatInput() {
  const [message, setMessage] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [imageAttachments, setImageAttachments] = useState<ComposerImageAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageAttachmentsRef = useRef<ComposerImageAttachment[]>([])
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { user } = useAuth()
  const {
    chat,
    currentConversationId,
    setCurrentConversationId,
    isSending,
    setIsSending,
    humanInLoopEnabled,
    setHumanInLoopEnabled,
    abortController,
    stopCurrentRequest,
  } = useAIChatContext()
  const { isAIReady } = useAIConfig()
  const notification = useNotification()
  const useMutationUntyped = useMutation as (mutation: unknown) => unknown
  const generateAttachmentUploadUrl = useMutationUntyped(
    api.ai.chatAttachments.generateUploadUrl
  ) as (args: {
    organizationId: string
    userId: string
    fileName: string
    mimeType: string
    sizeBytes: number
  }) => Promise<string>
  const saveUploadedAttachment = useMutationUntyped(
    api.ai.chatAttachments.saveUploadedAttachment
  ) as (args: {
    organizationId: string
    userId: string
    storageId: string
    fileName: string
    mimeType: string
    sizeBytes: number
    width?: number
    height?: number
    conversationId?: string
  }) => Promise<{
    attachmentId: string
  }>
  const {
    voiceInputLanguage,
    selectedLanguageValue,
    languageOptions,
    setSelectedLanguageValue,
    isUsingAppLanguage,
  } = useAIChatVoiceInputLanguage()

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  useEffect(() => {
    setSpeechSupported(Boolean(resolveSpeechRecognitionCtor()))
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    imageAttachmentsRef.current = imageAttachments
  }, [imageAttachments])

  useEffect(() => {
    return () => {
      imageAttachmentsRef.current.forEach((attachment) => {
        revokeAttachmentPreview(attachment.previewUrl)
      })
    }
  }, [])

  // Global ESC key handler to stop AI processing
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSending) {
        e.preventDefault()
        stopCurrentRequest()
        notification.info("Request Stopped", "AI processing has been cancelled")
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isSending, stopCurrentRequest, notification])

  useEffect(() => {
    const applyHandoffDraft = () => {
      const staged = consumeVoiceAgentCoCreationHandoff()
      if (!staged) {
        return
      }

      setMessage((current) => {
        if (!current.trim()) {
          return staged.draftMessage
        }
        return `${current.trim()}\n\n---\n${staged.draftMessage}`
      })

      if (!humanInLoopEnabled) {
        setHumanInLoopEnabled(true)
      }

      notification.info(
        "Agent Handoff Draft Ready",
        "Review and edit the staged handoff before sending it to the assistant runtime."
      )
    }

    applyHandoffDraft()
    window.addEventListener(VOICE_AGENT_HANDOFF_EVENT, applyHandoffDraft)
    return () => window.removeEventListener(VOICE_AGENT_HANDOFF_EVENT, applyHandoffDraft)
  }, [humanInLoopEnabled, notification, setHumanInLoopEnabled])

  const stopVoiceCapture = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }

  const startVoiceCapture = () => {
    const ctor = resolveSpeechRecognitionCtor()
    if (!ctor) {
      notification.error(
        "Voice Capture Unavailable",
        "Your browser does not support speech recognition for this composer."
      )
      return
    }

    if (isListening) {
      stopVoiceCapture()
      return
    }

    const recognition = new ctor()
    recognition.lang = voiceInputLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognition.onresult = (event) => {
      const firstResult = event.results?.[0]
      const transcript = firstResult?.[0]?.transcript?.trim()
      if (!transcript) {
        return
      }
      setMessage((current) => (current.trim().length > 0 ? `${current.trim()} ${transcript}` : transcript))
    }
    recognition.onerror = (event) => {
      notification.error(
        "Voice Capture Failed",
        typeof event.error === "string" && event.error.length > 0
          ? event.error
          : "Unable to transcribe speech."
      )
      stopVoiceCapture()
    }
    recognition.onend = () => {
      stopVoiceCapture()
    }

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  const handleVoiceLanguageChange = (nextValue: string) => {
    if (isListening) {
      stopVoiceCapture()
    }
    setSelectedLanguageValue(nextValue)
  }

  const handleAttachImageClick = () => {
    imageInputRef.current?.click()
  }

  const removeAttachedImage = (attachmentClientId: string) => {
    setImageAttachments((current) => {
      const attachment = current.find((item) => item.clientId === attachmentClientId)
      if (attachment) {
        revokeAttachmentPreview(attachment.previewUrl)
      }
      return current.filter((item) => item.clientId !== attachmentClientId)
    })
  }

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) {
      return
    }

    const existingAttachmentCount = imageAttachments.length
    const availableSlots = Math.max(0, MAX_IMAGE_ATTACHMENTS - existingAttachmentCount)
    const pendingAttachments: ComposerImageAttachment[] = []
    let skippedInvalidType = 0
    let skippedTooLarge = 0

    for (const file of files.slice(0, availableSlots)) {
      if (!file.type.startsWith("image/")) {
        skippedInvalidType += 1
        continue
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_ATTACHMENT_BYTES) {
        skippedTooLarge += 1
        continue
      }

      const clientId = buildAttachmentClientId(file)
      const previewUrl = URL.createObjectURL(file)
      pendingAttachments.push({
        clientId,
        fileName: file.name.trim() || "image",
        mimeType: file.type,
        sizeBytes: file.size,
        previewUrl,
        file,
      })
    }

    if (pendingAttachments.length > 0) {
      setImageAttachments((current) => {
        const seen = new Set(current.map((attachment) => attachment.clientId))
        const next = [...current]
        for (const attachment of pendingAttachments) {
          if (seen.has(attachment.clientId)) {
            revokeAttachmentPreview(attachment.previewUrl)
            continue
          }
          next.push(attachment)
          seen.add(attachment.clientId)
        }
        return next.slice(0, MAX_IMAGE_ATTACHMENTS)
      })
      notification.info(
        "Images Attached",
        `${pendingAttachments.length} image${pendingAttachments.length > 1 ? "s" : ""} ready to send.`
      )
    }

    if (files.length > availableSlots) {
      notification.error(
        "Attachment Limit Reached",
        `You can send up to ${MAX_IMAGE_ATTACHMENTS} images per message.`
      )
    }

    if (skippedInvalidType > 0 || skippedTooLarge > 0) {
      const problems: string[] = []
      if (skippedInvalidType > 0) {
        problems.push(`${skippedInvalidType} non-image file${skippedInvalidType > 1 ? "s were" : " was"} skipped`)
      }
      if (skippedTooLarge > 0) {
        problems.push(`${skippedTooLarge} image${skippedTooLarge > 1 ? "s exceed" : " exceeds"} 20MB`)
      }
      notification.error("Some Files Were Skipped", problems.join(". "))
    }

    event.target.value = ""
  }

  const uploadAttachmentIfNeeded = async (
    attachment: ComposerImageAttachment
  ): Promise<ComposerImageAttachment> => {
    if (attachment.attachmentId) {
      return attachment
    }
    if (!attachment.file) {
      throw new Error(`Attachment "${attachment.fileName}" is missing file data.`)
    }
    if (!user?.id || !user.currentOrganization?.id) {
      throw new Error("You must be signed in to upload attachments.")
    }

    const uploadUrl = await generateAttachmentUploadUrl({
      organizationId: user.currentOrganization.id,
      userId: user.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
      },
      body: attachment.file,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed for "${attachment.fileName}".`)
    }

    const uploadPayload = (await uploadResponse.json()) as { storageId?: string }
    if (!uploadPayload.storageId) {
      throw new Error(`Upload storage ID missing for "${attachment.fileName}".`)
    }

    const persisted = await saveUploadedAttachment({
      organizationId: user.currentOrganization.id,
      userId: user.id,
      storageId: uploadPayload.storageId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      conversationId: currentConversationId,
    })

    return {
      ...attachment,
      attachmentId: persisted.attachmentId,
      file: undefined,
    }
  }

  const ensureImageAttachmentsReady = async (
    pendingAttachments: ComposerImageAttachment[]
  ): Promise<ComposerImageAttachment[]> => {
    const preparedAttachments: ComposerImageAttachment[] = []
    for (const attachment of pendingAttachments) {
      preparedAttachments.push(await uploadAttachmentIfNeeded(attachment))
    }
    return preparedAttachments
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && imageAttachments.length === 0) || isSending) return

    if (!isAIReady) {
      notification.error(
        "AI Not Ready",
        "Please configure at least one AI model in Organization Settings > AI before chatting."
      )
      return
    }

    const messageToSend = message.trim()
    const stagedAttachments = imageAttachments.map((attachment) => ({ ...attachment }))
    setMessage("")
    setImageAttachments([])
    setIsSending(true)

    // Create new abort controller for this request
    abortController.current = new AbortController()

    try {
      const preparedAttachments = await ensureImageAttachmentsReady(stagedAttachments)
      const outboundAttachments = preparedAttachments
        .filter((attachment) => Boolean(attachment.attachmentId))
        .map((attachment) => ({ attachmentId: attachment.attachmentId as string }))
      const composedMessage =
        messageToSend || `Please analyze the attached image${outboundAttachments.length > 1 ? "s" : ""}.`

      const result = await chat.sendMessage(composedMessage, currentConversationId, {
        attachments: outboundAttachments,
      })

      stagedAttachments.forEach((attachment) => revokeAttachmentPreview(attachment.previewUrl))

      // If this was a new conversation, set the conversation ID
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }
    } catch (error) {
      // Check if request was aborted
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[AI Chat] Request was aborted by user")
        return // Don't show error notification for user-initiated stops
      }

      // Parse error message for user-friendly feedback
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const creditRecovery = getCreditRecoveryAction(error)
      if (!creditRecovery) {
        console.error("Failed to send message:", error)
      }

      if (creditRecovery) {
        notification.error(
          "No Credits Available",
          "You are out of credits. Re-up now to keep the conversation going.",
          {
            action: {
              label: creditRecovery.actionLabel,
              onClick: () => openCreditRecoveryAction(creditRecovery.actionUrl),
            },
          }
        )
      } else if (errorMessage.includes("budget") || errorMessage.includes("limit")) {
        notification.error(
          "Usage Limit Reached",
          "You've reached a usage limit. Add credits in the Store or increase your AI monthly budget."
        )
      } else {
        notification.error(
          "Failed to Send Message",
          errorMessage.length > 100 ? "An error occurred. Please try again." : errorMessage
        )
      }

      // Restore message on error
      setMessage(messageToSend)
      setImageAttachments(stagedAttachments)
    } finally {
      setIsSending(false)
      abortController.current = null
    }
  }

  const startFrontlineIntake = async () => {
    if (isSending) return

    const kickoff = buildFrontlineFeatureIntakeKickoff({
      trigger: "manual_feedback",
      lastUserMessage: message.trim() || undefined,
    })

    setMessage("")
    setIsSending(true)
    abortController.current = new AbortController()

    try {
      const result = await chat.sendMessage(kickoff, currentConversationId)

      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }

      notification.info(
        "Let's Capture What's Missing",
        "I asked the assistant to ask what's missing and what you need, then draft the feature request."
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const creditRecovery = getCreditRecoveryAction(error)
      if (creditRecovery) {
        notification.error(
          "No Credits Available",
          "You are out of credits. Re-up now to keep the conversation going.",
          {
            action: {
              label: creditRecovery.actionLabel,
              onClick: () => openCreditRecoveryAction(creditRecovery.actionUrl),
            },
          }
        )
        return
      }
      notification.error(
        "Unable to Start Intake",
        errorMessage.length > 100 ? "Please try again." : errorMessage
      )
    } finally {
      setIsSending(false)
      abortController.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t-2 p-3"
      style={{
        borderColor: 'var(--shell-border)',
        background: 'var(--shell-surface-elevated)'
      }}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageSelection}
      />
      {imageAttachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {imageAttachments.map((attachment) => (
            <span
              key={attachment.clientId}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px]"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-surface)",
                color: "var(--shell-text-dim)",
              }}
            >
              <ImagePlus size={11} />
              <span className="max-w-[140px] truncate">{attachment.fileName}</span>
              <button
                type="button"
                onClick={() => removeAttachedImage(attachment.clientId)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm"
                title="Remove image attachment"
                style={{ color: "var(--shell-text-dim)" }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("ui.ai_assistant.input.placeholder")}
          disabled={isSending}
          className="desktop-interior-input flex-1 min-w-0 resize-none overflow-hidden min-h-[44px] max-h-[120px] disabled:opacity-60"
          rows={1}
        />
        <button
          type="button"
          onClick={handleAttachImageClick}
          disabled={isSending}
          className="desktop-shell-button px-3 py-2 font-pixel text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          title="Attach image for vision"
        >
          <ImagePlus size={14} />
          Vision
        </button>
        <button
          type="button"
          onClick={() => {
            void startFrontlineIntake()
          }}
          disabled={isSending}
          className="desktop-shell-button px-3 py-2 font-pixel text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          title="Tell us what's missing and what you need"
        >
          <Lightbulb size={14} />
          Frontline
        </button>
        {speechSupported && (
          <select
            value={selectedLanguageValue}
            onChange={(event) => handleVoiceLanguageChange(event.target.value)}
            disabled={isSending}
            aria-label="Voice input language"
            className="desktop-interior-input h-11 min-w-36 max-w-48 px-2 text-xs disabled:opacity-60"
            title={
              isUsingAppLanguage
                ? "Voice input follows your app language setting"
                : "Voice input language override"
            }
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        {speechSupported && (
          <button
            type="button"
            onClick={startVoiceCapture}
            disabled={isSending}
            className="desktop-shell-button px-3 py-2 font-pixel text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title={isListening ? "Stop voice capture" : "Start voice capture"}
            style={
              isListening
                ? {
                    background: "var(--warning)",
                    color: "var(--win95-text)",
                  }
                : undefined
            }
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {isListening ? "Stop Mic" : "Voice"}
          </button>
        )}
        {isSending ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              stopCurrentRequest()
              notification.info("Request Stopped", "AI processing has been cancelled")
            }}
            className="desktop-shell-button px-4 py-2 font-pixel text-xs whitespace-nowrap flex items-center gap-2"
            style={{
              background: 'var(--error)',
              color: 'white'
            }}
            title="Stop AI processing (or press ESC)"
          >
            <StopCircle size={14} />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim() && imageAttachments.length === 0}
            className="desktop-shell-button px-4 py-2 font-pixel text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <SendHorizontal size={14} />
            {t("ui.ai_assistant.input.send_button")}
          </button>
        )}
      </div>

      <div className="mt-2 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
        {isSending ? (
          <span className="flex items-center gap-1">
            <span className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              <span>Processing...</span>
            </span>
            <span className="opacity-60">• Press ESC or click Stop to cancel</span>
          </span>
        ) : isListening ? (
          <span className="flex items-center gap-1">
            <Mic size={11} />
            <span>Listening... speak to append text in this composer</span>
          </span>
        ) : (
          t("ui.ai_assistant.input.quick_commands")
        )}
      </div>
    </form>
  )
}
