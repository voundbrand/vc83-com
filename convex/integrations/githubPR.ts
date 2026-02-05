/**
 * GITHUB PR INTEGRATION
 *
 * Creates pull requests for changes made to imported GitHub repositories.
 * Used when the builder modifies files in a repo that was imported via
 * the "Connect App" flow (as opposed to repos created by the builder).
 *
 * Flow:
 * 1. Compare builderFiles to original import (by lastModifiedBy)
 * 2. Identify added (scaffold) and modified files
 * 3. Create branch from default branch
 * 4. Commit changes via Git Trees API
 * 5. Open pull request
 */

import { action, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Lazy-load api/internal to avoid TS2589
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api");
  }
  return _apiCache;
}

/**
 * Encode a UTF-8 string to base64.
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < bytes.length ? chars[b2 & 63] : "=";
  }
  return result;
}

/**
 * GitHub API fetch helper
 */
async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "l4yercak3-builder",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET IMPORT DIFF
 * Compare original imported files with current state to identify changes.
 */
export const getImportDiff = internalQuery({
  args: {
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    const added: string[] = [];
    const modified: string[] = [];
    let unchanged = 0;

    for (const file of files) {
      if (file.lastModifiedBy === "scaffold" || file.lastModifiedBy === "user") {
        // Check if there's an original version (was it imported then modified?)
        // Files originally imported have lastModifiedBy: "github-import"
        // If a file exists but was never "github-import", it was added
        // Since we can't track history per-file without versioning, we use
        // isScaffold flag and lastModifiedBy as heuristics
        if (file.isScaffold) {
          added.push(file.path);
        } else {
          modified.push(file.path);
        }
      } else if ((file.lastModifiedBy as string) === "github-import") {
        unchanged++;
      }
    }

    return { added, modified, unchanged };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * CREATE INTEGRATION PR
 * Creates a pull request with scaffold files and modifications made in the builder.
 */
export const createIntegrationPR = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    branchName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { api, internal } = getApi();

    // 1. Get builder app details
    const app = await ctx.runQuery(api.builderAppOntology.getBuilderApp, {
      sessionId: args.sessionId,
      appId: args.appId,
    });

    if (!app) {
      throw new Error("Builder app not found");
    }

    const customProps = app.customProperties as {
      source?: string;
      githubImport?: { repoFullName: string; branch: string };
      deployment?: { githubRepo?: string; githubBranch?: string };
    };

    if (customProps.source !== "github_import" || !customProps.githubImport) {
      throw new Error("This app was not imported from GitHub");
    }

    const repoFullName = customProps.githubImport.repoFullName;
    const baseBranch = customProps.githubImport.branch;

    // 2. Get GitHub connection and decrypt token
    const connection = await ctx.runQuery(internal.integrations.github.getGitHubConnectionInternal, {
      organizationId: args.organizationId,
    });
    if (!connection) {
      throw new Error("GitHub not connected.");
    }

    let accessToken = "";
    if (connection.accessToken) {
      accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
        encrypted: connection.accessToken,
      });
    }
    if (!accessToken) {
      throw new Error("GitHub not connected for this organization.");
    }

    // 3. Get all builder files for this app
    const allFiles = await ctx.runQuery(internal.fileSystemOntology.getFilesByAppInternal, {
      appId: args.appId,
    });

    // 4. Identify changed files (added by scaffold or modified by user)
    type BuilderFile = (typeof allFiles)[number];
    const changedFiles = allFiles.filter(
      (f: BuilderFile) => f.lastModifiedBy === "scaffold" || f.lastModifiedBy === "user"
    );

    if (changedFiles.length === 0) {
      throw new Error("No changes to commit. Add scaffold files or make modifications first.");
    }

    const addedFiles = changedFiles.filter((f: BuilderFile) => f.isScaffold).map((f: BuilderFile) => f.path);
    const modifiedFiles = changedFiles.filter((f: BuilderFile) => !f.isScaffold).map((f: BuilderFile) => f.path);

    console.log(`[GitHub PR] Creating PR: ${addedFiles.length} added, ${modifiedFiles.length} modified`);

    // 5. Get the latest commit SHA on the base branch
    const ref = await githubFetch<{ object: { sha: string } }>(
      `/repos/${repoFullName}/git/ref/heads/${baseBranch}`,
      accessToken
    );
    const baseSha = ref.object.sha;

    // 6. Create branch
    const branchName = args.branchName || `l4yercak3/add-platform-integration-${Date.now()}`;
    await githubFetch<{ ref: string }>(
      `/repos/${repoFullName}/git/refs`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      }
    );

    console.log(`[GitHub PR] Created branch: ${branchName}`);

    // 7. Create blobs for each changed file
    const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const file of changedFiles) {
      const blob = await githubFetch<{ sha: string }>(
        `/repos/${repoFullName}/git/blobs`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            content: utf8ToBase64(file.content),
            encoding: "base64",
          }),
        }
      );
      treeEntries.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }

    // 8. Create tree with the base tree
    const tree = await githubFetch<{ sha: string }>(
      `/repos/${repoFullName}/git/trees`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseSha,
          tree: treeEntries,
        }),
      }
    );

    // 9. Create commit
    const commitMessage = args.title || "Add l4yercak3 platform integration";
    const commit = await githubFetch<{ sha: string }>(
      `/repos/${repoFullName}/git/commits`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          message: commitMessage,
          tree: tree.sha,
          parents: [baseSha],
        }),
      }
    );

    // 10. Update branch ref to point to new commit
    await githubFetch(
      `/repos/${repoFullName}/git/refs/heads/${branchName}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha }),
      }
    );

    // 11. Create pull request
    const prBody = args.description || buildPRBody(addedFiles, modifiedFiles);
    const pr = await githubFetch<{ html_url: string; number: number }>(
      `/repos/${repoFullName}/pulls`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          title: commitMessage,
          head: branchName,
          base: baseBranch,
          body: prBody,
        }),
      }
    );

    console.log(`[GitHub PR] Created PR #${pr.number}: ${pr.html_url}`);

    return {
      prUrl: pr.html_url,
      prNumber: pr.number,
      branchName,
      addedFiles,
      modifiedFiles,
    };
  },
});

/**
 * Build a markdown PR body listing changes
 */
function buildPRBody(addedFiles: string[], modifiedFiles: string[]): string {
  let body = "## l4yercak3 Platform Integration\n\n";
  body += "This PR adds platform integration files generated by the l4yercak3 builder.\n\n";

  if (addedFiles.length > 0) {
    body += "### Added files\n";
    for (const f of addedFiles) {
      body += `- \`${f}\`\n`;
    }
    body += "\n";
  }

  if (modifiedFiles.length > 0) {
    body += "### Modified files\n";
    for (const f of modifiedFiles) {
      body += `- \`${f}\`\n`;
    }
    body += "\n";
  }

  body += "---\n";
  body += "*Generated by [l4yercak3 Builder](https://l4yercak3.com)*\n";

  return body;
}
