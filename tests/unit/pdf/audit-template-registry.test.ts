import { describe, expect, it } from "vitest";
import {
  getLeadMagnetTemplateByCode,
  getTemplateByCode,
  validateTemplateData,
} from "../../../convex/pdfTemplateRegistry";

describe("audit workflow lead magnet template registry", () => {
  it("resolves audit template via lead magnet lookup helper", () => {
    const template = getLeadMagnetTemplateByCode("leadmagnet_audit_workflow_report_v1");
    expect(template?.code).toBe("leadmagnet_audit_workflow_report_v1");
    expect(template?.version).toBe("1.1.0");
  });

  it("exposes upgraded audit template layout markers", () => {
    const template = getTemplateByCode("leadmagnet_audit_workflow_report_v1");
    expect(template).toBeTruthy();
    expect(template?.template.html).toContain("class=\"hero\"");
    expect(template?.template.html).toContain("class=\"kpi-card\"");
    expect(template?.template.html).toContain("class=\"cta-card\"");
    expect(template?.template.css).toContain(".summary-strip");
    expect(template?.template.css).toContain(".timeline-marker");
  });

  it("keeps required-field validation contract for audit generation", () => {
    const result = validateTemplateData("leadmagnet_audit_workflow_report_v1", {
      title: "Your One Workflow Report",
      generatedDate: "March 3, 2026",
      author: "One of One Operator",
      clientName: "Alex Founder",
      businessType: "Ecommerce consulting",
      revenueRange: "$1M-$3M ARR",
      teamSize: "8 people",
      workflowName: "Lead qualification and follow-up orchestration",
      workflowSummary: "Automate first response and qualification so human focus is used on high-leverage work.",
      workflowOutcome: "Faster response without sacrificing quality control.",
      weeklyHoursRecovered: 10,
      actionPlan: [
        { step: "Define qualification criteria.", owner: "Founder", timing: "Day 1" },
        { step: "Launch monitored follow-up flow.", owner: "Operator", timing: "Day 2-4" },
      ],
      guardrails: [
        "Escalate high-value opportunities to manual review.",
        "Log all outbound workflow events for rollback.",
      ],
      toolingRecommendations: ["Use CRM webhook trigger for inbound lead capture."],
    });

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
