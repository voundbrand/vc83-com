/**
 * Compliance App - Convert Legal Markdown Documents to PDFs
 *
 * This module provides backend functions for the Compliance app,
 * which allows you to paste markdown content and convert it to a
 * beautiful PDF using the existing apitemplate.io infrastructure.
 *
 * PDFs are stored in the organizationMedia table for access in the Media Library.
 */

import { action, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Convert markdown content to PDF and store in media library
 *
 * This action:
 * 1. Takes markdown content as input
 * 2. Converts it to HTML
 * 3. Uses apitemplate.io to generate a PDF
 * 4. Downloads the PDF
 * 5. Stores it in Convex Storage
 * 6. Creates organizationMedia record
 * 7. Returns media object with URL
 *
 * @param sessionId - User session
 * @param organizationId - Organization context
 * @param markdownContent - The markdown text to convert
 * @param documentTitle - Title for the PDF document
 * @returns Object with media ID, URL, and metadata
 */
export const convertMarkdownToPdf = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    markdownContent: v.string(),
    documentTitle: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    mediaId: any;
    url: string | null;
    documentTitle: string;
    generatedAt: number;
    sizeBytes: number;
  }> => {
    const { sessionId, organizationId, markdownContent, documentTitle } = args;

    // Verify authentication using internal query
    const sessionData = await ctx.runQuery(api.compliance.verifySession, {
      sessionId,
      organizationId,
    });

    // Get API Template.io API key from environment
    const apiKey = process.env.API_TEMPLATE_IO_KEY;
    if (!apiKey) {
      throw new Error(
        "API Template.io API key not configured. Please set API_TEMPLATE_IO_KEY in environment variables."
      );
    }

    // Convert markdown to HTML
    const html = convertMarkdownToHtml(markdownContent, documentTitle);

    // Log HTML for debugging (first 500 chars)
    console.log("Generated HTML preview:", html.substring(0, 500));

    // Generate PDF using apitemplate.io
    const requestBody = {
      body: html,
      css: `<style>${getComplianceDocumentCss()}</style>`, // CSS wrapped in style tags per API spec
      settings: {
        paper_size: "A4",
        orientation: "1", // portrait
        margin_top: "15mm",
        margin_bottom: "15mm",
        margin_left: "20mm",
        margin_right: "20mm",
        print_background: true, // Enable background colors/gradients
      },
    };

    console.log("Calling apitemplate.io with settings:", JSON.stringify(requestBody.settings));

    const response = await fetch(
      "https://rest.apitemplate.io/v2/create-pdf-from-html",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("apitemplate.io error response:", errorText.substring(0, 1000));
      throw new Error(
        `Failed to generate PDF: ${response.status}. API Template may be experiencing issues. Please try again in a few minutes.`
      );
    }

    const result = await response.json();
    console.log("PDF generated successfully:", result.transaction_ref);

    // Download the PDF from apitemplate.io
    const pdfResponse = await fetch(result.download_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
    }

    const pdfBlob = await pdfResponse.blob();
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();

    // Upload to Convex Storage
    const storageId = await ctx.storage.store(
      new Blob([pdfArrayBuffer], { type: "application/pdf" })
    );

    // Create organizationMedia record
    const mediaData: { mediaId: any; url: string | null } = await ctx.runMutation(internal.compliance.saveCompliancePdf, {
      sessionId,
      organizationId,
      userId: sessionData.userId,
      storageId,
      documentTitle,
      sizeBytes: pdfArrayBuffer.byteLength,
    });

    return {
      success: true,
      mediaId: mediaData.mediaId,
      url: mediaData.url,
      documentTitle,
      generatedAt: Date.now(),
      sizeBytes: pdfArrayBuffer.byteLength,
    };
  },
});

/**
 * Verify session and organization
 *
 * Internal query to validate session and get user ID
 */
export const verifySession = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    // Find session
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();

    if (!session || !session.userId) {
      throw new Error("Invalid session. Please log in again.");
    }

    // Get organization
    const org = await ctx.db.get(organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      userId: session.userId,
      organizationId: org._id,
    };
  },
});

