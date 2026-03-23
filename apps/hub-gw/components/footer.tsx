export function Footer() {
  return (
    <footer className="bg-[#245876] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo + tagline */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img
              src="/logo-white.svg"
              alt="Gründungswerft"
              className="h-6 w-auto"
            />
            <p className="mt-4 text-sm text-white/70">
              Since 2021
              <br />
              Handmade in Mecklenburg-Vorpommern
            </p>
          </div>

          {/* Szene */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
              Szene
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://gruendungswerft.com/community/"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Community
                </a>
              </li>
              <li>
                <a
                  href="https://gruendungswerft.com/members/"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mitglieder
                </a>
              </li>
              <li>
                <a
                  href="https://gruendungswerft.com/events/"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Veranstaltungen
                </a>
              </li>
              <li>
                <a
                  href="https://gruendungswerft.com/chapters/"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lokalverbände
                </a>
              </li>
            </ul>
          </div>

          {/* Zeuch */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
              Zeuch
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://gruendungswerft.com"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Homepage
                </a>
              </li>
              <li>
                <a
                  href="https://auth.gruendungswerft.com/"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mitgliederbereich
                </a>
              </li>
              <li>
                <a
                  href="https://gruendungswerft.com/impressum/"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Impressum
                </a>
              </li>
              <li>
                <a
                  href="https://gruendungswerft.com/datenschutz"
                  className="text-white/80 transition-colors hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Datenschutz
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
