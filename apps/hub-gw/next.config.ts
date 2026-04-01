import type { NextConfig } from "next";
import path from "node:path";

const allowedDevOrigins = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXTAUTH_URL,
      "http://localhost:3003",
      "https://sevenlayers.ngrok.pizza",
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  )
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  allowedDevOrigins,
};

export default nextConfig;