/**
 * Save compliance PDF to organizationMedia table
 *
 * Internal mutation called by convertMarkdownToPdf action
 * Stores PDF in media library with category="compliance"
 */
export const saveCompliancePdf = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    documentTitle: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    // Create organizationMedia record with category="compliance"
    const mediaId = await ctx.db.insert("organizationMedia", {
      organizationId: args.organizationId,
      uploadedBy: args.userId,
      storageId: args.storageId,
      filename: `${args.documentTitle}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: args.sizeBytes,
      category: "compliance", // NEW category for compliance PDFs
      tags: ["compliance", "legal", "generated"],
      description: `Compliance document: ${args.documentTitle}`,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get the URL for the uploaded PDF
    const url = await ctx.storage.getUrl(args.storageId);

    console.log("Compliance PDF stored in media library:", {
      mediaId,
      organizationId: args.organizationId,
      documentTitle: args.documentTitle,
      userId: args.userId,
      sizeBytes: args.sizeBytes,
    });

    return {
      mediaId,
      url,
    };
  },
});

/**
 * Get all compliance PDFs for an organization
 *
 * Query organizationMedia with category="compliance"
 */
export const getComplianceDocuments = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    // Query organizationMedia with category="compliance"
    const media = await ctx.db
      .query("organizationMedia")
      .withIndex("by_organization_and_category", (q) =>
        q.eq("organizationId", organizationId).eq("category", "compliance")
      )
      .order("desc")
      .collect();

    // Get URLs for all media
    const mediaWithUrls = await Promise.all(
      media.map(async (m) => {
        let url = null;
        if (m.storageId) {
          url = await ctx.storage.getUrl(m.storageId);
        }
        return {
          ...m,
          url,
        };
      })
    );

    return mediaWithUrls;
  },
});

/**
 * Get a single compliance PDF by media ID
 */
export const getComplianceDocument = query({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, { mediaId }) => {
    const media = await ctx.db.get(mediaId);

    if (!media || media.category !== "compliance") {
      throw new Error("Compliance document not found");
    }

    let url = null;
    if (media.storageId) {
      url = await ctx.storage.getUrl(media.storageId);
    }

    return {
      ...media,
      url,
    };
  },
});

/**
 * Convert markdown to HTML with professional formatting
 *
 * Handles:
 * - Headers (h1-h4)
 * - Bold, italic, code
 * - Unordered and ordered lists
 * - Tables with proper header detection
 * - Paragraphs
 * - Horizontal rules
 * - Line breaks
 */
function convertMarkdownToHtml(markdown: string, title: string): string {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;
  let inTable = false;
  let tableRows: string[] = [];
  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Empty line - end current paragraph or list
    if (trimmedLine === '') {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (inOrderedList) {
        html += '</ol>\n';
        inOrderedList = false;
      }
      if (inTable) {
        html += convertTableToHtml(tableRows);
        tableRows = [];
        inTable = false;
      }
      continue;
    }

    // Headers
    if (trimmedLine.startsWith('# ')) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      html += `<h1>${processInlineFormatting(trimmedLine.slice(2))}</h1>\n`;
      continue;
    }
    if (trimmedLine.startsWith('## ')) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      html += `<h2>${processInlineFormatting(trimmedLine.slice(3))}</h2>\n`;
      continue;
    }
    if (trimmedLine.startsWith('### ')) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      html += `<h3>${processInlineFormatting(trimmedLine.slice(4))}</h3>\n`;
      continue;
    }
    if (trimmedLine.startsWith('#### ')) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      html += `<h4>${processInlineFormatting(trimmedLine.slice(5))}</h4>\n`;
      continue;
    }

    // Horizontal rule
    if (trimmedLine === '---' || trimmedLine === '***') {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      html += '<hr />\n';
      continue;
    }

    // Tables
    if (trimmedLine.includes('|')) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      inTable = true;
      tableRows.push(trimmedLine);
      continue;
    } else if (inTable) {
      html += convertTableToHtml(tableRows);
      tableRows = [];
      inTable = false;
    }

    // Unordered lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `  <li>${processInlineFormatting(trimmedLine.slice(2))}</li>\n`;
      continue;
    } else if (inList) {
      html += '</ul>\n';
      inList = false;
    }

    // Ordered lists
    const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      if (currentParagraph) {
        html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
        currentParagraph = '';
      }
      if (!inOrderedList) {
        html += '<ol>\n';
        inOrderedList = true;
      }
      html += `  <li>${processInlineFormatting(orderedMatch[2])}</li>\n`;
      continue;
    } else if (inOrderedList) {
      html += '</ol>\n';
      inOrderedList = false;
    }

    // Regular paragraph text
    if (currentParagraph) {
      currentParagraph += ' ' + trimmedLine;
    } else {
      currentParagraph = trimmedLine;
    }
  }

  // Close any remaining open elements
  if (currentParagraph) {
    html += `<p>${processInlineFormatting(currentParagraph)}</p>\n`;
  }
  if (inList) {
    html += '</ul>\n';
  }
  if (inOrderedList) {
    html += '</ol>\n';
  }
  if (inTable) {
    html += convertTableToHtml(tableRows);
  }

  // Wrap in HTML structure
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1 class="title">${escapeHtml(title)}</h1>
            <div class="meta">Generated: ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</div>
          </div>
          <div class="content">
            ${html}
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Process inline formatting (bold, italic, code)
 * Simplified for better compatibility with PDF renderers
 */
function processInlineFormatting(text: string): string {
  let result = escapeHtml(text);

  // Inline code first (`code`) - escape the content
  result = result.replace(/`([^`]+?)`/g, (match, code) => {
    return `<code>${code}</code>`;
  });

  // Bold text (**text** or __text__)
  result = result.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+?)__/g, '<strong>$1</strong>');

  // Italic text - simpler pattern without lookbehind (not supported in all engines)
  result = result.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
  result = result.replace(/_([^_]+?)_/g, '<em>$1</em>');

  return result;
}

