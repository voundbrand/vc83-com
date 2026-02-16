/**
 * PROJECT DRAWER MAGIC LINK API
 *
 * POST /api/auth/project-drawer
 *
 * Handles magic link requests for project drawer authentication.
 * Validates contact email, generates token, and sends magic link email.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

// Get the app URL from environment or default
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://l4yercak3.com";
}

// Generate magic link email HTML
function generateMagicLinkEmailHtml(params: {
  contactName: string;
  organizationName: string;
  magicLinkUrl: string;
  expiryMinutes: number;
}): string {
  const { contactName, organizationName, magicLinkUrl, expiryMinutes } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Login-Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
        Projekt-Details Login
      </h1>
      <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
        ${organizationName}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">

      <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
        Hallo ${contactName},
      </p>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Sie haben einen Login-Link angefordert, um auf die Projekt-Details zuzugreifen.
        Klicken Sie auf den Button unten, um sich anzumelden.
      </p>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLinkUrl}"
           style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Jetzt anmelden
        </a>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Oder kopieren Sie diesen Link in Ihren Browser:
      </p>

      <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; word-break: break-all; margin-bottom: 24px;">
        <code style="font-size: 12px; color: #374151;">${magicLinkUrl}</code>
      </div>

      <!-- Warning -->
      <div style="padding: 16px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Hinweis:</strong> Dieser Link ist ${expiryMinutes} Minuten gültig und kann nur einmal verwendet werden.
        </p>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
        Falls Sie diesen Login nicht angefordert haben, können Sie diese E-Mail ignorieren.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Diese E-Mail wurde automatisch gesendet.
        <br />
        Powered by l4yercak3
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Send email via Resend API directly (simpler than going through Convex action)
async function sendMagicLinkEmail(params: {
  to: string;
  contactName: string;
  organizationName: string;
  magicLinkUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const emailHtml = generateMagicLinkEmailHtml({
    contactName: params.contactName,
    organizationName: params.organizationName,
    magicLinkUrl: params.magicLinkUrl,
    expiryMinutes: 15,
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "l4yercak3 <noreply@mail.l4yercak3.com>",
        replyTo: "support@l4yercak3.com",
        to: params.to,
        subject: `Ihr Login-Link für ${params.organizationName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
      return { success: false, error: "Failed to send email" };
    }

    const result = await response.json();
    console.log("Magic link email sent:", result.id);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, organizationId, projectId, redirectPath } = body;

    // Validate required fields
    if (!email || !organizationId || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: email, organizationId, projectId" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Request magic link via Convex mutation
    const result = await fetchMutation(api.projectDrawerAuth.requestMagicLink, {
      email: email.trim().toLowerCase(),
      organizationId: organizationId as Id<"organizations">,
      projectId: projectId as Id<"objects">,
      redirectPath: redirectPath || "/",
    });

    // If we have internal data, the contact was found - send email
    if (result._internal) {
      const { token, contactName, organizationName } = result._internal;

      // Build magic link URL
      const appUrl = getAppUrl();
      const magicLinkUrl = `${appUrl}/api/auth/project-drawer/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath || "/")}`;

      // Send email
      const emailResult = await sendMagicLinkEmail({
        to: email.trim().toLowerCase(),
        contactName,
        organizationName,
        magicLinkUrl,
      });

      if (!emailResult.success) {
        console.error("Failed to send magic link email:", emailResult.error);
        // Don't expose email failures to client for security
      }
    }

    // Always return success (for security - don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: "If this email is registered, you will receive a login link shortly.",
    });
  } catch (error) {
    console.error("Magic link request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
