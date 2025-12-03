/**
 * Helper script to get your Linear Team ID
 *
 * Usage:
 *   LINEAR_API_KEY=your_key npx tsx scripts/get-linear-team-id.ts
 */

import { LinearClient } from "@linear/sdk";

async function getTeamId() {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: LINEAR_API_KEY not set");
    console.log("\nUsage:");
    console.log("  LINEAR_API_KEY=your_key npx tsx scripts/get-linear-team-id.ts");
    process.exit(1);
  }

  console.log("🔍 Fetching teams from Linear...\n");

  try {
    const linear = new LinearClient({ apiKey });
    const teams = await linear.teams();

    if (teams.nodes.length === 0) {
      console.log("❌ No teams found. Check your API key.");
      process.exit(1);
    }

    console.log("✅ Found teams:\n");

    teams.nodes.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}`);
      console.log(`   Team ID: ${team.id}`);
      console.log(`   Key: ${team.key}`);
      console.log("");
    });

    console.log("📋 Add this to your .env file:");
    console.log(`LINEAR_TEAM_ID=${teams.nodes[0].id}`);

    if (teams.nodes.length > 1) {
      console.log("\n⚠️  Multiple teams found. Choose the team where you want feature requests.");
    }

  } catch (error: any) {
    console.error("❌ Error fetching teams:", error.message);
    process.exit(1);
  }
}

getTeamId();
