import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware();

export const config = {
  // Don't invoke the auth middleware for these paths
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
