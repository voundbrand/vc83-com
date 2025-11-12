/**
 * Generate API Key for Frontend Integration
 *
 * This script generates an API key that your frontend (pluseins.gg) can use
 * to authenticate with the backend API.
 *
 * Usage:
 *   npx convex run scripts/generate-api-key --sessionId "YOUR_SESSION_ID" --organizationId "YOUR_ORG_ID" --name "pluseins.gg Frontend"
 */

import { mutation } from "../convex/_generated/server";
import { v } from "convex/values";
import { api } from "../convex/_generated/api";

export default mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Call the generateApiKey mutation
    const result = await ctx.runMutation(api.api.auth.generateApiKey, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      name: args.name || "Frontend API Key",
    });

    console.log("\n🔑 API Key Generated Successfully!");
    console.log("=====================================");
    console.log(`Name: ${result.name}`);
    console.log(`Key: ${result.key}`);
    console.log("=====================================");
    console.log("\n⚠️  IMPORTANT: Copy this key now!");
    console.log("This is the only time it will be shown in full.\n");
    console.log("📝 Next Steps:");
    console.log("1. Copy the API key above");
    console.log("2. Add it to your Vercel project environment variables:");
    console.log("   Variable name: NEXT_PUBLIC_API_KEY");
    console.log(`   Value: ${result.key}`);
    console.log("3. Redeploy your frontend on Vercel\n");

    return result;
  },
});
