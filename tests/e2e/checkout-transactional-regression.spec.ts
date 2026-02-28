import { expect, test } from "@playwright/test";
import type { Id } from "../../convex/_generated/dataModel";
import {
  bootstrapTransactionalCheckoutFixture,
  createConvexClient,
  type TransactionalCheckoutFixture,
} from "./utils/checkout-transactional-fixture";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../convex/_generated/api") as { api: any };

const STEP_TIMEOUT_MS = 90_000;
const FULFILLMENT_TIMEOUT_MS = 240_000;

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

test.describe("Checkout Transactional Regression", () => {
  test.describe.configure({ mode: "serial" });

  let fixture: TransactionalCheckoutFixture;

  test.beforeAll(async () => {
    fixture = await bootstrapTransactionalCheckoutFixture();
  });

  test("validates product, form, event, checkout, ticket/invoice PDF and email generation", async ({
    page,
  }) => {
    test.setTimeout(7 * 60_000);

    await test.step("complete behavior-driven invoice checkout via UI", async () => {
      await page.goto(fixture.checkoutPath, { waitUntil: "domcontentloaded" });

      await expect(page.getByTestId("bdc-step-product-selection")).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await page.getByTestId(`bdc-product-${fixture.productId}-increase`).click();
      await page.getByTestId("bdc-product-selection-continue").click();

      await expect(page.getByTestId("bdc-step-registration-form")).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await page.getByTestId("bdc-registration-ticket-1-first-name").fill("Playwright");
      await page.getByTestId("bdc-registration-ticket-1-last-name").fill("Buyer");
      await page
        .getByTestId("bdc-registration-ticket-1-field-attendee_role")
        .selectOption("attendee");
      await page.getByTestId("bdc-registration-continue").click();

      await expect(page.getByTestId("bdc-step-customer-info")).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await page.getByTestId("bdc-customer-email").fill(fixture.checkoutCustomerEmail);
      await page.getByTestId("bdc-customer-name").fill("Playwright Buyer");
      await page.getByTestId("bdc-customer-phone").fill("+1 555 0100");
      await page.getByTestId("bdc-customer-continue").click();

      await expect(page.getByTestId("bdc-step-review-order")).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await page.getByTestId("bdc-review-continue").click();

      await expect(page.getByTestId("bdc-step-payment")).toBeVisible({
        timeout: STEP_TIMEOUT_MS,
      });
      await page.getByTestId("bdc-payment-option-invoice").click();

      await expect(page.getByTestId("processing-modal")).toBeVisible({ timeout: STEP_TIMEOUT_MS });
      await expect(page.getByTestId("bdc-step-confirmation")).toBeVisible({
        timeout: FULFILLMENT_TIMEOUT_MS,
      });
    });

    await test.step("assert backend session/ticket/invoice creation and event linkage", async () => {
      const convex = createConvexClient(fixture.convexUrl);

      const completedSession = await waitForValue("completed checkout session", async () => {
        const sessions = (await convex.query(apiAny.checkoutSessionOntology.getCompletedSessions, {
          sessionId: fixture.adminSessionId,
          organizationId: fixture.organizationId,
          limit: 100,
        })) as Array<any>;

        return (
          sessions.find(
            (candidate) =>
              candidate.customProperties?.customerEmail === fixture.checkoutCustomerEmail &&
              candidate.customProperties?.checkoutInstanceId === fixture.checkoutInstanceId,
          ) || null
        );
      });

      const checkoutSessionId = completedSession._id as Id<"objects">;

      const checkoutSession = (await convex.query(apiAny.checkoutSessionOntology.getCheckoutSession, {
        sessionId: fixture.adminSessionId,
        checkoutSessionId,
      })) as any;

      expect(checkoutSession).toBeTruthy();
      expect(checkoutSession.status).toBe("completed");

      const formResponses = checkoutSession.customProperties?.formResponses as Array<any>;
      expect(Array.isArray(formResponses)).toBeTruthy();
      expect(formResponses.length).toBeGreaterThan(0);
      expect(formResponses[0]?.responses?.firstName).toBe("Playwright");
      expect(formResponses[0]?.responses?.lastName).toBe("Buyer");
      expect(formResponses[0]?.responses?.attendee_role).toBe("attendee");

      const ticketIds = await waitForValue(
        "ticket generation",
        async () => {
          const ids = (await convex.action(apiAny.pdfGeneration.getTicketIdsFromCheckout, {
            checkoutSessionId,
          })) as Array<Id<"objects">>;
          return ids.length > 0 ? ids : null;
        },
        FULFILLMENT_TIMEOUT_MS,
      );

      const eventTickets = (await convex.query(apiAny.ticketOntology.getTickets, {
        sessionId: fixture.adminSessionId,
        organizationId: fixture.organizationId,
        eventId: fixture.eventId,
      })) as Array<any>;

      expect(eventTickets.length).toBeGreaterThan(0);
      const eventTicketIds = new Set(eventTickets.map((ticket) => String(ticket._id)));
      expect(ticketIds.some((id) => eventTicketIds.has(String(id)))).toBeTruthy();

      const invoice = await waitForValue("invoice creation", async () => {
        const invoices = (await convex.query(apiAny.invoicingOntology.listInvoices, {
          sessionId: fixture.adminSessionId,
          organizationId: fixture.organizationId,
        })) as Array<any> | null;

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

      expect(invoice.customProperties?.totalInCents).toBeGreaterThan(0);

      const ticketPdf = (await convex.action(apiAny.pdfGeneration.generateTicketPDF, {
        ticketId: ticketIds[0],
        checkoutSessionId,
      })) as
        | {
            filename: string;
            content: string;
            contentType: string;
          }
        | null;

      expect(ticketPdf).toBeTruthy();
      expect(ticketPdf?.filename.toLowerCase()).toContain(".pdf");
      expect(ticketPdf?.contentType).toBe("application/pdf");
      expect((ticketPdf?.content || "").length).toBeGreaterThan(100);

      const invoicePdf = (await convex.action(apiAny.pdfGeneration.generateInvoicePDF, {
        checkoutSessionId,
      })) as
        | {
            filename: string;
            content: string;
            contentType: string;
          }
        | null;

      expect(invoicePdf).toBeTruthy();
      expect(invoicePdf?.filename.toLowerCase()).toContain(".pdf");
      expect(invoicePdf?.contentType).toBe("application/pdf");
      expect((invoicePdf?.content || "").length).toBeGreaterThan(100);

      const ticketEmailPreview = (await convex.action(apiAny.ticketEmailService.previewTicketEmail, {
        sessionId: fixture.adminSessionId,
        ticketId: ticketIds[0],
        language: "en",
      })) as {
        html: string;
        subject: string;
        to: string;
      };

      expect(ticketEmailPreview.subject.length).toBeGreaterThan(0);
      expect(ticketEmailPreview.html.length).toBeGreaterThan(100);
      expect(ticketEmailPreview.to.length).toBeGreaterThan(3);

      const invoiceEmailPreview = (await convex.action(apiAny.invoiceEmailService.previewInvoiceEmail, {
        sessionId: fixture.adminSessionId,
        invoiceId: invoice._id,
        language: "en",
      })) as {
        html: string;
        subject: string;
        to: string;
      };

      expect(invoiceEmailPreview.subject.length).toBeGreaterThan(0);
      expect(invoiceEmailPreview.html.length).toBeGreaterThan(100);
      expect(invoiceEmailPreview.to.length).toBeGreaterThan(3);
    });
  });
});