/**
 * Convert markdown table to HTML table
 * Simplified for better PDF renderer compatibility
 */
function convertTableToHtml(rows: string[]): string {
  if (rows.length === 0) return '';

  let html = '<table>\n';
  let isFirstRow = true;
  let hasHeaderSeparator = false;

  // Check if second row is a separator (|---|---|)
  if (rows.length > 1 && rows[1].trim().match(/^\|[\s\-:|]+\|$/)) {
    hasHeaderSeparator = true;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].trim();

    // Skip separator row
    if (row.match(/^\|[\s\-:|]+\|$/)) {
      continue;
    }

    // Skip empty rows
    if (!row) continue;

    // Split cells and clean up
    const cells = row
      .split('|')
      .filter(cell => cell.trim()) // Remove empty cells
      .map(cell => cell.trim());

    if (cells.length === 0) continue;

    // First row is header if there's a separator
    if (isFirstRow && hasHeaderSeparator) {
      html += '  <thead>\n    <tr>\n';
      cells.forEach(cell => {
        html += `      <th>${escapeHtml(cell)}</th>\n`;
      });
      html += '    </tr>\n  </thead>\n  <tbody>\n';
      isFirstRow = false;
    } else {
      if (isFirstRow) {
        html += '  <tbody>\n';
        isFirstRow = false;
      }
      html += '    <tr>\n';
      cells.forEach(cell => {
        html += `      <td>${escapeHtml(cell)}</td>\n`;
      });
      html += '    </tr>\n';
    }
  }

  html += '  </tbody>\n</table>\n';
  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ===========================================
// GDPR DATA EXPORT & PERMANENT DELETION
// ===========================================

/**
 * Export all user data for GDPR compliance
 *
 * Gathers ALL user data across the platform:
 * - User profile information
 * - Organization memberships
 * - CRM contacts & organizations
 * - Invoices & transactions
 * - Media files
 * - Workflows
 * - Projects
 * - And more...
 *
 * Returns data as a JSON structure that can be downloaded
 */
