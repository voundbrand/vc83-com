import type { ReactNode } from "react";

export type CmsContentSubtype = "text" | "text_with_links" | "image" | (string & {});
export type CmsContentValue = string | Record<string, unknown> | null;
export type CmsContentLinkIcon =
  | "external"
  | "download"
  | "music"
  | "video"
  | "document"
  | "link"
  | "play"
  | "info";

export interface CmsContentLink {
  id: string;
  title: string;
  url: string;
  icon?: CmsContentLinkIcon;
}

export interface CmsTextWithLinksValue {
  text: string;
  links?: CmsContentLink[];
}

export interface CmsImageMetadata {
  contractVersion: "cms_image_v1";
  filename: string;
  mimeType: string;
  sizeBytes: number;
  alt?: string;
  width?: number;
  height?: number;
  usage: string;
  localeMode: "agnostic" | "localized";
  blurDataUrl?: string;
  focalPoint?: {
    x: number;
    y: number;
  };
}

export interface CmsContentRecord {
  recordId: string | null;
  name: string;
  subtype: CmsContentSubtype;
  locale: string | null;
  resolvedLocale: string | null;
  value: CmsContentValue;
  description?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
  fileUrl?: string | null;
  imageMetadata?: CmsImageMetadata | null;
}

export interface CmsGetContentInput {
  page: string;
  section: string;
  key: string;
  locale: string;
  defaultLocale: string;
}

export interface CmsSaveContentInput {
  recordId?: string;
  page: string;
  section: string;
  key: string;
  locale: string;
  subtype: Exclude<CmsContentSubtype, "image">;
  value?: CmsContentValue;
  description?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
}

export interface CmsGetImageInput {
  usage: string;
  locale?: string;
}

export interface CmsUploadImageInput {
  usage: string;
  file: File;
  alt?: string;
  locale?: string;
}

export interface CmsTransport {
  getContent(input: CmsGetContentInput): Promise<CmsContentRecord>;
  saveContent(input: CmsSaveContentInput): Promise<{ recordId: string }>;
  getImage(input: CmsGetImageInput): Promise<CmsContentRecord>;
  uploadImage(input: CmsUploadImageInput): Promise<{ recordId: string; url: string }>;
  deleteImage(input: { recordId: string }): Promise<void>;
}

export interface CmsContextValue {
  transport: CmsTransport;
  locale: string;
  defaultLocale: string;
  isEditMode: boolean;
  setLocale: (locale: string) => void;
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;
}

export interface CmsProviderProps {
  children: ReactNode;
  transport: CmsTransport;
  defaultLocale: string;
  initialLocale?: string;
  initialEditMode?: boolean;
}

export interface CmsLocaleState {
  locale: string;
  defaultLocale: string;
  setLocale: (locale: string) => void;
}

export interface CmsEditModeState {
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;
}

export interface UseCmsContentOptions {
  page: string;
  section: string;
  key: string;
  locale?: string;
  defaultLocale?: string;
  enabled?: boolean;
}

export interface UseCmsContentResult {
  record: CmsContentRecord | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  refresh: () => Promise<CmsContentRecord | null>;
  save: (
    input: Omit<CmsSaveContentInput, "page" | "section" | "key" | "locale"> & {
      locale?: string;
    }
  ) => Promise<{ recordId: string }>;
}

export interface UseCmsImageOptions {
  usage: string;
  locale?: string;
  enabled?: boolean;
}

export interface UseCmsImageResult {
  record: CmsContentRecord | null;
  isLoading: boolean;
  isUploading: boolean;
  error: Error | null;
  refresh: () => Promise<CmsContentRecord | null>;
  upload: (
    input: Omit<CmsUploadImageInput, "usage" | "locale"> & { locale?: string }
  ) => Promise<{ recordId: string; url: string }>;
  remove: () => Promise<void>;
}
