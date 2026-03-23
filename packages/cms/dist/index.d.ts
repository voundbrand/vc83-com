import * as react_jsx_runtime from 'react/jsx-runtime';
import React, { ReactNode } from 'react';

type CmsContentSubtype = "text" | "text_with_links" | "image" | (string & {});
type CmsContentValue = string | Record<string, unknown> | null;
type CmsContentLinkIcon = "external" | "download" | "music" | "video" | "document" | "link" | "play" | "info";
interface CmsContentLink {
    id: string;
    title: string;
    url: string;
    icon?: CmsContentLinkIcon;
}
interface CmsTextWithLinksValue {
    text: string;
    links?: CmsContentLink[];
}
interface CmsImageMetadata {
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
interface CmsContentRecord {
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
interface CmsGetContentInput {
    page: string;
    section: string;
    key: string;
    locale: string;
    defaultLocale: string;
}
interface CmsSaveContentInput {
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
interface CmsGetImageInput {
    usage: string;
    locale?: string;
}
interface CmsUploadImageInput {
    usage: string;
    file: File;
    alt?: string;
    locale?: string;
}
interface CmsTransport {
    getContent(input: CmsGetContentInput): Promise<CmsContentRecord>;
    saveContent(input: CmsSaveContentInput): Promise<{
        recordId: string;
    }>;
    getImage(input: CmsGetImageInput): Promise<CmsContentRecord>;
    uploadImage(input: CmsUploadImageInput): Promise<{
        recordId: string;
        url: string;
    }>;
    deleteImage(input: {
        recordId: string;
    }): Promise<void>;
}
interface CmsContextValue {
    transport: CmsTransport;
    locale: string;
    defaultLocale: string;
    isEditMode: boolean;
    setLocale: (locale: string) => void;
    setEditMode: (enabled: boolean) => void;
    toggleEditMode: () => void;
}
interface CmsProviderProps {
    children: ReactNode;
    transport: CmsTransport;
    defaultLocale: string;
    initialLocale?: string;
    initialEditMode?: boolean;
}
interface CmsLocaleState {
    locale: string;
    defaultLocale: string;
    setLocale: (locale: string) => void;
}
interface CmsEditModeState {
    isEditMode: boolean;
    setEditMode: (enabled: boolean) => void;
    toggleEditMode: () => void;
}
interface UseCmsContentOptions {
    page: string;
    section: string;
    key: string;
    locale?: string;
    defaultLocale?: string;
    enabled?: boolean;
}
interface UseCmsContentResult {
    record: CmsContentRecord | null;
    isLoading: boolean;
    isSaving: boolean;
    error: Error | null;
    refresh: () => Promise<CmsContentRecord | null>;
    save: (input: Omit<CmsSaveContentInput, "page" | "section" | "key" | "locale"> & {
        locale?: string;
    }) => Promise<{
        recordId: string;
    }>;
}
interface UseCmsImageOptions {
    usage: string;
    locale?: string;
    enabled?: boolean;
}
interface UseCmsImageResult {
    record: CmsContentRecord | null;
    isLoading: boolean;
    isUploading: boolean;
    error: Error | null;
    refresh: () => Promise<CmsContentRecord | null>;
    upload: (input: Omit<CmsUploadImageInput, "usage" | "locale"> & {
        locale?: string;
    }) => Promise<{
        recordId: string;
        url: string;
    }>;
    remove: () => Promise<void>;
}

declare function CmsProvider({ children, transport, defaultLocale, initialLocale, initialEditMode, }: CmsProviderProps): react_jsx_runtime.JSX.Element;
declare function useCms(): CmsContextValue;

interface EditableContentProps {
    page: string;
    section: string;
    contentKey: string;
    fallback?: React.ReactNode;
    className?: string;
    as?: React.ElementType;
    allowLineBreaks?: boolean;
    subtype?: Exclude<CmsContentSubtype, "image" | "text_with_links">;
}
declare function EditableContent({ page, section, contentKey, fallback, className, as: Component, allowLineBreaks, subtype, }: EditableContentProps): react_jsx_runtime.JSX.Element;
declare function EditableText(props: Omit<EditableContentProps, "as">): react_jsx_runtime.JSX.Element;
declare function EditableHeading(props: Omit<EditableContentProps, "as"> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}): react_jsx_runtime.JSX.Element;
declare function EditableParagraph(props: Omit<EditableContentProps, "as" | "allowLineBreaks">): react_jsx_runtime.JSX.Element;

interface EditableImageProps {
    usage: string;
    fallbackSrc?: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
    fill?: boolean;
    isHeroBackground?: boolean;
    locale?: string;
}
declare function EditableImage({ usage, fallbackSrc, alt, className, width, height, aspectRatio, fill, isHeroBackground, locale, }: EditableImageProps): react_jsx_runtime.JSX.Element;

interface EditableTextWithLinksProps {
    page: string;
    section: string;
    contentKey: string;
    fallback?: React.ReactNode;
    className?: string;
    textClassName?: string;
    linksClassName?: string;
    as?: React.ElementType;
    allowLineBreaks?: boolean;
}
declare function EditableTextWithLinks({ page, section, contentKey, fallback, className, textClassName, linksClassName, as: TextComponent, allowLineBreaks, }: EditableTextWithLinksProps): react_jsx_runtime.JSX.Element;
declare function EditableParagraphWithLinks(props: Omit<EditableTextWithLinksProps, "as" | "allowLineBreaks">): react_jsx_runtime.JSX.Element;

interface LinkButtonEditorProps {
    link: CmsContentLink;
    onSave: (link: CmsContentLink) => void;
    onDelete: () => void;
    onCancel: () => void;
}
declare function LinkButtonEditor({ link, onSave, onDelete, onCancel, }: LinkButtonEditorProps): react_jsx_runtime.JSX.Element;

declare function useCmsContent(options: UseCmsContentOptions): UseCmsContentResult;

declare function useCmsEditMode(): CmsEditModeState;

declare function useCmsImage(options: UseCmsImageOptions): UseCmsImageResult;

declare function useCmsLocale(): CmsLocaleState;

export { type CmsContentLink, type CmsContentLinkIcon, type CmsContentRecord, type CmsContentValue, type CmsContextValue, type CmsEditModeState, type CmsGetContentInput, type CmsGetImageInput, type CmsImageMetadata, type CmsLocaleState, CmsProvider, type CmsProviderProps, type CmsSaveContentInput, type CmsTextWithLinksValue, type CmsTransport, type CmsUploadImageInput, EditableContent, EditableHeading, EditableImage, EditableParagraph, EditableParagraphWithLinks, EditableText, EditableTextWithLinks, LinkButtonEditor, type UseCmsContentOptions, type UseCmsContentResult, type UseCmsImageOptions, type UseCmsImageResult, useCms, useCmsContent, useCmsEditMode, useCmsImage, useCmsLocale };
