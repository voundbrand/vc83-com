import Link from "next/link";
import { legalCompanyInfo, legalPagesContent, legalPolicyMeta } from "@/lib/legal-content";

export const metadata = {
  title: "Terms of Service | sevenlayers.io",
  description: "Terms of service for sevenlayers.io",
};

export default function TermsPage() {
  const t = legalPagesContent.terms;

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
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              Contracting Party (Service Provider)
            </h2>
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <p className="font-semibold text-slate-100">{legalCompanyInfo.name}</p>
              <p>
                {legalCompanyInfo.street}, {legalCompanyInfo.zip} {legalCompanyInfo.city},{" "}
                {legalCompanyInfo.country}
              </p>
              <p>Managing Director: {legalCompanyInfo.managingDirector}</p>
              <p>
                Register Court: {legalCompanyInfo.registerCourt}, {legalCompanyInfo.registerNumber}
              </p>
              <p>VAT ID: {legalCompanyInfo.vatId}</p>
              <p>Email: {legalCompanyInfo.email}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s1Title}</h2>
            <p>{t.s1Text1}</p>
            <p className="mt-3">{t.s1Text2}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s2Title}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s2Items.map((item) => (
                <li key={item.label}>
                  <strong className="text-slate-100">{item.label}</strong>: {item.desc}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s3Title}</h2>
            <p>
              <strong className="text-slate-100">{t.s3Eligibility}</strong> {t.s3EligibilityText}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s3Info}</strong> {t.s3InfoText}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s3Security}</strong> {t.s3SecurityText}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s4Title}</h2>
            <p>
              <strong className="text-slate-100">{t.s4License}</strong> {t.s4LicenseText}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s4Restrictions}</strong> {t.s4RestrictionsIntro}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-6">
              {t.s4RestrictionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s4Exception}</strong> {t.s4ExceptionText}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s5Title}</h2>
            <p>{t.s5Intro}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              {t.s5Items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s6Title}</h2>
            <p>
              <strong className="text-slate-100">{t.s6OurRights}</strong> {t.s6OurRightsText}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s6YourContent}</strong> {t.s6YourContentText}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s7Title}</h2>
            <p>{t.s7Text}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s8Title}</h2>
            <p>
              <strong className="text-slate-100">{t.s8Unlimited}</strong> {t.s8UnlimitedText}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s8Limited}</strong> {t.s8LimitedText}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s8FreeTier}</strong> {t.s8FreeTierText}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s9Title}</h2>
            <p>{t.s9Intro}</p>
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
              <p className="font-semibold text-slate-100">{t.s9BoxTitle}</p>
              <p className="mt-2">{t.s9BoxText}</p>
              <p className="mt-2 font-semibold text-slate-100">{t.s9EffectsTitle}</p>
              <p className="mt-2">{t.s9EffectsText}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s10Title}</h2>
            <p>
              <strong className="text-slate-100">{t.s10Odr}</strong> {t.s10OdrTextPre}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              {t.s10OdrTextPost}
            </p>
            <p className="mt-3">
              <strong className="text-slate-100">{t.s10Jurisdiction}</strong> {t.s10JurisdictionText}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">
              Additional Main-App Operational Terms
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>
                Optional analytics features are disabled by default and only operate after explicit
                consent.
              </li>
              <li>
                You can revoke optional analytics consent at any time from the persistent legal and
                cookie controls in the app UI.
              </li>
              <li>
                Service-specific enterprise or reseller contracts take precedence where explicitly
                agreed in writing.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">{t.s11Title}</h2>
            <p>{t.s11Text}</p>
            <p className="mt-3">
              Material terms updates are published with a revision date. Continued use after an
              effective date may require acceptance of updated terms.
            </p>
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
              <p>Email: {legalCompanyInfo.email}</p>
            </div>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">See also</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-violet-400 hover:underline">
              {t.seeAlsoPrivacy}
            </Link>
            <Link href="/cookies" className="text-violet-400 hover:underline">
              {t.seeAlsoCookies}
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
