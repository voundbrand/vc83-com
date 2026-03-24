import NextAuth from "next-auth";
import { getSegelschuleAuthOptions } from "@/lib/auth";

function getRequestHost(request: unknown): string | null {
  if (!request || typeof request !== "object") {
    return null;
  }

  const maybeHeaders = (request as { headers?: Headers }).headers;
  if (!maybeHeaders || typeof maybeHeaders.get !== "function") {
    return null;
  }

  return maybeHeaders.get("x-forwarded-host") || maybeHeaders.get("host");
}

async function handler(
  ...args: Parameters<ReturnType<typeof NextAuth>>
): Promise<ReturnType<ReturnType<typeof NextAuth>>> {
  const authOptions = await getSegelschuleAuthOptions(process.env, {
    requestHost: getRequestHost(args[0]),
  });
  const resolvedHandler = NextAuth(authOptions);
  return resolvedHandler(...args);
}

export { handler as GET, handler as POST };
