import { describe, expect, it } from "vitest";
import {
  buildCmsRequestBranchName,
  orchestrateCmsRequestPullRequest,
} from "../../../convex/integrations/github";

type CommitRecord = {
  treeSha: string;
  parentSha: string | null;
};

function createHarness() {
  let blobCounter = 0;
  let treeCounter = 0;
  let commitCounter = 0;
  let prCounter = 0;
  const blobBySha = new Map<string, string>();
  const treeBySha = new Map<string, Map<string, string>>();
  const commitBySha = new Map<string, CommitRecord>();
  const branchByName = new Map<string, string>();
  const prs: Array<{
    number: number;
    html_url: string;
    head: string;
    base: string;
  }> = [];

  treeBySha.set(
    "tree_base",
    new Map([
      [
        "apps/site-a/content/home.en.json",
        JSON.stringify({ headline: "Old title", subtitle: "Stable" }, null, 2) + "\n",
      ],
    ])
  );
  commitBySha.set("commit_base", { treeSha: "tree_base", parentSha: null });
  branchByName.set("main", "commit_base");

  const getBranchTree = (branchName: string) => {
    const commitSha = branchByName.get(branchName);
    if (!commitSha) {
      throw new Error(`Missing branch: ${branchName}`);
    }
    const commit = commitBySha.get(commitSha);
    if (!commit) {
      throw new Error(`Missing commit: ${commitSha}`);
    }
    const tree = treeBySha.get(commit.treeSha);
    if (!tree) {
      throw new Error(`Missing tree: ${commit.treeSha}`);
    }
    return tree;
  };

  const fetchJson = async <T>(
    endpoint: string,
    _accessToken: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const method = options.method || "GET";

    if (method === "GET" && endpoint.startsWith("/repos/org/repo/git/ref/heads/")) {
      const encoded = endpoint.slice("/repos/org/repo/git/ref/heads/".length);
      const branch = decodeURIComponent(encoded);
      const sha = branchByName.get(branch);
      if (!sha) {
        throw new Error("GitHub API error (404): Not Found");
      }
      return { object: { sha } } as T;
    }

    if (method === "POST" && endpoint === "/repos/org/repo/git/refs") {
      const payload = JSON.parse(options.body as string) as {
        ref: string;
        sha: string;
      };
      const branch = payload.ref.replace("refs/heads/", "");
      branchByName.set(branch, payload.sha);
      return { ref: payload.ref } as T;
    }

    if (method === "GET" && endpoint.startsWith("/repos/org/repo/git/commits/")) {
      const commitSha = endpoint.slice("/repos/org/repo/git/commits/".length);
      const commit = commitBySha.get(commitSha);
      if (!commit) {
        throw new Error("GitHub API error (404): Not Found");
      }
      return { tree: { sha: commit.treeSha } } as T;
    }

    if (method === "POST" && endpoint === "/repos/org/repo/git/blobs") {
      const payload = JSON.parse(options.body as string) as { content: string };
      blobCounter += 1;
      const blobSha = `blob_${blobCounter}`;
      blobBySha.set(blobSha, payload.content);
      return { sha: blobSha } as T;
    }

    if (method === "POST" && endpoint === "/repos/org/repo/git/trees") {
      const payload = JSON.parse(options.body as string) as {
        base_tree: string;
        tree: Array<{ path: string; sha: string }>;
      };
      const base = treeBySha.get(payload.base_tree);
      if (!base) {
        throw new Error("Missing base tree");
      }
      const nextTree = new Map(base);
      for (const entry of payload.tree) {
        const encodedContent = blobBySha.get(entry.sha);
        if (!encodedContent) {
          throw new Error("Missing blob");
        }
        const decoded = Buffer.from(encodedContent, "base64").toString("utf8");
        nextTree.set(entry.path, decoded);
      }
      treeCounter += 1;
      const treeSha = `tree_${treeCounter}`;
      treeBySha.set(treeSha, nextTree);
      return { sha: treeSha } as T;
    }

    if (method === "POST" && endpoint === "/repos/org/repo/git/commits") {
      const payload = JSON.parse(options.body as string) as {
        tree: string;
        parents: string[];
      };
      commitCounter += 1;
      const commitSha = `commit_${commitCounter}`;
      commitBySha.set(commitSha, {
        treeSha: payload.tree,
        parentSha: payload.parents[0] || null,
      });
      return { sha: commitSha } as T;
    }

    if (method === "PATCH" && endpoint.startsWith("/repos/org/repo/git/refs/heads/")) {
      const branch = decodeURIComponent(
        endpoint.slice("/repos/org/repo/git/refs/heads/".length)
      );
      const payload = JSON.parse(options.body as string) as { sha: string };
      branchByName.set(branch, payload.sha);
      return {} as T;
    }

    if (method === "GET" && endpoint.startsWith("/repos/org/repo/pulls?")) {
      const url = new URL(`https://api.github.com${endpoint}`);
      const head = url.searchParams.get("head");
      const base = url.searchParams.get("base");
      const matches = prs.filter((pr) => pr.head === head && pr.base === base);
      return matches.map((pr) => ({ number: pr.number, html_url: pr.html_url })) as T;
    }

    if (method === "POST" && endpoint === "/repos/org/repo/pulls") {
      const payload = JSON.parse(options.body as string) as {
        head: string;
        base: string;
      };
      prCounter += 1;
      const created = {
        number: prCounter,
        html_url: `https://github.com/org/repo/pull/${prCounter}`,
        head: `org:${payload.head}`,
        base: payload.base,
      };
      prs.push(created);
      return { number: created.number, html_url: created.html_url } as T;
    }

    throw new Error(`Unhandled fetchJson endpoint: ${method} ${endpoint}`);
  };

  const fetchText = async (
    endpoint: string,
    _accessToken: string
  ): Promise<string> => {
    if (!endpoint.startsWith("/repos/org/repo/contents/")) {
      throw new Error(`Unhandled fetchText endpoint: ${endpoint}`);
    }
    const [pathPart, queryPart] = endpoint.split("?");
    const encodedPath = pathPart.slice("/repos/org/repo/contents/".length);
    const filePath = encodedPath
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
    const query = new URLSearchParams(queryPart || "");
    const branchName = decodeURIComponent(query.get("ref") || "main");
    const tree = getBranchTree(branchName);
    const content = tree.get(filePath);
    if (!content) {
      throw new Error("GitHub API error (404): Not Found");
    }
    return content;
  };

  const readBranchFile = (branchName: string, filePath: string): string => {
    const tree = getBranchTree(branchName);
    const content = tree.get(filePath);
    if (!content) {
      throw new Error(`Missing file ${filePath} in ${branchName}`);
    }
    return content;
  };

  return {
    fetchJson,
    fetchText,
    readBranchFile,
  };
}

