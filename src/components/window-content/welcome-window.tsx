"use client";

/**
 * Welcome Window - First impression for visitors
 *
 * This is an engaging landing experience that appears
 * as a moveable window. Explains the Layer Cake concept.
 */
export function WelcomeWindow() {
  return (
    <div className="p-6 space-y-4 h-full overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold mb-2 font-['Press_Start_2P']" style={{ color: 'var(--win95-text)' }}>
          🍰 L4YERCAK3
        </h1>
        <p className="text-base italic leading-relaxed" style={{ color: 'var(--win95-text)' }}>
          Stack Your Startup Tools Like a Pro
        </p>
      </div>

      <div className="space-y-3 text-sm leading-relaxed border-2 p-4 shadow-inner" style={{
        color: 'var(--win95-text)',
        background: 'var(--win95-bg-light)',
        borderColor: 'var(--win95-border)'
      }}>
        <p>
          Imagine a retro desktop where you layer on marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.
        </p>
        <p>
          No more tab-juggling chaos. Just you, your tools, and that satisfying click of a floppy disk saving your next big idea.
        </p>
        <p className="text-center font-semibold pt-2 border-t" style={{
          color: 'var(--win95-text)',
          borderColor: 'var(--win95-border)'
        }}>
          Welcome to the retro desktop experience!
        </p>
      </div>

      {/* Footer Tease */}
      <div className="text-xs text-center border-t-2 pt-3 mt-4" style={{
        color: 'var(--neutral-gray)',
        borderColor: 'var(--win95-border)'
      }}>
        Built for startups • Inspired by the &apos;90s • Powered by L4YERCAK3
      </div>
    </div>
  );
}
