import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ConvexRunInput {
  functionName: string;
  args: Record<string, unknown>;
  execute: boolean;
}

export interface ConvexRunResult {
  executed: boolean;
  command: string;
  stdout: string;
  stderr: string;
  parsedJson: unknown | null;
}

function parseJsonFromOutput(stdout: string): unknown | null {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines[index];
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      continue;
    }
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

export async function runConvexFunction(input: ConvexRunInput): Promise<ConvexRunResult> {
  const argsJson = JSON.stringify(input.args);
  const command = `npx convex run ${input.functionName} --args '${argsJson}'`;

  if (!input.execute) {
    return {
      executed: false,
      command,
      stdout: "",
      stderr: "",
      parsedJson: null
    };
  }

  const { stdout, stderr } = await execFileAsync("npx", [
    "convex",
    "run",
    input.functionName,
    "--args",
    argsJson
  ]);

  return {
    executed: true,
    command,
    stdout,
    stderr,
    parsedJson: parseJsonFromOutput(stdout)
  };
}