describe("cms github PR orchestration", () => {
  it("builds deterministic branch names from request IDs", () => {
    expect(buildCmsRequestBranchName("objects_123")).toBe(
      "l4yercak3/cms/objects_123"
    );
    expect(buildCmsRequestBranchName(" Objects_ABC ")).toBe(
      "l4yercak3/cms/objects_abc"
    );
    expect(buildCmsRequestBranchName("Objects A/B")).toBe(
      "l4yercak3/cms/objects-a-b"
    );
  });

  it("replays idempotently when branch and PR already exist with same manifest result", async () => {
    const harness = createHarness();
    const changeManifest = {
      touchedFiles: ["apps/site-a/content/home.en.json"],
      patches: [
        {
          filePath: "apps/site-a/content/home.en.json",
          operations: [
            {
              op: "replace" as const,
              path: "/headline",
              value: "Updated title",
            },
          ],
        },
      ],
    };

    const first = await orchestrateCmsRequestPullRequest({
      requestId: "objects_900",
      repoFullName: "org/repo",
      baseBranch: "main",
      changeManifest,
      accessToken: "token",
      fetchJson: harness.fetchJson,
      fetchText: harness.fetchText,
    });

    expect(first.createdBranch).toBe(true);
    expect(first.createdCommit).toBe(true);
    expect(first.createdPr).toBe(true);
    expect(first.idempotentReplay).toBe(false);
    expect(first.prNumber).toBe(1);
    expect(
      harness.readBranchFile(
        "l4yercak3/cms/objects_900",
        "apps/site-a/content/home.en.json"
      )
    ).toContain("\"headline\": \"Updated title\"");

    const second = await orchestrateCmsRequestPullRequest({
      requestId: "objects_900",
      repoFullName: "org/repo",
      baseBranch: "main",
      changeManifest,
      accessToken: "token",
      fetchJson: harness.fetchJson,
      fetchText: harness.fetchText,
    });

    expect(second.createdBranch).toBe(false);
    expect(second.createdCommit).toBe(false);
    expect(second.createdPr).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.prNumber).toBe(first.prNumber);
    expect(second.prUrl).toBe(first.prUrl);
  });
});
