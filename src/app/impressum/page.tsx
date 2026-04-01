import Link from "next/link";
import { legalCompanyInfo } from "@/lib/legal-content";

export const metadata = {
  title: "Impressum | sevenlayers.io",
  description: "Legal notice for sevenlayers.io",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 text-slate-200">
      <h1 className="mb-4 text-3xl font-semibold">Impressum</h1>
      <p className="mb-6 text-sm text-slate-400">Stand: 27. März 2026</p>

      <section className="space-y-6 text-sm leading-6 text-slate-300">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Angaben gemäß § 5 DDG (vormals § 5 TMG)
          </h2>
          <p>{legalCompanyInfo.name}</p>
          <p>{legalCompanyInfo.street}</p>
          <p>
            {legalCompanyInfo.zip} {legalCompanyInfo.city}
          </p>
          <p>Deutschland</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-100">Vertretungsberechtigt</h2>
          <p>Geschäftsführer: {legalCompanyInfo.managingDirector}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-100">Kontakt</h2>
          <p>E-Mail: {legalCompanyInfo.email}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-100">Handelsregister</h2>
          <p>Registergericht: {legalCompanyInfo.registerCourt}</p>
          <p>Registernummer: {legalCompanyInfo.registerNumber}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-100">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:{" "}
            {legalCompanyInfo.vatId}
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <p>
            {legalCompanyInfo.representative}, {legalCompanyInfo.name}, Anschrift wie oben.
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="text-violet-400 hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="text-violet-400 hover:underline">
          Terms
        </Link>
        <Link href="/cookies" className="text-violet-400 hover:underline">
          Cookie Policy
        </Link>
      </div>
    </main>
  );
}
