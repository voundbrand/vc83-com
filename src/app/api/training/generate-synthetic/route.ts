/**
 * API Route: Generate Synthetic Training Data
 *
 * Returns JSONL file with all 72 synthetic training examples.
 * This calls the generator script and returns the output directly.
 *
 * GET /api/training/generate-synthetic
 */

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const outputPath = path.join(process.cwd(), "scripts/training/output/synthetic-training-data.jsonl");

    // Check if the file already exists (use cached version for speed)
    // In production, you might want to always regenerate or use a timestamp check
    if (!fs.existsSync(outputPath)) {
      // Run the generator script
      await execAsync("npx tsx scripts/training/generate-synthetic.ts", {
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
      });
    }

    // Read the generated file
    const jsonlContent = fs.readFileSync(outputPath, "utf-8");

    // Count examples
    const exampleCount = jsonlContent.trim().split("\n").length;

    // Return as downloadable file
    return new NextResponse(jsonlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="synthetic-training-data-${exampleCount}-examples.jsonl"`,
        "X-Example-Count": exampleCount.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to generate synthetic data:", error);
    return NextResponse.json(
      { error: "Failed to generate synthetic training data" },
      { status: 500 }
    );
  }
}