export const exportUserData = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    exportData: {
      exportedAt: string;
      userId: string;
      email: string;
      profile: Record<string, unknown>;
      organizations: Array<Record<string, unknown>>;
      crmContacts: Array<Record<string, unknown>>;
      crmOrganizations: Array<Record<string, unknown>>;
      invoices: Array<Record<string, unknown>>;
      transactions: Array<Record<string, unknown>>;
      media: Array<Record<string, unknown>>;
      workflows: Array<Record<string, unknown>>;
      projects: Array<Record<string, unknown>>;
      templates: Array<Record<string, unknown>>;
      events: Array<Record<string, unknown>>;
      forms: Array<Record<string, unknown>>;
      auditLogs: Array<Record<string, unknown>>;
    };
  }> => {
    // Verify session
    const session = await ctx.runQuery(internal.auth.getSessionById, {
      sessionId: args.sessionId,
    });

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    const userId = session.userId;

    // Gather all user data using internal query
    const exportData = await ctx.runQuery(internal.compliance.gatherUserDataForExport, {
      userId,
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId,
      organizationId: undefined,
      action: "export_user_data",
      resource: "compliance",
      success: true,
      metadata: { dataExported: true, exportedAt: new Date().toISOString() },
    });

    return {
      success: true,
      exportData,
    };
  },
});

/**
 * Internal query to gather all user data for export
 */
export const gatherUserDataForExport = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's organizations
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const organizationIds = memberships.map((m) => m.organizationId);

    // Gather data from each organization
    const organizations = [];
    const allCrmContacts = [];
    const allCrmOrganizations = [];
    const allInvoices = [];
    const allTransactions = [];
    const allMedia = [];
    const allWorkflows = [];
    const allProjects = [];
    const allTemplates = [];
    const allEvents = [];
    const allForms = [];

    for (const orgId of organizationIds) {
      const org = await ctx.db.get(orgId);
      if (!org) continue;

      const role = memberships.find((m) => m.organizationId === orgId);
      const roleData = role ? await ctx.db.get(role.role) : null;

      organizations.push({
        id: org._id,
        name: org.name,
        slug: org.slug,
        role: roleData?.name || "unknown",
        joinedAt: role?.joinedAt,
      });

      // CRM Contacts (objects with type="crm_contact")
      const contacts = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "crm_contact")
        )
        .collect();
      allCrmContacts.push(...contacts.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        status: c.status,
        customProperties: c.customProperties,
        createdAt: c.createdAt,
        organizationName: org.name,
      })));

      // CRM Organizations (objects with type="crm_organization")
      const crmOrgs = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "crm_organization")
        )
        .collect();
      allCrmOrganizations.push(...crmOrgs.map((o) => ({
        id: o._id,
        name: o.name,
        description: o.description,
        status: o.status,
        customProperties: o.customProperties,
        createdAt: o.createdAt,
        organizationName: org.name,
      })));

      // Invoices (objects with type="invoice")
      const invoices = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "invoice")
        )
        .collect();
      allInvoices.push(...invoices.map((i) => ({
        id: i._id,
        name: i.name,
        description: i.description,
        status: i.status,
        customProperties: i.customProperties,
        createdAt: i.createdAt,
        organizationName: org.name,
      })));

      // Transactions (objects with type="transaction")
      const transactions = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "transaction")
        )
        .collect();
      allTransactions.push(...transactions.map((t) => ({
        id: t._id,
        name: t.name,
        description: t.description,
        status: t.status,
        customProperties: t.customProperties,
        createdAt: t.createdAt,
        organizationName: org.name,
      })));

      // Media (organizationMedia table - not in objects)
      const media = await ctx.db
        .query("organizationMedia")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
        .collect();
      allMedia.push(...media.map((m) => ({
        id: m._id,
        filename: m.filename,
        category: m.category,
        description: m.description,
        createdAt: m.createdAt,
        organizationName: org.name,
      })));

      // Workflows (objects with type="workflow")
      const workflows = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "workflow")
        )
        .collect();
      allWorkflows.push(...workflows.map((w) => ({
        id: w._id,
        name: w.name,
        description: w.description,
        status: w.status,
        customProperties: w.customProperties,
        createdAt: w.createdAt,
        organizationName: org.name,
      })));

      // Projects (objects with type="project")
      const projects = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "project")
        )
        .collect();
      allProjects.push(...projects.map((p) => ({
        id: p._id,
        name: p.name,
        description: p.description,
        status: p.status,
        customProperties: p.customProperties,
        createdAt: p.createdAt,
        organizationName: org.name,
      })));

      // Templates (objects with type="template")
      const templates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "template")
        )
        .collect();
      allTemplates.push(...templates.map((t) => ({
        id: t._id,
        name: t.name,
        description: t.description,
        status: t.status,
        customProperties: t.customProperties,
        createdAt: t.createdAt,
        organizationName: org.name,
      })));

      // Events (objects with type="event")
      const events = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "event")
        )
        .collect();
      allEvents.push(...events.map((e) => ({
        id: e._id,
        name: e.name,
        description: e.description,
        status: e.status,
        customProperties: e.customProperties,
        createdAt: e.createdAt,
        organizationName: org.name,
      })));

      // Forms (objects with type="form")
      const forms = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", orgId).eq("type", "form")
        )
        .collect();
      allForms.push(...forms.map((f) => ({
        id: f._id,
        name: f.name,
        description: f.description,
        status: f.status,
        customProperties: f.customProperties,
        createdAt: f.createdAt,
        organizationName: org.name,
      })));
    }

    // Get audit logs for this user
    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(1000); // Limit to last 1000 entries

    return {
      exportedAt: new Date().toISOString(),
      userId: args.userId,
      email: user.email,
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive,
      },
      organizations,
      crmContacts: allCrmContacts,
      crmOrganizations: allCrmOrganizations,
      invoices: allInvoices,
      transactions: allTransactions,
      media: allMedia,
      workflows: allWorkflows,
      projects: allProjects,
      templates: allTemplates,
      events: allEvents,
      forms: allForms,
      auditLogs: auditLogs.map((log) => ({
        action: log.action,
        resource: log.resource,
        success: log.success,
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
    };
  },
});

