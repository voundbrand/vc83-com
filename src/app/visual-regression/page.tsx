import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorInput,
  InteriorPanel,
  InteriorRoot,
  InteriorSectionHeader,
  InteriorSelect,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTextarea,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

const PRIMARY_MENU_ITEMS = [
  "Browse all apps (34)",
  "Search apps",
  "Popular products",
  "New products",
];

const WINDOW_TABS = ["Web Publishing", "Store", "Control Panel"];

const NAV_ITEMS = ["Overview", "Publishing", "Deployments", "Webchat", "Monitoring"];

const RAIL_ITEMS = ["Overview", "App shell", "Buttons", "Panels", "Forms", "Rail"];

export default function VisualRegressionPage() {
  return (
    <main className="min-h-screen p-6 md:p-8" style={{ background: "var(--background)" }}>
      <section
        data-testid="visual-shell-scene"
        className="mx-auto w-full max-w-[1280px] rounded-xl border p-4"
        style={{
          background: "var(--tone-surface)",
          borderColor: "var(--desktop-shell-border)",
        }}
      >
        <header className="desktop-taskbar rounded-lg px-3 py-2">
          <div className="flex items-center gap-3">
            <button type="button" className="desktop-topbar-link desktop-topbar-link-active px-3 py-1 text-xs font-semibold">
              Product OS
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              {WINDOW_TABS.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`desktop-window-tab truncate px-3 py-1 text-xs font-medium ${
                    index === 0 ? "desktop-window-tab-active" : ""
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button type="button" className="desktop-taskbar-action px-3 py-1 text-xs font-medium">
              Theme
            </button>
            <button type="button" className="desktop-taskbar-action px-3 py-1 text-xs font-medium">
              Profile
            </button>
          </div>
        </header>

        <div className="mt-2 flex">
          <div className="desktop-taskbar-menu w-[280px] rounded-md p-1">
            {PRIMARY_MENU_ITEMS.map((item, index) => (
              <button
                key={item}
                type="button"
                className="desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs"
                style={index === 0 ? { background: "var(--desktop-menu-hover)" } : undefined}
              >
                {item}
              </button>
            ))}
            <div className="desktop-taskbar-menu-divider my-1" />
            <button type="button" className="desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs">
              Categories
            </button>
            <button type="button" className="desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs">
              Pricing
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[220px_minmax(0,1fr)_220px] gap-4">
          <InteriorPanel className="space-y-2 p-3">
            <InteriorSectionHeader>Navigation</InteriorSectionHeader>
            {NAV_ITEMS.map((item, index) => (
              <InteriorButton
                key={item}
                variant={index === 0 ? "subtle" : "ghost"}
                size="sm"
                className="w-full justify-start rounded-md px-2"
              >
                {item}
              </InteriorButton>
            ))}
          </InteriorPanel>

          <div className="desktop-shell-window window-corners overflow-hidden">
            <div className="desktop-shell-titlebar window-titlebar-corners flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold" style={{ color: "var(--shell-titlebar-text)" }}>
                Web Publishing
              </span>
              <div className="flex gap-1">
                <button type="button" className="desktop-shell-control-button text-xs" aria-label="Minimize preview window">
                  -
                </button>
                <button type="button" className="desktop-shell-control-button text-xs" aria-label="Maximize preview window">
                  []
                </button>
                <button type="button" className="desktop-shell-control-button text-xs" aria-label="Close preview window">
                  X
                </button>
              </div>
            </div>

            <div className="desktop-document-surface p-4">
              <InteriorRoot className="space-y-4">
                <InteriorHeader className="space-y-1 pb-3">
                  <InteriorTitle>Deployment Surface</InteriorTitle>
                  <InteriorHelperText>
                    Snapshot harness for dark and sepia style enforcement.
                  </InteriorHelperText>
                </InteriorHeader>

                <InteriorTabRow>
                  <InteriorTabButton active>Overview</InteriorTabButton>
                  <InteriorTabButton>Checks</InteriorTabButton>
                  <InteriorTabButton>Activity</InteriorTabButton>
                </InteriorTabRow>

                <div className="grid grid-cols-[1.2fr_1fr] gap-3">
                  <InteriorPanel className="space-y-3">
                    <div className="flex items-center justify-between">
                      <InteriorSectionHeader>Latest Deployment</InteriorSectionHeader>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{
                          borderColor: "var(--button-primary-border, var(--tone-accent-strong))",
                          background: "var(--button-primary-bg, var(--tone-accent))",
                          color: "var(--button-primary-text, var(--tone-text-primary))",
                        }}
                      >
                        Healthy
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      Build `wc-2026.02.19` published with modern shell primitives and tokenized surfaces.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <InteriorButton variant="primary" size="sm">
                        Deploy
                      </InteriorButton>
                      <InteriorButton size="sm">Rollback</InteriorButton>
                      <InteriorButton variant="subtle" size="sm">
                        View Log
                      </InteriorButton>
                      <InteriorButton variant="danger" size="sm">
                        Disable
                      </InteriorButton>
                    </div>
                  </InteriorPanel>

                  <InteriorPanel className="space-y-3">
                    <InteriorSectionHeader>Config</InteriorSectionHeader>
                    <label className="space-y-1 text-xs font-medium">
                      <span>Environment</span>
                      <InteriorSelect defaultValue="production">
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                      </InteriorSelect>
                    </label>
                    <label className="space-y-1 text-xs font-medium">
                      <span>Domain</span>
                      <InteriorInput value="webchat.example.com" readOnly />
                    </label>
                    <label className="space-y-1 text-xs font-medium">
                      <span>Notes</span>
                      <InteriorTextarea
                        value="Keep dark surfaces dark; keep sepia layered with lighter content surfaces."
                        readOnly
                      />
                    </label>
                  </InteriorPanel>
                </div>
              </InteriorRoot>
            </div>
          </div>

          <InteriorPanel className="space-y-2 p-3">
            <InteriorSectionHeader>Jump To</InteriorSectionHeader>
            {RAIL_ITEMS.map((item, index) => (
              <button
                key={item}
                type="button"
                className="desktop-taskbar-menu-item w-full rounded-sm px-2 py-1 text-left text-xs"
                style={index === 0 ? { background: "var(--desktop-menu-hover)" } : undefined}
              >
                {item}
              </button>
            ))}
          </InteriorPanel>
        </div>
      </section>
    </main>
  );
}
