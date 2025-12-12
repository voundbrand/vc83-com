import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Vercel Webhook Handler
 *
 * Receives webhook events from Vercel for deployment status updates.
 * Events: deployment.created, deployment.succeeded, deployment.error, deployment.canceled
 *         project.created, project.removed
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook signature for verification (if Vercel provides one)
    const headersList = await headers();
    const signature = headersList.get("x-vercel-signature");

    console.log("[Vercel Webhook] Received webhook:", {
      hasSignature: !!signature,
      contentType: request.headers.get("content-type"),
    });

    // Parse webhook payload
    const payload = await request.json();

    console.log("[Vercel Webhook] Event details:", {
      type: payload.type,
      id: payload.id,
      createdAt: payload.createdAt,
    });

    // Handle different event types
    switch (payload.type) {
      case "deployment.created":
        await handleDeploymentCreated(payload);
        break;

      case "deployment.succeeded":
        await handleDeploymentSucceeded(payload);
        break;

      case "deployment.error":
        await handleDeploymentError(payload);
        break;

      case "deployment.canceled":
        await handleDeploymentCanceled(payload);
        break;

      case "project.created":
        await handleProjectCreated(payload);
        break;

      case "project.removed":
        await handleProjectRemoved(payload);
        break;

      default:
        console.log("[Vercel Webhook] Unhandled event type:", payload.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Vercel Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleDeploymentCreated(payload: any) {
  console.log("[Vercel Webhook] Deployment created:", {
    deploymentId: payload.payload?.deployment?.id,
    url: payload.payload?.deployment?.url,
    projectId: payload.payload?.project?.id,
  });

  // TODO: Store deployment status in database
  // TODO: Notify user via WebSocket or polling
}

async function handleDeploymentSucceeded(payload: any) {
  console.log("[Vercel Webhook] Deployment succeeded:", {
    deploymentId: payload.payload?.deployment?.id,
    url: payload.payload?.deployment?.url,
    deploymentUrl: `https://${payload.payload?.deployment?.url}`,
  });

  // TODO: Update deployment status to "success"
  // TODO: Notify user with success message and live URL
}

async function handleDeploymentError(payload: any) {
  console.log("[Vercel Webhook] Deployment error:", {
    deploymentId: payload.payload?.deployment?.id,
    errorMessage: payload.payload?.deployment?.errorMessage,
  });

  // TODO: Update deployment status to "failed"
  // TODO: Notify user with error details and troubleshooting link
}

async function handleDeploymentCanceled(payload: any) {
  console.log("[Vercel Webhook] Deployment canceled:", {
    deploymentId: payload.payload?.deployment?.id,
  });

  // TODO: Update deployment status to "canceled"
  // TODO: Notify user that deployment was canceled
}

async function handleProjectCreated(payload: any) {
  console.log("[Vercel Webhook] Project created:", {
    projectId: payload.payload?.project?.id,
    projectName: payload.payload?.project?.name,
  });

  // TODO: Store project information
  // TODO: Link project to l4yercak3 published page if applicable
}

async function handleProjectRemoved(payload: any) {
  console.log("[Vercel Webhook] Project removed:", {
    projectId: payload.payload?.project?.id,
  });

  // TODO: Update project status in database
  // TODO: Notify user that project was removed
}
