import Link from "next/link";
import { COOKIE_POLICY_VERSION } from "@/lib/cookie-consent";
import { legalCompanyInfo, legalPolicyMeta } from "@/lib/legal-content";

export const metadata = {
  title: "Cookie & Consent Policy | sevenlayers.io",
  description: "Cookie and consent controls for the sevenlayers main application",
};

export default function CookiesPage() {
  const storageItems = [
    {
      name: "cookie_consent (localStorage)",
      type: "Essential / Consent record",
      purpose:
        "Stores your explicit consent decision (accept/decline), policy version, and timestamp.",
      legalBasis: "Art. 6(1)(c), Art. 6(1)(f), and where applicable Art. 7 GDPR documentation duties",
      duration: "Until changed by user or cleared locally",
    },
    {
      name: "vc83_cookie_banner_dismissed (localStorage)",
      type: "Functional",
      purpose:
        "Stores that you dismissed the banner before making a full decision, so the banner is non-intrusive.",
      legalBasis: "Art. 6(1)(f) GDPR (usability and proportional presentation)",
      duration: "Until decision is made or local storage is cleared",
    },
    {
      name: "Authentication/session cookies",
      type: "Essential",
      purpose:
        "Maintain authenticated sessions and protect requests against unauthorized use.",
      legalBasis: "Art. 6(1)(b) GDPR (service contract) and Art. 6(1)(f) GDPR (security)",
      duration: "Session-bound or provider-defined",
    },
    {
      name: "Optional analytics storage",
      type: "Optional (consent only)",
      purpose:
        "Currently disabled by default. May be activated only after explicit opt-in and documented policy update.",
      legalBasis: "Art. 6(1)(a) GDPR (consent)",
      duration: "Only while optional analytics is enabled and for the documented retention window",
    },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 text-slate-200">
      <article>
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Cookie & Consent Policy
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-300">
            This policy describes how the sevenlayers main application uses cookies and similar
            storage technologies, and how you can grant, refuse, or withdraw optional consent at
            any time.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Last Updated: {legalPolicyMeta.lastUpdatedLabel} | Policy Version: {COOKIE_POLICY_VERSION}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">1. What this policy covers</h2>
            <p>
              We use a minimal storage approach in the main application. Essential storage supports
              login, security, and legal consent documentation. Optional analytics remains
              deactivated unless and until you provide explicit consent.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              2. Storage technologies used in this app
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 pr-4 font-semibold text-slate-100">Name</th>
                    <th className="py-3 pr-4 font-semibold text-slate-100">Type</th>
                    <th className="py-3 pr-4 font-semibold text-slate-100">Purpose</th>
                    <th className="py-3 pr-4 font-semibold text-slate-100">Legal Basis</th>
                    <th className="py-3 font-semibold text-slate-100">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {storageItems.map((row, index) => (
                    <tr
                      key={row.name}
                      className={index < storageItems.length - 1 ? "border-b border-slate-800" : undefined}
                    >
                      <td className="py-3 pr-4">{row.name}</td>
                      <td className="py-3 pr-4">{row.type}</td>
                      <td className="py-3 pr-4">{row.purpose}</td>
                      <td className="py-3 pr-4">{row.legalBasis}</td>
                      <td className="py-3">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              3. Essential versus optional storage
            </h2>
            <p>
              <strong className="text-slate-100">Essential storage:</strong> required for core app
              operation, security controls, and legally required consent evidence.
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">Optional analytics:</strong> processed only after
              explicit opt-in; decline keeps optional analytics disabled.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              4. Giving, refusing, and withdrawing consent
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>
                <strong className="text-slate-100">Give consent:</strong> use the cookie notice or
                settings controls to accept optional analytics.
              </li>
              <li>
                <strong className="text-slate-100">Refuse consent:</strong> choose decline; only
                essential storage remains active.
              </li>
              <li>
                <strong className="text-slate-100">Withdraw or change later:</strong> open the
                persistent `Legal & Cookies` floating control at any time; changing consent is as
                easy as granting it.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              5. Browser controls and local deletion
            </h2>
            <p>
              You can clear cookies/local storage in your browser at any time. Deleting storage may
              require renewed login and renewed consent selection.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              6. Third-country transfers
            </h2>
            <p>
              Optional analytics is currently fail-closed by default. The current optional analytics
              processor is PostHog and is only used after explicit opt-in. If optional processing
              introduces transfers outside the EU/EEA, we disclose the transfer path and safeguards
              (for example EU Standard Contractual Clauses) before activation.
            </p>
            <p className="mt-3">
              Processor coverage is reviewed continuously. Material processor-list updates are
              published in this policy and in the Privacy Policy before rollout.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">7. Policy changes</h2>
            <p>
              Material policy updates are versioned. If required, we request a fresh consent
              decision for the updated version.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">8. Controller and contact</h2>
            <p>
              Questions about cookies or consent controls can be sent to{" "}
              <a href={`mailto:${legalCompanyInfo.email}`} className="text-violet-400 underline">
                {legalCompanyInfo.email}
              </a>
            </p>
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <p className="font-semibold text-slate-100">{legalCompanyInfo.name}</p>
              <p>{legalCompanyInfo.street}</p>
              <p>
                {legalCompanyInfo.zip} {legalCompanyInfo.city}
              </p>
              <p>{legalCompanyInfo.country}</p>
              <p>Managing Director: {legalCompanyInfo.managingDirector}</p>
              <p>
                Register Court: {legalCompanyInfo.registerCourt}, {legalCompanyInfo.registerNumber}
              </p>
              <p>VAT ID: {legalCompanyInfo.vatId}</p>
              <p>Email: {legalCompanyInfo.email}</p>
            </div>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">See also</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-violet-400 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-violet-400 hover:underline">
              Terms of Service
            </Link>
            <Link href="/impressum" className="text-violet-400 hover:underline">
              Impressum
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
