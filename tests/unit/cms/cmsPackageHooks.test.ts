/* @vitest-environment jsdom */

import React from "react";
import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCmsContent } from "../../../packages/cms/src/hooks/useCmsContent";
import { useCmsEditMode } from "../../../packages/cms/src/hooks/useCmsEditMode";
import { useCmsImage } from "../../../packages/cms/src/hooks/useCmsImage";
import { useCmsLocale } from "../../../packages/cms/src/hooks/useCmsLocale";
import { CmsProvider } from "../../../packages/cms/src/providers/CmsProvider";
import type {
  CmsContentRecord,
  CmsTransport,
} from "../../../packages/cms/src/types";

function createTransportMock(): CmsTransport {
  return {
    getContent: vi.fn(),
    saveContent: vi.fn(),
    getImage: vi.fn(),
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
  };
}

function createWrapper(
  transport: CmsTransport,
  options?: {
    defaultLocale?: string;
    initialLocale?: string;
    initialEditMode?: boolean;
  }
) {
  return function Wrapper(props: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      CmsProvider,
      {
        transport,
        defaultLocale: options?.defaultLocale || "de",
        initialLocale: options?.initialLocale,
        initialEditMode: options?.initialEditMode,
      },
      props.children
    );
  };
}

describe("packages/cms hooks", () => {
  it("exposes locale and edit-mode state through CmsProvider", () => {
    const transport = createTransportMock();
    const { result } = renderHook(
      () => ({
        locale: useCmsLocale(),
        edit: useCmsEditMode(),
      }),
      {
        wrapper: createWrapper(transport, {
          initialLocale: "nl",
          initialEditMode: true,
        }),
      }
    );

    expect(result.current.locale.locale).toBe("nl");
    expect(result.current.locale.defaultLocale).toBe("de");
    expect(result.current.edit.isEditMode).toBe(true);

    act(() => {
      result.current.locale.setLocale("en");
      result.current.edit.toggleEditMode();
    });

    expect(result.current.locale.locale).toBe("en");
    expect(result.current.edit.isEditMode).toBe(false);
  });

  it("normalizes loaded content records and preserves metadata during save", async () => {
    const transport = createTransportMock();
    const initialRecord: CmsContentRecord = {
      recordId: "record-1",
      name: "",
      subtype: "text",
      locale: null,
      resolvedLocale: null,
      value: "Hallo",
      description: "About intro",
      status: "draft",
      customProperties: {
        emphasis: "warm",
      },
      fileUrl: null,
      imageMetadata: null,
    };
    const refreshedRecord: CmsContentRecord = {
      ...initialRecord,
      name: "home_about_title",
      locale: "en",
      value: "Hello there",
    };

    vi.mocked(transport.getContent)
      .mockResolvedValueOnce(initialRecord)
      .mockResolvedValueOnce(refreshedRecord);
    vi.mocked(transport.saveContent).mockResolvedValue({
      recordId: "record-1",
    });

    const { result } = renderHook(
      () =>
        useCmsContent({
          page: "home",
          section: "about",
          key: "title",
        }),
      {
        wrapper: createWrapper(transport, {
          initialLocale: "en",
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.record?.value).toBe("Hallo");
    });

    expect(result.current.record?.name).toBe("home_about_title");
    expect(result.current.record?.resolvedLocale).toBe("en");

    await act(async () => {
      await result.current.save({
        subtype: "text",
        value: "Hello there",
      });
    });

    expect(transport.saveContent).toHaveBeenCalledWith({
      recordId: "record-1",
      page: "home",
      section: "about",
      key: "title",
      locale: "en",
      subtype: "text",
      value: "Hello there",
      description: "About intro",
      status: "draft",
      customProperties: {
        emphasis: "warm",
      },
    });

    await waitFor(() => {
      expect(result.current.record?.value).toBe("Hello there");
    });
  });

  it("refreshes uploaded images and clears state on delete", async () => {
    const transport = createTransportMock();
    const emptyRecord: CmsContentRecord = {
      recordId: null,
      name: "home_about_image",
      subtype: "image",
      locale: null,
      resolvedLocale: null,
      value: null,
      description: undefined,
      status: undefined,
      customProperties: undefined,
      fileUrl: null,
      imageMetadata: null,
    };
    const uploadedRecord: CmsContentRecord = {
      ...emptyRecord,
      recordId: "image-1",
      fileUrl: "/uploads/about.jpg",
      imageMetadata: {
        contractVersion: "cms_image_v1",
        filename: "about.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 12,
        alt: "Panorama",
        usage: "home_about_image",
        localeMode: "agnostic",
      },
    };

    vi.mocked(transport.getImage)
      .mockResolvedValueOnce(emptyRecord)
      .mockResolvedValueOnce(uploadedRecord);
    vi.mocked(transport.uploadImage).mockResolvedValue({
      recordId: "image-1",
      url: "/uploads/about.jpg",
    });
    vi.mocked(transport.deleteImage).mockResolvedValue();

    const { result } = renderHook(
      () =>
        useCmsImage({
          usage: "home_about_image",
        }),
      {
        wrapper: createWrapper(transport),
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["image-bytes"], "about.jpg", {
      type: "image/jpeg",
    });

    await act(async () => {
      await expect(
        result.current.upload({
          file,
          alt: "Panorama",
        })
      ).resolves.toEqual({
        recordId: "image-1",
        url: "/uploads/about.jpg",
      });
    });

    expect(transport.uploadImage).toHaveBeenCalledWith({
      usage: "home_about_image",
      file,
      alt: "Panorama",
      locale: undefined,
    });

    await waitFor(() => {
      expect(result.current.record?.recordId).toBe("image-1");
    });

    await act(async () => {
      await result.current.remove();
    });

    expect(transport.deleteImage).toHaveBeenCalledWith({
      recordId: "image-1",
    });
    expect(result.current.record).toBeNull();
  });
});
