import { describe, expect, it } from "vitest";
import {
  buildCmsPreviewDeploymentSpec,
  resolveCmsStatusFromVercelReadyState,
} from "../../../convex/integrations/vercel";

describe("cms vercel preview orchestration", () => {
  it("builds preview deployment spec from deterministic request branch", () => {
    const spec = buildCmsPreviewDeploymentSpec({
      requestId: "objects_777",
      targetRepoUrl: "https://github.com/foundbrand_001/one-of-one-landing",
      vercelProjectId: "prj_123",
      projectName: "one-of-one-landing",
      linkedRepoFullName: "foundbrand_001/one-of-one-landing",
    });

    expect(spec.branchName).toBe("l4yercak3/cms/objects_777");
    expect(spec.repoFullName).toBe("foundbrand_001/one-of-one-landing");
    expect(spec.payload).toEqual({
      name: "one-of-one-landing",
      project: "prj_123",
      gitSource: {
        type: "github",
        repo: "foundbrand_001/one-of-one-landing",
        ref: "l4yercak3/cms/objects_777",
      },
      target: "preview",
    });
  });

  it("maps vercel ready states to cms lifecycle statuses", () => {
    expect(resolveCmsStatusFromVercelReadyState("READY")).toBe("preview_ready");
    expect(resolveCmsStatusFromVercelReadyState("ERROR")).toBe("failed");
    expect(resolveCmsStatusFromVercelReadyState("CANCELED")).toBe("failed");
    expect(resolveCmsStatusFromVercelReadyState("BUILDING")).toBeNull();
    expect(resolveCmsStatusFromVercelReadyState("QUEUED")).toBeNull();
  });
});
