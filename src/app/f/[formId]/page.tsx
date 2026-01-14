/**
 * PUBLIC FORM PAGE
 *
 * URL: /f/{formId}
 *
 * This is a public-facing page where users can fill out and submit forms.
 * Forms can be rendered with or without templates:
 * - With template: Uses the template component with theme
 * - Without template: Uses a generic form renderer
 */

// Force dynamic rendering for dynamic routes
export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { PublicFormClient } from "./public-form-client";

type Props = {
  params: Promise<{
    formId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formId } = await params;

  return {
    title: `Form`,
    description: `Submit form ${formId}`,
  };
}

export default async function PublicFormPage({ params }: Props) {
  const { formId } = await params;

  return <PublicFormClient formId={formId} />;
}
