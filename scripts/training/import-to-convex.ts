#!/usr/bin/env npx tsx
/**
 * IMPORT SYNTHETIC TRAINING DATA TO CONVEX
 *
 * Reads the generated JSONL file and imports it into the Convex database.
 *
 * Usage:
 *   npx tsx scripts/training/import-to-convex.ts
 *   npx tsx scripts/training/import-to-convex.ts --input ./custom-path.jsonl
 *   npx tsx scripts/training/import-to-convex.ts --batch-size 20
 */

import * as fs from "fs";
import { ConvexHttpClient } from "convex/browser";

// Import api with type suppression to avoid "Type instantiation is excessively deep" error
// This happens because the deeply nested validator types in the mutation args exceed TS limits
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require("../../convex/_generated/api").api;

// Default paths
const DEFAULT_INPUT = "./scripts/training/output/synthetic-training-data.jsonl";
const DEFAULT_BATCH_SIZE = 25; // Convex has limits on mutation size

interface SyntheticExample {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    example_type: "page_generation";
    source: "synthetic";
    template_name: string;
    prompt_variant: number;
    sections_count: number;
  };
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let inputPath = DEFAULT_INPUT;
  let batchSize = DEFAULT_BATCH_SIZE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === "--batch-size" && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.error(`   Run 'npx tsx scripts/training/generate-synthetic.ts' first`);
    process.exit(1);
  }

  // Get Convex URL from environment
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable not set");
    console.error("   Run this script with: CONVEX_URL=<your-url> npx tsx scripts/training/import-to-convex.ts");
    console.error("   Or ensure you have a .env.local file with the Convex URL");
    process.exit(1);
  }

  console.log(`\n📥 Importing Synthetic Training Data to Convex\n`);
  console.log(`📁 Input: ${inputPath}`);
  console.log(`🔗 Convex: ${convexUrl}`);
  console.log(`📦 Batch size: ${batchSize}`);

  // Read and parse JSONL
  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.trim().split("\n");
  const examples: SyntheticExample[] = lines.map((line) => JSON.parse(line));

  console.log(`\n📊 Found ${examples.length} examples to import`);

  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);

  // Import in batches
  let totalImported = 0;
  let totalSkipped = 0;

  for (let i = 0; i < examples.length; i += batchSize) {
    const batch = examples.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(examples.length / batchSize);

    process.stdout.write(`   Batch ${batchNum}/${totalBatches}... `);

    try {
      const result = await client.mutation(
        api.seed.seedSyntheticTraining.runSyntheticImport,
        { examples: batch }
      ) as {
        success: boolean;
        imported: number;
        skipped: number;
        total: number;
      };

      totalImported += result.imported;
      totalSkipped += result.skipped;

      console.log(`✓ imported: ${result.imported}, skipped: ${result.skipped}`);
    } catch (error) {
      console.log(`❌ failed`);
      console.error(`   Error: ${error}`);

      // Continue with next batch
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   📈 Imported: ${totalImported}`);
  console.log(`   ⏭️  Skipped (duplicates): ${totalSkipped}`);
  console.log(`   📊 Total processed: ${examples.length}`);

  // Get final stats
  try {
    const stats = await client.query(api.seed.seedSyntheticTraining.getSyntheticStats, {}) as {
      totalSynthetic: number;
      byTemplate: Record<string, number>;
      hasData: boolean;
    };
    console.log(`\n📋 Current synthetic data in database:`);
    console.log(`   Total: ${stats.totalSynthetic}`);
    if (Object.keys(stats.byTemplate).length > 0) {
      console.log(`   By template:`);
      for (const [template, count] of Object.entries(stats.byTemplate)) {
        console.log(`     - ${template}: ${count}`);
      }
    }
  } catch (error) {
    // Stats query might fail if schema doesn't match, that's ok
  }

  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Check the AI System dashboard to see the imported data`);
  console.log(`   2. Export combined data (synthetic + real) to Hugging Face`);
  console.log(`   3. Start fine-tuning with AutoTrain`);
  console.log(``);
}

main().catch(console.error);
