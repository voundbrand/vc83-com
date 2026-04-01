import Link from "next/link";
import { legalCompanyInfo, legalPagesContent, legalPolicyMeta } from "@/lib/legal-content";

export const metadata = {
  title: "Privacy Policy | sevenlayers.io",
  description: "How sevenlayers collects, uses, and protects personal data",
};

export default function PrivacyPage() {
  const t = legalPagesContent.privacy;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 text-slate-200">
      <article>
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-300">{t.subtitle}</p>
          <p className="mt-4 text-xs text-slate-500">
            Last Updated: {legalPolicyMeta.lastUpdatedLabel}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s1Title}</h2>
            <p>
              <strong className="text-slate-100">{legalCompanyInfo.name}</strong> {t.s1Text}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s2Title}</h2>
            <p>{t.s2Text}</p>
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm">
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
              <p>Email: {legalCompanyInfo.email}</p>
              <p>UST-ID: {legalCompanyInfo.vatId}</p>
            </div>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s2DpoLabel}</strong> {t.s2DpoText}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s3Title}</h2>
            <p>{t.s3Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s3Items.map((item) => (
                <li key={item.label}>
                  <strong className="text-slate-100">{item.label}</strong>: {item.desc}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s4Title}</h2>
            <p>{t.s4Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s4Items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s5Title}</h2>
            <p>{t.s5Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s5Items.map((item) => (
                <li key={item.label}>
                  <strong className="text-slate-100">{item.label}</strong>: {item.desc}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s6Title}</h2>
            <p>{t.s6Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s6Items.map((item) => (
                <li key={item.label}>
                  <strong className="text-slate-100">{item.label}</strong>: {item.desc}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t.s6UpdateText}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s7Title}</h2>
            <p>{t.s7Text}</p>
            <p className="mt-3">
              For the main app runtime, we apply a fail-closed privacy posture: optional analytics
              remain disabled until an explicit consent choice exists for the current policy
              version.
            </p>
            <p className="mt-3">
              You can grant, refuse, or later withdraw optional analytics consent from the same
              `Legal & Cookies` controls at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s8Title}</h2>
            <p>{t.s8Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s8Items.map((item) => (
                <li key={item.label}>
                  <strong className="text-slate-100">{item.label}</strong>: {item.desc}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              These retention windows are reviewed at least annually and tightened where practical.
              Data that is no longer required is deleted or irreversibly anonymized.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              Main App Supplement (Operational Scope)
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>Account/session data to authenticate users and protect sessions.</li>
              <li>Consent records to document optional analytics decisions and withdrawals.</li>
              <li>Service interaction metadata for reliability, abuse prevention, and debugging.</li>
              <li>Billing and contract data where required for statutory accounting retention.</li>
            </ul>
            <p className="mt-3">
              This supplement applies to the main application UI and complements the general
              privacy sections above.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s9Title}</h2>
            <p>{t.s9Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s9Items.map((item) => (
                <li key={item.label}>
                  <strong className="text-slate-100">{item.label}</strong>: {item.desc}
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <p className="font-semibold text-slate-100">{t.s9AuthorityTitle}</p>
              <p>{t.s9AuthorityName}</p>
              <p>{t.s9AuthorityAddress}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s10Title}</h2>
            <p>{t.s10Text}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s11Title}</h2>
            <p>{t.s11Text}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s12Title}</h2>
            <p>{t.s12Text}</p>
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
            <Link href="/impressum" className="text-violet-400 hover:underline">
              Impressum
            </Link>
            <Link href="/cookies" className="text-violet-400 hover:underline">
              {t.seeAlsoCookies}
            </Link>
            <Link href="/terms" className="text-violet-400 hover:underline">
              {t.seeAlsoTerms}
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
