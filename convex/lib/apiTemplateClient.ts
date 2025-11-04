/**
 * API TEMPLATE.IO HTTP CLIENT
 *
 * Client for generating PDFs via API Template.io REST API.
 * Based on existing value calculator implementation.
 *
 * Documentation: https://docs.apitemplate.io/
 */

const API_TEMPLATE_BASE_URL = "https://rest.apitemplate.io/v2";

/**
 * Request to generate PDF URL
 */
export interface GeneratePdfUrlRequest {
  template_id: string;
  data: Record<string, unknown>;
  settings?: {
    output_file?: string; // Custom filename (without extension)
    export_type?: "json" | "file" | "base64"; // Response format
    expiration?: number; // URL expiration in minutes (default: 5)
    output_format?: "pdf" | "png" | "jpg"; // Output format
  };
}

/**
 * Response from PDF generation
 */
export interface GeneratePdfUrlResponse {
  status: "success" | "error";
  download_url?: string; // URL to download generated PDF
  download_url_png?: string; // URL for PNG version (if requested)
  transaction_ref?: string; // Transaction reference for tracking
  error?: string; // Error message if status is "error"
  message?: string; // Additional info
}

/**
 * Generate PDF and get download URL
 *
 * @param apiKey - API Template.io API key from environment
 * @param request - PDF generation request
 * @returns Response with download URL
 * @throws Error if API request fails
 */
export async function generatePdfUrl(
  apiKey: string,
  request: GeneratePdfUrlRequest
): Promise<GeneratePdfUrlResponse> {
  const url = `${API_TEMPLATE_BASE_URL}/create-pdf-url`;

  console.log(`📤 API Template.io: Generating PDF for template ${request.template_id}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Template.io error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(
      `API Template.io request failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result: GeneratePdfUrlResponse = await response.json();

  if (result.status === "error") {
    console.error(`❌ API Template.io returned error:`, result.error);
    throw new Error(`API Template.io error: ${result.error || "Unknown error"}`);
  }

  console.log(`✅ PDF generated successfully. Transaction: ${result.transaction_ref}`);
  console.log(`🔗 Download URL: ${result.download_url}`);

  return result;
}

/**
 * Generate PDF and download as base64
 *
 * Useful for storing PDF content directly in database
 */
export async function generatePdfBase64(
  apiKey: string,
  templateId: string,
  data: Record<string, unknown>,
  filename?: string
): Promise<string> {
  const response = await generatePdfUrl(apiKey, {
    template_id: templateId,
    data,
    settings: {
      export_type: "base64",
      output_file: filename,
    },
  });

  if (!response.download_url) {
    throw new Error("No base64 data returned from API Template.io");
  }

  // Response is base64 encoded PDF
  return response.download_url;
}

/**
 * List available templates (requires different endpoint)
 *
 * Note: This endpoint may require different permissions
 */
export async function listTemplates(apiKey: string): Promise<unknown> {
  const url = `${API_TEMPLATE_BASE_URL}/list-templates`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list templates: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get template information
 */
export async function getTemplateInfo(
  apiKey: string,
  templateId: string
): Promise<unknown> {
  const url = `${API_TEMPLATE_BASE_URL}/get-template`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ template_id: templateId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get template info: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Helper: Validate API key is configured
 */
export function validateApiKey(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey || apiKey === "") {
    throw new Error(
      "API_TEMPLATE_IO_KEY environment variable is not configured. " +
      "Add it to your Convex environment: npx convex env set API_TEMPLATE_IO_KEY your-key-here"
    );
  }
}
