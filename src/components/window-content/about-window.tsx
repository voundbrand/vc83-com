"use client";

/**
 * About Window - Static platform information
 *
 * Shows general information about the L4YERCAK3 platform.
 * This is for non-logged-in users (guests).
 *
 * Future: Organizations can install an "About" app to create
 * their own custom about page with org-specific information.
 */
export function AboutWindow() {
  return (
    <div className="flex flex-col h-full px-4 py-2 overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--win95-text)' }}>🍰 About L4YERCAK3</h2>
        <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>Stack Your Startup Tools Like a Pro</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* What is Layer Cake */}
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>What is Layer Cake?</h3>
          <p className="text-sm leading-relaxed border-2 p-3 rounded" style={{
            color: 'var(--win95-text)',
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            Layer Cake is a retro-styled app platform that lets you stack essential business tools
            in one cohesive workspace. Think of it as your personal toolkit, where you can layer on
            invoicing, analytics, scheduling, and more—all accessible through a nostalgic 1983 desktop interface.
          </p>
        </div>

        {/* The Philosophy */}
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>The Philosophy</h3>
          <p className="text-sm leading-relaxed border-2 p-3 rounded" style={{
            color: 'var(--win95-text)',
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            Inspired by the movie &quot;Layer Cake,&quot; we believe in the power of stacking the right tools
            at the right time. No more juggling 15 browser tabs. No more context switching. Just you,
            your workspace, and the tools you need to grow your business.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>Features</h3>
          <div className="text-sm space-y-2 border-2 p-3 rounded" style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            <div className="flex items-start gap-2">
              <span style={{ color: 'var(--win95-highlight)' }}>📻</span>
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Podcasting:</strong> Manage episodes, guests, and releases
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: 'var(--win95-highlight)' }}>💰</span>
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Invoicing:</strong> Create professional invoices in seconds
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: 'var(--win95-highlight)' }}>📊</span>
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Analytics:</strong> Track performance and growth metrics
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: 'var(--win95-highlight)' }}>👥</span>
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Subscribers:</strong> Build and manage your email list
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: 'var(--win95-highlight)' }}>📅</span>
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Scheduling:</strong> Plan releases and automate workflows
              </div>
            </div>
          </div>
        </div>

        {/* Who is it for */}
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>Who is it for?</h3>
          <p className="text-sm leading-relaxed border-2 p-3 rounded" style={{
            color: 'var(--win95-text)',
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            Layer Cake is built for startup founders, content creators, and small business owners
            who want powerful tools without the complexity. Whether you&apos;re launching a podcast,
            running a SaaS startup, or building a creative agency, Layer Cake adapts to your workflow.
          </p>
        </div>

        {/* Why Retro */}
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>Why the Retro Aesthetic?</h3>
          <p className="text-sm leading-relaxed border-2 p-3 rounded" style={{
            color: 'var(--win95-text)',
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            Because nostalgia meets productivity. The 1983 desktop interface isn&apos;t just a design
            choice—it&apos;s a reminder that great tools don&apos;t need to be cluttered with distractions.
            Plus, who doesn&apos;t love that satisfying click of a floppy disk save icon?
          </p>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-2 mt-4">
        <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>Connect With Us</h3>
        <div className="flex flex-wrap gap-3 border-2 p-3 rounded" style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}>
          <a
            href="https://twitter.com/L4YERCAK3pod"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            @L4YERCAK3pod (Twitter)
          </a>
          <a
            href="https://www.linkedin.com/company/L4YERCAK3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            LinkedIn
          </a>
          <a
            href="https://open.spotify.com/show/L4YERCAK3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            Spotify Podcast
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-center border-t-2 pt-3 mt-4" style={{
        color: 'var(--neutral-gray)',
        borderColor: 'var(--win95-border)'
      }}>
        Built for startups • Inspired by the &apos;90s • Powered by L4YERCAK3
      </div>
    </div>
  );
}
