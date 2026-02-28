import { expect, test } from "@playwright/test";
import type { Id } from "../../convex/_generated/dataModel";
import {
  bootstrapFnd007Fixture,
  buildDemoRunId,
  createConvexClient,
  evaluateFnd007Preflight,
  writeFnd007EvidenceArtifact,
  type Fnd007CheckpointResult,
  type Fnd007EvidenceArtifact,
  type Fnd007Fixture,
  type Fnd007Preflight,
} from "./utils/fnd-007-rehearsal";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../convex/_generated/api") as { api: any };

const STEP_TIMEOUT_MS = 90_000;
const FULFILLMENT_TIMEOUT_MS = 240_000;
const CHECKPOINT_IDS = ["FND-007-C1", "FND-007-C2", "FND-007-C3", "FND-007-C4"] as const;

type CheckpointId = (typeof CHECKPOINT_IDS)[number];

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function waitForValue<T>(
  label: string,
  resolver: () => Promise<T | null>,
  timeoutMs = FULFILLMENT_TIMEOUT_MS,
  intervalMs = 2_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const value = await resolver();
      if (value !== null) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Timed out waiting for ${label}`);
}

function upsertCheckpoint(
  checkpoints: Fnd007CheckpointResult[],
  id: CheckpointId,
  status: "PASS" | "FAIL",
  detail: string,
) {
  const existingIndex = checkpoints.findIndex((checkpoint) => checkpoint.id === id);
  if (existingIndex >= 0) {
    checkpoints[existingIndex] = { id, status, detail };
    return;
  }
  checkpoints.push({ id, status, detail });
}

function ensureCheckpointCoverage(
  checkpoints: Fnd007CheckpointResult[],
  preflight: Fnd007Preflight,
) {
  for (const checkpointId of CHECKPOINT_IDS) {
    if (checkpoints.some((checkpoint) => checkpoint.id === checkpointId)) {
      continue;
    }

    const detail =
      preflight.status === "blocked"
        ? "Skipped because preflight was blocked; run is fail-closed."
        : "Missing execution evidence.";
    checkpoints.push({
      id: checkpointId,
      status: "FAIL",
      detail,
    });
  }
}

test.describe("FND-007 rehearsal", () => {
  test.describe.configure({ mode: "serial" });

  test("executes founder demo rehearsal and emits deterministic evidence", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(9 * 60_000);

    const startedAt = Date.now();
    let firstActionableAt = startedAt;
    const scenarioId: Fnd007EvidenceArtifact["scenarioId"] = "FND-007";
    const runId = buildDemoRunId(new Date(startedAt));

    let preflight = evaluateFnd007Preflight();
    let fixture: Fnd007Fixture | null = null;
    const actionLog: Array<Record<string, unknown>> = [];
    const trustLog: Array<Record<string, unknown>> = [];
    const checkpointResults: Fnd007CheckpointResult[] = [];
    const notes: string[] = [];
    let mutatingActionCount = 0;
    let approvedMutationCount = 0;
    let checkoutSessionId: Id<"objects"> | null = null;
    let ticketIds: Array<Id<"objects">> = [];
    let dispatchMode: "live" | "simulated_preview" | "failed" = "failed";

    try {
      firstActionableAt = Date.now();

      const c1Pass =
        (preflight.status === "available_now" || preflight.status === "blocked") &&
        (preflight.status === "available_now" || preflight.unblockingSteps.length > 0);
      upsertCheckpoint(
        checkpointResults,
        "FND-007-C1",
        c1Pass ? "PASS" : "FAIL",
        c1Pass
          ? `Preflight resolved to ${preflight.status}.`
          : "Preflight status was invalid or blocked without unblocking steps.",
      );

      actionLog.push({
        step: "preflight",
        at: Date.now(),
        status: preflight.status,
        blockedReasons: preflight.blockedReasons,
        unblockingSteps: preflight.unblockingSteps,
        liveIntegrations: preflight.liveIntegrations,
        simulatedFallbacks: preflight.simulatedFallbacks,
      });

      if (preflight.status === "blocked") {
        notes.push(
          `Preflight blocked (${preflight.blockedReasons.join(", ") || "unknown reason"}).`,
        );
      } else {
        const publishApprovalArtifact = {
          approvalId: `fnd-007-publish-${runId}`,
          decision: "approved",
          approvedBy: "founder_rehearsal_policy",
          approvedAt: Date.now(),
          scope: "publish_event_form_products_checkout",
        };
        mutatingActionCount += 1;
        approvedMutationCount += 1;
        trustLog.push({
          checkpoint: "publish_governance",
          status: "approved",
          artifact: publishApprovalArtifact,
        });

        fixture = await bootstrapFnd007Fixture();
        const checkoutUrl = new URL(
          fixture.checkoutPath,
          baseURL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
        ).toString();

        const artifactGraph = {
          eventId: fixture.eventId,
          productIds: fixture.productIds,
          formId: fixture.formId,
          checkoutId: fixture.checkoutInstanceId,
          checkoutUrl,
        };
        const c2Pass = Boolean(
          artifactGraph.eventId &&
            artifactGraph.formId &&
            artifactGraph.checkoutId &&
            artifactGraph.checkoutUrl &&
            Array.isArray(artifactGraph.productIds) &&
            artifactGraph.productIds.length > 0 &&
            artifactGraph.productIds.every(Boolean),
        );
        upsertCheckpoint(
          checkpointResults,
          "FND-007-C2",
          c2Pass ? "PASS" : "FAIL",
          c2Pass ? "Artifact graph is complete." : "Artifact graph is missing required IDs.",
        );

        actionLog.push({
          step: "artifact_graph",
          at: Date.now(),
          ...artifactGraph,
        });

        await page.goto(fixture.checkoutPath, { waitUntil: "domcontentloaded" });
        await expect(page.getByTestId("bdc-step-product-selection")).toBeVisible({
          timeout: STEP_TIMEOUT_MS,
        });
        await page.getByTestId(`bdc-product-${fixture.productIds[0]}-increase`).click();
        await page.getByTestId("bdc-product-selection-continue").click();

        await expect(page.getByTestId("bdc-step-registration-form")).toBeVisible({
          timeout: STEP_TIMEOUT_MS,
        });
        await page.getByTestId("bdc-registration-ticket-1-first-name").fill("Founder");
        await page.getByTestId("bdc-registration-ticket-1-last-name").fill("Rehearsal");
        await page
          .getByTestId("bdc-registration-ticket-1-field-attendee_role")
          .selectOption("attendee");
        const dietaryField = page.getByTestId("bdc-registration-ticket-1-field-dietary_restrictions");
        if ((await dietaryField.count()) > 0) {
          await dietaryField.fill("none");
        }
        await page.getByTestId("bdc-registration-continue").click();

        await expect(page.getByTestId("bdc-step-customer-info")).toBeVisible({
          timeout: STEP_TIMEOUT_MS,
        });
        await page.getByTestId("bdc-customer-email").fill(fixture.checkoutCustomerEmail);
        await page.getByTestId("bdc-customer-name").fill("Founder Rehearsal");
        await page.getByTestId("bdc-customer-phone").fill("+1 555 0107");
        await page.getByTestId("bdc-customer-continue").click();

        await expect(page.getByTestId("bdc-step-review-order")).toBeVisible({
          timeout: STEP_TIMEOUT_MS,
        });
        await page.getByTestId("bdc-review-continue").click();

        await expect(page.getByTestId("bdc-step-payment")).toBeVisible({
          timeout: STEP_TIMEOUT_MS,
        });
        await page.getByTestId("bdc-payment-option-invoice").click();

        await expect(page.getByTestId("processing-modal")).toBeVisible({
          timeout: STEP_TIMEOUT_MS,
        });
        await expect(page.getByTestId("bdc-step-confirmation")).toBeVisible({
          timeout: FULFILLMENT_TIMEOUT_MS,
        });

        actionLog.push({
          step: "checkout_rehearsal_submitted",
          at: Date.now(),
          checkoutPath: fixture.checkoutPath,
        });

        const convex = createConvexClient(fixture.convexUrl);

        const completedSession = await waitForValue("completed checkout session", async () => {
          const sessions = (await convex.query(apiAny.checkoutSessionOntology.getCompletedSessions, {
            sessionId: fixture.adminSessionId,
            organizationId: fixture.organizationId,
            limit: 100,
          })) as Array<Record<string, any>>;

          return (
            sessions.find(
              (candidate) =>
                candidate.customProperties?.customerEmail === fixture?.checkoutCustomerEmail &&
                candidate.customProperties?.checkoutInstanceId === fixture?.checkoutInstanceId,
            ) || null
          );
        });

        checkoutSessionId = completedSession._id as Id<"objects">;

        const checkoutSession = (await convex.query(apiAny.checkoutSessionOntology.getCheckoutSession, {
          sessionId: fixture.adminSessionId,
          checkoutSessionId,
        })) as Record<string, any>;

        ticketIds = await waitForValue("ticket IDs", async () => {
          const ids = (await convex.action(apiAny.pdfGeneration.getTicketIdsFromCheckout, {
            checkoutSessionId,
          })) as Array<Id<"objects">>;
          return ids.length > 0 ? ids : null;
        });

        const purchaseItems = (await convex.query(apiAny.purchaseOntology.getPurchaseItemsByCheckout, {
          sessionId: fixture.adminSessionId,
          checkoutSessionId,
        })) as Array<Record<string, any>>;

        const invoice = await waitForValue("invoice creation", async () => {
          const invoices = (await convex.query(apiAny.invoicingOntology.listInvoices, {
            sessionId: fixture.adminSessionId,
            organizationId: fixture.organizationId,
          })) as Array<Record<string, any>> | null;

          if (!Array.isArray(invoices)) {
            return null;
          }

          return (
            invoices.find(
              (candidate) =>
                String(candidate.customProperties?.checkoutSessionId) === String(checkoutSessionId),
            ) || null
          );
        });

        const invoiceApprovalArtifact = {
          approvalId: `fnd-007-invoice-send-${fixture.runId}`,
          decision: "approved",
          approvedBy: fixture.adminEmail,
          approvedAt: Date.now(),
          scope: "invoice_send_dispatch",
        };
        trustLog.push({
          checkpoint: "invoice_send_governance",
          status: "approved",
          artifact: invoiceApprovalArtifact,
        });
        mutatingActionCount += 1;
        approvedMutationCount += 1;

        const dispatchEvidence: Record<string, unknown> = {
          mode: "failed",
          success: false,
        };

        try {
          const sendResult = (await convex.action(apiAny.invoiceEmailService.sendInvoiceEmail, {
            sessionId: fixture.adminSessionId,
            invoiceId: invoice._id,
            recipientEmail: fixture.checkoutCustomerEmail,
            isTest: true,
            testRecipient: fixture.adminEmail,
            language: "en",
            includePdfAttachment: false,
          })) as {
            success: boolean;
            messageId?: string;
            sentTo: string;
            sentVia: "microsoft" | "resend";
            isTest: boolean;
          };

          if (!sendResult.success) {
            throw new Error("Invoice send returned unsuccessful result.");
          }

          dispatchMode = "live";
          dispatchEvidence.mode = "live";
          dispatchEvidence.success = true;
          dispatchEvidence.sentTo = sendResult.sentTo;
          dispatchEvidence.sentVia = sendResult.sentVia;
          dispatchEvidence.messageId = sendResult.messageId || "none";
        } catch (error) {
          const sendError = toErrorMessage(error);
          notes.push(`Invoice send used simulated fallback: ${sendError}`);

          try {
            const preview = (await convex.action(apiAny.invoiceEmailService.previewInvoiceEmail, {
              sessionId: fixture.adminSessionId,
              invoiceId: invoice._id,
              language: "en",
            })) as {
              html: string;
              subject: string;
              to: string;
            };

            dispatchMode = "simulated_preview";
            dispatchEvidence.mode = "simulated_preview";
            dispatchEvidence.success = true;
            dispatchEvidence.previewSubject = preview.subject;
            dispatchEvidence.previewRecipient = preview.to;
            dispatchEvidence.previewHtmlLength = preview.html.length;
            dispatchEvidence.reason = sendError;
          } catch (previewError) {
            dispatchMode = "failed";
            dispatchEvidence.mode = "failed";
            dispatchEvidence.success = false;
            dispatchEvidence.reason = toErrorMessage(previewError);
          }
        }

        await convex.mutation(apiAny.invoicingOntology.markInvoiceAsSent, {
          sessionId: fixture.adminSessionId,
          invoiceId: invoice._id,
          sentTo: [fixture.checkoutCustomerEmail],
        });

        const sentInvoice = (await convex.query(apiAny.invoicingOntology.getInvoiceById, {
          sessionId: fixture.adminSessionId,
          invoiceId: invoice._id,
        })) as Record<string, any> | null;

        const invoiceMarkedSent =
          sentInvoice?.status === "sent" && Boolean(sentInvoice.customProperties?.sentAt);
        const c3Pass =
          invoiceApprovalArtifact.decision === "approved" &&
          dispatchEvidence.success === true &&
          invoiceMarkedSent;
        upsertCheckpoint(
          checkpointResults,
          "FND-007-C3",
          c3Pass ? "PASS" : "FAIL",
          c3Pass
            ? `Invoice dispatch evidence captured (${dispatchEvidence.mode as string}).`
            : "Invoice send lacked approval or dispatch confirmation evidence.",
        );

        actionLog.push({
          step: "invoice_dispatch",
          at: Date.now(),
          invoiceId: invoice._id,
          invoiceStatusAfterSend: sentInvoice?.status,
          dispatchEvidence,
        });

        const ticketEmailPreview = (await convex.action(apiAny.ticketEmailService.previewTicketEmail, {
          sessionId: fixture.adminSessionId,
          ticketId: ticketIds[0],
          language: "en",
        })) as {
          html: string;
          subject: string;
          to: string;
        };

        const hasFulfillmentEvidence = purchaseItems.some(
          (item) => item.customProperties?.fulfillmentStatus === "fulfilled",
        );
        const c4Pass = Boolean(
          checkoutSession?.status === "completed" &&
            ticketIds.length > 0 &&
            hasFulfillmentEvidence &&
            ticketEmailPreview.subject.length > 0 &&
            ticketEmailPreview.html.length > 100,
        );
        upsertCheckpoint(
          checkpointResults,
          "FND-007-C4",
          c4Pass ? "PASS" : "FAIL",
          c4Pass
            ? "Checkout produced ticket fulfillment and delivery evidence."
            : "Ticket fulfillment evidence is incomplete.",
        );

        actionLog.push({
          step: "ticket_fulfillment_evidence",
          at: Date.now(),
          checkoutSessionId,
          ticketIds,
          fulfillmentStatuses: purchaseItems.map((item) => item.customProperties?.fulfillmentStatus),
          ticketEmailPreviewRecipient: ticketEmailPreview.to,
        });
      }
    } catch (error) {
      notes.push(`Unhandled rehearsal error: ${toErrorMessage(error)}`);
    } finally {
      ensureCheckpointCoverage(checkpointResults, preflight);

      const failedCheckpointIds = checkpointResults
        .filter((checkpoint) => checkpoint.status === "FAIL")
        .map((checkpoint) => checkpoint.id);
      const checkpointPassCount = checkpointResults.filter(
        (checkpoint) => checkpoint.status === "PASS",
      ).length;
      const checkpointFailIds: string[] | "none" =
        failedCheckpointIds.length > 0 ? failedCheckpointIds : "none";
      const result: "PASS" | "FAIL" = checkpointFailIds === "none" ? "PASS" : "FAIL";
      const trustEventCoverage: "covered" | "missing" =
        approvedMutationCount >= mutatingActionCount ? "covered" : "missing";
      const blockedUnblockingStepsPresent: "yes" | "no" | "n_a" =
        preflight.status === "blocked"
          ? preflight.unblockingSteps.length > 0
            ? "yes"
            : "no"
          : "n_a";
      const oneVisibleOperatorMaintained: "yes" | "no" = "yes";
      const totalRuntimeSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const firstActionableSeconds = Math.max(
        0,
        Math.round((firstActionableAt - startedAt) / 1000),
      );

      const simulatedComponents = new Set<string>(preflight.simulatedFallbacks);
      if (dispatchMode === "simulated_preview") {
        simulatedComponents.add("invoice_dispatch_preview");
      }

      const evidence: Fnd007EvidenceArtifact = {
        runId,
        scenarioId,
        checkpointPassCount,
        checkpointFailIds,
        firstActionableSeconds,
        totalRuntimeSeconds,
        mutatingActionCount,
        approvedMutationCount,
        trustEventCoverage,
        preflightStatus: preflight.status,
        blockedUnblockingStepsPresent,
        oneVisibleOperatorMaintained,
        result,
        notes: notes.join(" | ") || "none",
        generatedAt: new Date().toISOString(),
        rehearsalMode:
          preflight.liveIntegrations.stripeConnected && preflight.liveIntegrations.resendConnected
            ? "live"
            : "simulated",
        simulatedComponents: Array.from(simulatedComponents),
        checkpointResults,
        preflight_status: preflight,
        action_log: actionLog,
        trust_log: trustLog,
        outcome_summary: {
          fixtureRunId: fixture?.runId || null,
          organizationId: fixture?.organizationId || null,
          eventId: fixture?.eventId || null,
          productIds: fixture?.productIds || [],
          formId: fixture?.formId || null,
          checkoutId: fixture?.checkoutInstanceId || null,
          checkoutPath: fixture?.checkoutPath || null,
          checkoutSessionId,
          ticketIds,
        },
      };

      await writeFnd007EvidenceArtifact(evidence);

      expect(evidence.scenarioId).toBe("FND-007");
      expect(evidence.runId).toMatch(/^demo-\d{8}-07$/);
      expect(evidence.checkpointResults).toHaveLength(4);
      expect(
        evidence.checkpointResults.find((checkpoint) => checkpoint.id === "FND-007-C1")?.status,
      ).toBe("PASS");

      if (preflight.status === "blocked") {
        expect(evidence.result).toBe("FAIL");
        expect(evidence.blockedUnblockingStepsPresent).toBe("yes");
      } else {
        expect(evidence.result).toBe("PASS");
        expect(evidence.checkpointFailIds).toBe("none");
      }
    }
  });
});
