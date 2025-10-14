/**
 * PUBLIC PAGE ROUTE
 *
 * Renders published pages created through the Web Publishing app.
 * This route is publicly accessible and doesn't require authentication.
 *
 * URL: /p/[orgSlug]/[pageSlug]
 * Example: /p/acme-corp/our-amazing-product
 */

import { api } from "../../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { getTemplateComponent, getTheme } from "@/templates/registry";

interface PageParams {
  orgSlug: string;
  pageSlug: string;
}

export default async function PublicPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgSlug, pageSlug } = await params;

  // Fetch the published page by org slug and page slug
  const result = await fetchQuery(api.publishingOntology.getPublishedPageBySlug, {
    orgSlug,
    pageSlug,
  });

  // If page not found or not published, show 404
  if (!result || result.page.status !== "published") {
    notFound();
  }

  const { page, data, organization } = result;

  // Get template and theme codes
  const templateCode = page.customProperties?.templateCode as string;
  const themeCode = page.customProperties?.themeCode as string;

  if (!templateCode || !themeCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Error</h1>
          <p className="text-gray-600">This page is missing template or theme configuration.</p>
        </div>
      </div>
    );
  }

  try {
    // Get template component and theme
    const TemplateComponent = getTemplateComponent(templateCode);
    const theme = getTheme(themeCode);

    // Render the template with page data
    // Type assertion: we know the page has the required customProperties from the query
    return (
      <TemplateComponent
        page={page as import("@/templates/types").PublishedPage}
        data={data as import("@/templates/types").SourceData}
        organization={organization as import("@/templates/types").Organization}
        theme={theme}
      />
    );
  } catch (error) {
    console.error("[Public Page] Error rendering template:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Rendering Error</h1>
          <p className="text-gray-600">Unable to render this page. Please contact support.</p>
        </div>
      </div>
    );
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgSlug, pageSlug } = await params;

  const result = await fetchQuery(api.publishingOntology.getPublishedPageBySlug, {
    orgSlug,
    pageSlug,
  });

  if (!result) {
    return {
      title: "Page Not Found",
    };
  }

  const { page } = result;

  return {
    title: page.customProperties?.metaTitle || page.name,
    description: page.customProperties?.metaDescription || "",
    openGraph: {
      title: page.customProperties?.metaTitle || page.name,
      description: page.customProperties?.metaDescription || "",
      url: page.customProperties?.publicUrl as string,
    },
  };
}