/**
 * Permanently delete account IMMEDIATELY (bypasses grace period)
 *
 * Requirements before calling:
 * 1. User must have exported their data
 * 2. User must confirm they have their data
 * 3. User must type confirmation text
 *
 * This action:
 * 1. Archives all owned organizations
 * 2. Removes from all organizations
 * 3. Deletes user password
 * 4. Deletes all sessions
 * 5. Sets isActive = false immediately
 */
export const permanentlyDeleteAccountImmediate = action({
  args: {
    sessionId: v.string(),
    confirmationText: v.string(), // Must be "PERMANENTLY DELETE"
    dataExportConfirmed: v.boolean(), // Must be true
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Validate confirmation
    if (args.confirmationText !== "PERMANENTLY DELETE") {
      throw new Error("Invalid confirmation text. Please type 'PERMANENTLY DELETE' exactly.");
    }

    if (!args.dataExportConfirmed) {
      throw new Error("You must confirm that you have exported your data before permanent deletion.");
    }

    // Verify session
    const session = await ctx.runQuery(internal.auth.getSessionById, {
      sessionId: args.sessionId,
    });

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    const userId = session.userId;

    // Get user email for audit log
    const user = await ctx.runQuery(internal.compliance.getUserForDeletion, {
      userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Execute immediate permanent deletion
    await ctx.runMutation(internal.compliance.executeImmediateDeletion, {
      userId,
    });

    // Log audit event (before deleting session)
    await ctx.runMutation(internal.rbac.logAudit, {
      userId,
      organizationId: undefined,
      action: "permanent_delete_account_immediate",
      resource: "compliance",
      success: true,
      metadata: {
        email: user.email,
        deletedAt: new Date().toISOString(),
        bypassedGracePeriod: true,
        dataExportConfirmed: true,
      },
    });

    // Delete all sessions for this user
    await ctx.runMutation(internal.compliance.deleteAllUserSessions, {
      userId,
    });

    return { success: true };
  },
});

/**
 * Internal query to get user for deletion
 */
export const getUserForDeletion = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Internal mutation to execute immediate permanent deletion
 */
export const executeImmediateDeletion = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    console.log(`[COMPLIANCE] Executing immediate permanent deletion for: ${user.email}`);

    // 1. Archive all organizations owned by this user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const membership of memberships) {
      const org = await ctx.db.get(membership.organizationId);
      if (!org) continue;

      const role = await ctx.db.get(membership.role);
      if (role?.name === "org_owner" || role?.name === "enterprise_owner") {
        // Archive the organization
        await ctx.db.patch(membership.organizationId, {
          isActive: false,
          updatedAt: Date.now(),
        });
        console.log(`[COMPLIANCE] Archived organization: ${org.name}`);
      }
    }

    // 2. Remove from all organizations
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
      console.log(`[COMPLIANCE] Removed membership: ${membership._id}`);
    }

    // 3. Delete user password
    const userPassword = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (userPassword) {
      await ctx.db.delete(userPassword._id);
      console.log(`[COMPLIANCE] Deleted user password`);
    }

    // 4. Delete passkeys
    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId))
      .collect();

    for (const passkey of passkeys) {
      await ctx.db.delete(passkey._id);
      console.log(`[COMPLIANCE] Deleted passkey: ${passkey._id}`);
    }

    // 5. DELETE the user record entirely (true hard delete)
    await ctx.db.delete(args.userId);

    console.log(`[COMPLIANCE] ✅ User record DELETED from database: ${user.email}`);
  },
});

