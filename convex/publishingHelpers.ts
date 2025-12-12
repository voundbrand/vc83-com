/**
 * Publishing Helpers
 *
 * Utility functions for web publishing and deployment
 */

/**
 * Generate Vercel Deploy Button URL from GitHub Repository
 *
 * Creates the official Vercel "Deploy Button" URL that allows one-click deployment.
 * Format: https://vercel.com/new/clone?repository-url={GITHUB_URL}&env={ENV_VARS}&...
 *
 * @param githubRepo - GitHub repository URL (e.g., "https://github.com/owner/repo")
 * @param envVars - Array of environment variable configurations
 * @param projectName - Optional custom project name
 * @returns Vercel deploy button URL
 *
 * @see https://vercel.com/docs/deploy-button
 */
export function generateVercelDeployUrl(
  githubRepo: string,
  envVars?: Array<{ key: string; description: string; required: boolean; defaultValue?: string }>,
  projectName?: string
): string {
  // Validate GitHub URL
  if (!githubRepo || !githubRepo.startsWith('https://github.com/')) {
    throw new Error("Invalid GitHub repository URL. Must start with 'https://github.com/'");
  }

  // Extract repo name from URL for default project name
  const repoMatch = githubRepo.match(/github\.com\/([\w-]+)\/([\w-]+)/);
  if (!repoMatch) {
    throw new Error("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
  }

  const [, owner, repo] = repoMatch;
  const defaultProjectName = projectName || repo;

  // Build base URL
  const params = new URLSearchParams();
  params.set('repository-url', githubRepo);

  // Add environment variables if provided
  if (envVars && envVars.length > 0) {
    const requiredEnvVars = envVars.filter(v => v.required);

    if (requiredEnvVars.length > 0) {
      // Add env var keys (comma-separated)
      const envKeys = requiredEnvVars.map(v => v.key).join(',');
      params.set('env', envKeys);

      // Add description
      const envDescription = `Required environment variables for ${defaultProjectName}`;
      params.set('envDescription', envDescription);

      // Add individual env var descriptions (Vercel supports this for better UX)
      requiredEnvVars.forEach((envVar) => {
        params.set(`env-${envVar.key}-description`, envVar.description);
        if (envVar.defaultValue) {
          params.set(`env-${envVar.key}-default`, envVar.defaultValue);
        }
      });
    }
  }

  // Add project name
  params.set('project-name', defaultProjectName);
  params.set('repository-name', defaultProjectName);

  return `https://vercel.com/new/clone?${params.toString()}`;
}

/**
 * Validate if a URL is a valid Vercel deploy button URL
 */
export function isValidVercelDeployUrl(url: string): boolean {
  try {
    if (!url.startsWith('https://vercel.com/new/clone')) {
      return false;
    }

    const parsedUrl = new URL(url);
    const repoUrl = parsedUrl.searchParams.get('repository-url');

    // Must have a repository-url parameter or GitHub URL in path
    if (!repoUrl && !parsedUrl.pathname.includes('github.com')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract GitHub repo URL from Vercel deploy button URL
 */
export function extractGithubRepoFromVercelUrl(vercelUrl: string): string | null {
  try {
    const parsedUrl = new URL(vercelUrl);
    return parsedUrl.searchParams.get('repository-url');
  } catch {
    return null;
  }
}
