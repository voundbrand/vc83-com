"use client";

import { useEffect, useState } from "react";
import { useCms } from "../providers/CmsProvider";
import type {
  CmsContentRecord,
  CmsContentValue,
  CmsSaveContentInput,
  UseCmsContentOptions,
  UseCmsContentResult,
} from "../types";

function buildContentName(page: string, section: string, key: string): string {
  return `${page}_${section}_${key}`;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeContentRecord(
  record: CmsContentRecord | null,
  fallbackName: string,
  locale: string
): CmsContentRecord | null {
  if (!record) {
    return null;
  }

  return {
    recordId: record.recordId,
    name: record.name || fallbackName,
    subtype: record.subtype,
    locale: record.locale,
    resolvedLocale: record.resolvedLocale || record.locale || locale,
    value: record.value ?? null,
    description: record.description,
    status: record.status,
    customProperties: record.customProperties,
    fileUrl: record.fileUrl,
    imageMetadata: record.imageMetadata,
  };
}

function resolveNextContentValue(
  inputValue: CmsSaveContentInput["value"] | undefined,
  currentValue: CmsContentValue
): CmsContentValue | undefined {
  return inputValue === undefined ? currentValue : inputValue;
}

export function useCmsContent(options: UseCmsContentOptions): UseCmsContentResult {
  const {
    transport,
    locale: providerLocale,
    defaultLocale: providerDefaultLocale,
  } = useCms();
  const [record, setRecord] = useState<CmsContentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(options.enabled !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const locale = options.locale || providerLocale;
  const defaultLocale = options.defaultLocale || providerDefaultLocale;
  const enabled = options.enabled !== false;
  const name = buildContentName(options.page, options.section, options.key);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRecord() {
      setIsLoading(true);
      try {
        const nextRecord = normalizeContentRecord(
          await transport.getContent({
            page: options.page,
            section: options.section,
            key: options.key,
            locale,
            defaultLocale,
          }),
          name,
          locale
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
  }, [
    defaultLocale,
    enabled,
    locale,
    name,
    options.key,
    options.page,
    options.section,
    transport,
  ]);

  async function refresh(): Promise<CmsContentRecord | null> {
    if (!enabled) {
      return null;
    }

    setIsLoading(true);
    try {
      const nextRecord = normalizeContentRecord(
        await transport.getContent({
          page: options.page,
          section: options.section,
          key: options.key,
          locale,
          defaultLocale,
        }),
        name,
        locale
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

  async function save(
    input: Omit<CmsSaveContentInput, "page" | "section" | "key" | "locale"> & {
      locale?: string;
    }
  ): Promise<{ recordId: string }> {
    const targetLocale = input.locale || locale;
    const subtype = input.subtype || (record?.subtype === "image" ? "text" : record?.subtype) || "text";

    setIsSaving(true);
    try {
      const result = await transport.saveContent({
        recordId: input.recordId || record?.recordId || undefined,
        page: options.page,
        section: options.section,
        key: options.key,
        locale: targetLocale,
        subtype,
        value: resolveNextContentValue(input.value, record?.value ?? null),
        description: input.description ?? record?.description,
        status: input.status ?? record?.status,
        customProperties: input.customProperties ?? record?.customProperties,
      });

      const refreshedRecord = await transport.getContent({
        page: options.page,
        section: options.section,
        key: options.key,
        locale: targetLocale,
        defaultLocale,
      });
      setRecord(normalizeContentRecord(refreshedRecord, name, targetLocale));
      setError(null);
      return result;
    } catch (saveError) {
      const normalizedError = toError(saveError);
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    record,
    isLoading,
    isSaving,
    error,
    refresh,
    save,
  };
}