/**
 * Internal mutation to delete all user sessions
 */
export const deleteAllUserSessions = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    console.log(`[COMPLIANCE] Deleted ${sessions.length} sessions for user`);
  },
});

/**
 * Get CSS for professional legal document styling
 * Simplified for better PDF renderer compatibility
 */
function getComplianceDocumentCss(): string {
  return `
    body {
      font-family: Georgia, Times, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #2A2A2A;
      margin: 0;
      padding: 0;
    }

    .document {
      max-width: 100%;
    }

    .header {
      border-bottom: 2px solid #6B46C1;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }

    .title {
      font-size: 20pt;
      font-weight: bold;
      color: #6B46C1;
      margin: 0 0 10px 0;
    }

    .meta {
      font-size: 9pt;
      color: #666666;
      font-style: italic;
    }

    .content {
      margin-top: 20px;
    }

    h1 {
      font-size: 16pt;
      font-weight: bold;
      color: #6B46C1;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 1px solid #CCCCCC;
      padding-bottom: 8px;
    }

    h2 {
      font-size: 14pt;
      font-weight: bold;
      color: #2A2A2A;
      margin-top: 25px;
      margin-bottom: 12px;
    }

    h3 {
      font-size: 12pt;
      font-weight: bold;
      color: #2A2A2A;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    h4 {
      font-size: 11pt;
      font-weight: bold;
      color: #666666;
      margin-top: 15px;
      margin-bottom: 8px;
    }

    p {
      margin: 10px 0;
      text-align: justify;
    }

    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }

    li {
      margin: 5px 0;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }

    th, td {
      border: 1px solid #CCCCCC;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #F3F4F6;
      font-weight: bold;
      color: #6B46C1;
    }

    strong {
      font-weight: bold;
    }

    em {
      font-style: italic;
    }

    code {
      font-family: Courier, monospace;
      background-color: #F3F4F6;
      padding: 2px 4px;
      font-size: 10pt;
    }

    hr {
      border: none;
      border-top: 1px solid #CCCCCC;
      margin: 20px 0;
    }
  `;
}
