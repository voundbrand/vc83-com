"use client"

import type {
  CmsContentRecord,
  CmsGetContentInput,
  CmsGetImageInput,
  CmsSaveContentInput,
  CmsTransport,
  CmsUploadImageInput,
} from "@cms"

interface CmsTransportState {
  includeUnpublished: boolean
}

async function readError(response: Response): Promise<Error> {
  const fallbackMessage = `CMS request failed (${response.status})`

  try {
    const payload = (await response.json()) as
      | { error?: string }
      | { message?: string }
      | null
    const message =
      (payload && "error" in payload && payload.error) ||
      (payload && "message" in payload && payload.message) ||
      fallbackMessage
    return new Error(message)
  } catch {
    return new Error(fallbackMessage)
  }
}

async function requireJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await readError(response)
  }
  return (await response.json()) as T
}

export function createSegelschuleCmsTransport(
  getState: () => CmsTransportState
): CmsTransport {
  return {
    async getContent(input: CmsGetContentInput): Promise<CmsContentRecord> {
      const params = new URLSearchParams({
        page: input.page,
        section: input.section,
        key: input.key,
        locale: input.locale,
        defaultLocale: input.defaultLocale,
      })

      if (getState().includeUnpublished) {
        params.set("includeUnpublished", "true")
      }

      const response = await fetch(`/api/cms/content?${params.toString()}`, {
        cache: "no-store",
      })
      return await requireJson<CmsContentRecord>(response)
    },

    async saveContent(
      input: CmsSaveContentInput
    ): Promise<{ recordId: string }> {
      const response = await fetch("/api/cms/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      const record = await requireJson<CmsContentRecord>(response)
      if (!record.recordId) {
        throw new Error("CMS content save did not return a recordId")
      }

      return { recordId: record.recordId }
    },

    async getImage(input: CmsGetImageInput): Promise<CmsContentRecord> {
      const params = new URLSearchParams({
        usage: input.usage,
      })

      if (input.locale) {
        params.set("locale", input.locale)
      }
      if (getState().includeUnpublished) {
        params.set("includeUnpublished", "true")
      }

      const response = await fetch(`/api/cms/image?${params.toString()}`, {
        cache: "no-store",
      })
      return await requireJson<CmsContentRecord>(response)
    },

    async uploadImage(
      input: CmsUploadImageInput
    ): Promise<{ recordId: string; url: string }> {
      const formData = new FormData()
      formData.set("usage", input.usage)
      formData.set("file", input.file)
      if (input.alt) {
        formData.set("alt", input.alt)
      }
      if (input.locale) {
        formData.set("locale", input.locale)
      }

      const response = await fetch("/api/cms/image", {
        method: "POST",
        body: formData,
      })

      const record = await requireJson<CmsContentRecord>(response)
      if (!record.recordId || !record.fileUrl) {
        throw new Error("CMS image upload did not return a record and file URL")
      }

      return {
        recordId: record.recordId,
        url: record.fileUrl,
      }
    },

    async deleteImage(input: { recordId: string }): Promise<void> {
      const response = await fetch("/api/cms/image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: input.recordId,
        }),
      })

      if (!response.ok) {
        throw await readError(response)
      }
    },
  }
}
