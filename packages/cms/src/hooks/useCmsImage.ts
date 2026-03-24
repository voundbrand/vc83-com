"use client";

import { useEffect, useState } from "react";
import { useCms } from "../providers/CmsProvider";
import type { CmsContentRecord, UseCmsImageOptions, UseCmsImageResult } from "../types";

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeImageRecord(record: CmsContentRecord | null): CmsContentRecord | null {
  if (!record) {
    return null;
  }

  return {
    ...record,
    value: record.value ?? null,
    fileUrl: record.fileUrl ?? null,
    imageMetadata: record.imageMetadata ?? null,
  };
}

export function useCmsImage(options: UseCmsImageOptions): UseCmsImageResult {
  const { transport, locale: providerLocale } = useCms();
  const [record, setRecord] = useState<CmsContentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(options.enabled !== false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options.enabled !== false;
  const locale = options.locale ?? providerLocale;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRecord() {
      setIsLoading(true);
      try {
        const nextRecord = normalizeImageRecord(
          await transport.getImage({
            usage: options.usage,
            locale,
          })
        );
        if (!cancelled) {
          setRecord(nextRecord);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(toError(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecord();

    return () => {
      cancelled = true;
    };
  }, [enabled, locale, options.usage, transport]);

  async function refresh(): Promise<CmsContentRecord | null> {
    if (!enabled) {
      return null;
    }

    setIsLoading(true);
    try {
      const nextRecord = normalizeImageRecord(
        await transport.getImage({
          usage: options.usage,
          locale,
        })
      );
      setRecord(nextRecord);
      setError(null);
      return nextRecord;
    } catch (refreshError) {
      const normalizedError = toError(refreshError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsLoading(false);
    }
  }

  async function upload(
    input: { file: File; alt?: string; locale?: string }
  ): Promise<{ recordId: string; url: string }> {
    setIsUploading(true);
    try {
      const result = await transport.uploadImage({
        usage: options.usage,
        file: input.file,
        alt: input.alt,
        locale: input.locale ?? locale,
      });
      await refresh();
      return result;
    } catch (uploadError) {
      const normalizedError = toError(uploadError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(): Promise<void> {
    if (!record?.recordId) {
      return;
    }

    setIsUploading(true);
    try {
      await transport.deleteImage({ recordId: record.recordId });
      setRecord(null);
      setError(null);
    } catch (removeError) {
      const normalizedError = toError(removeError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsUploading(false);
    }
  }

  return {
    record,
    isLoading,
    isUploading,
    error,
    refresh,
    upload,
    remove,
  };
}
