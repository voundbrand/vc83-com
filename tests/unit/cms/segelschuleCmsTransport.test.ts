import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSegelschuleCmsTransport } from "../../../apps/segelschule-altwarp/lib/cms-transport";

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

describe("createSegelschuleCmsTransport", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds locale, defaultLocale, and includeUnpublished when loading content", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      createJsonResponse({
        recordId: "record-1",
        name: "home_about_title",
        subtype: "text",
        locale: "en",
        resolvedLocale: "en",
        value: "Hello from CMS",
      })
    );

    const transport = createSegelschuleCmsTransport(() => ({
      includeUnpublished: true,
    }));

    await transport.getContent({
      page: "home",
      section: "about",
      key: "title",
      locale: "en",
      defaultLocale: "de",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cms/content?page=home&section=about&key=title&locale=en&defaultLocale=de&includeUnpublished=true",
      {
        cache: "no-store",
      }
    );
  });

  it("requires a recordId when saving content", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      createJsonResponse({
        recordId: null,
        name: "home_about_title",
        subtype: "text",
        locale: "en",
        resolvedLocale: "en",
        value: "Updated copy",
      })
    );

    const transport = createSegelschuleCmsTransport(() => ({
      includeUnpublished: false,
    }));

    await expect(
      transport.saveContent({
        page: "home",
        section: "about",
        key: "title",
        locale: "en",
        subtype: "text",
        value: "Updated copy",
      })
    ).rejects.toThrowError(/did not return a recordId/);
  });

  it("uploads image form data and maps the returned record", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      createJsonResponse({
        recordId: "image-1",
        name: "home_about_image",
        subtype: "image",
        locale: "de",
        resolvedLocale: "de",
        value: null,
        fileUrl: "/uploads/about.jpg",
      })
    );

    const transport = createSegelschuleCmsTransport(() => ({
      includeUnpublished: false,
    }));
    const file = new File(["image-bytes"], "about.jpg", {
      type: "image/jpeg",
    });

    await expect(
      transport.uploadImage({
        usage: "home_about_image",
        file,
        alt: "Panorama",
        locale: "de",
      })
    ).resolves.toEqual({
      recordId: "image-1",
      url: "/uploads/about.jpg",
    });

    const [url, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/cms/image");
    expect(requestInit?.method).toBe("POST");
    expect(requestInit?.body).toBeInstanceOf(FormData);
    const formData = requestInit?.body as FormData;
    expect(formData.get("usage")).toBe("home_about_image");
    expect(formData.get("alt")).toBe("Panorama");
    expect(formData.get("locale")).toBe("de");
    expect(formData.get("file")).toBe(file);
  });

  it("surfaces API error payloads when deleting an image fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: "Editor session required",
        },
        {
          status: 401,
        }
      )
    );

    const transport = createSegelschuleCmsTransport(() => ({
      includeUnpublished: false,
    }));

    await expect(
      transport.deleteImage({
        recordId: "image-1",
      })
    ).rejects.toThrowError(/Editor session required/);
  });
});
