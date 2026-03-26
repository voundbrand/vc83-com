"use client"

export const CMS_COPY_REWRITE_SUGGESTION_EVENT = "cms_copy_rewrite_suggestion" as const
export const CMS_COPY_REWRITE_SUGGESTION_CONTRACT_VERSION =
  "cms_copy_rewrite_suggestion_v1" as const

export const BOOKING_SETUP_WRITEBACK_EVENT =
  "booking_setup_wizard_writeback" as const
export const BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION =
  "booking_setup_writeback_v1" as const
export const LAYERS_WORKFLOW_WRITEBACK_EVENT =
  "layers_workflow_writeback" as const
export const LAYERS_WORKFLOW_WRITEBACK_CONTRACT_VERSION =
  "layers_workflow_writeback_v1" as const

export interface CmsCopyRewriteSuggestionEventDetail {
  contractVersion?: string
  applicationId?: string
  applicationName?: string
  page?: string
  section?: string
  key?: string
  label?: string
  locale?: string
  suggestion?: string
  assistantMessageId?: string
  emittedAt?: number
}

export interface BookingSetupInventoryGroupWriteback {
  id?: string
  label?: string
  capacity?: number
}

export interface BookingSetupCourseWriteback {
  courseId?: string
  displayName?: string
  bookingDurationMinutes?: number
  availableTimes?: string[]
  bookingResourceId?: string
  checkoutProductId?: string
  checkoutPublicUrl?: string
  isMultiDay?: boolean
}

export interface BookingSetupWizardWritebackEventDetail {
  contractVersion?: string
  appSlug?: string
  surfaceType?: string
  surfaceKey?: string
  setupTemplate?: string
  timezone?: string
  defaultAvailableTimes?: string[]
  bindingEnabled?: boolean
  priority?: number
  inventoryGroups?: BookingSetupInventoryGroupWriteback[]
  courses?: BookingSetupCourseWriteback[]
  warnings?: string[]
  sourceSessionId?: string
  sourceOrganizationId?: string
  assistantMessageId?: string
  emittedAt?: number
}

export interface LayersWorkflowWritebackNode {
  id?: string
  type?: string
  label?: string
  position?: {
    x?: number
    y?: number
  }
  config?: Record<string, unknown>
}

export interface LayersWorkflowWritebackEdge {
  source?: string
  target?: string
  sourceHandle?: string
  targetHandle?: string
}

export interface LayersWorkflowWritebackEventDetail {
  contractVersion?: string
  workflowId?: string
  description?: string
  warnings?: string[]
  nodes?: LayersWorkflowWritebackNode[]
  edges?: LayersWorkflowWritebackEdge[]
  sourceSessionId?: string
  sourceOrganizationId?: string
  assistantMessageId?: string
  emittedAt?: number
}

export function dispatchAIWritebackEvent<T>(eventName: string, detail: T) {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent<T>(eventName, { detail }))
}

export function addAIWritebackEventListener<T>(
  eventName: string,
  listener: (detail: T) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleEvent = (event: Event) => {
    const customEvent = event as CustomEvent<T>
    if (!customEvent.detail) {
      return
    }
    listener(customEvent.detail)
  }

  window.addEventListener(eventName, handleEvent as EventListener)
  return () => {
    window.removeEventListener(eventName, handleEvent as EventListener)
  }
}
