import { headers } from "next/headers"
import { resolveSegelschuleAuthClientConfig } from "@/lib/auth"
import { getRequestHostFromHeaders } from "@/lib/request-host"
import { CmsAdminLoginCard } from "@/components/cms-admin-login-card"

export default async function AdminPage() {
  const requestHeaders = await headers()
  const requestHost = getRequestHostFromHeaders(requestHeaders)
  const authConfig = await resolveSegelschuleAuthClientConfig(process.env, {
    requestHost,
  })

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg, #fffbea 0%, #fff6c3 100%)",
      }}
    >
      <CmsAdminLoginCard
        authMode={authConfig.mode}
        authProviderId={authConfig.providerId}
      />
    </main>
  )
}
