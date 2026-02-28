"use client";

import { Radio, CircleDollarSign, BarChart3, Users, Calendar, Info } from "lucide-react";

/**
 * About Window - Static platform information
 *
 * Shows general information about the l4yercak3 platform.
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
        <h2 className="text-2xl font-bold mb-1 flex items-center justify-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Info className="h-6 w-6" />
          About sevenlayers.io
        </h2>
        <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>Stack Your Startup Tools Like a Pro</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* What is Layer Cake */}
        <div className="space-y-2">
          <h3 className="font-semibold" style={{ color: 'var(--win95-text)' }}>What is sevenlayers.io?</h3>
          <p className="text-sm leading-relaxed border-2 p-3 rounded" style={{
            color: 'var(--win95-text)',
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            sevenlayers.io is a private AI operator platform for business owners running
            companies between &euro;1M and &euro;50M. One operator, yours alone, built on your business,
            your clients, and your way of working. C-suite leverage at a fraction of the payroll.
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
            Every successful business owner hits a ceiling &mdash; not because they can&apos;t grow,
            but because nothing they&apos;ve hired or bought can hold what they carry in their head.
            sevenlayers.io builds one AI operator around you. Private, sovereign, built specifically
            on your business, your clients, and your judgment.
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
              <Radio className="h-4 w-4 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Podcasting:</strong> Manage episodes, guests, and releases
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CircleDollarSign className="h-4 w-4 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Invoicing:</strong> Create professional invoices in seconds
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BarChart3 className="h-4 w-4 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Analytics:</strong> Track performance and growth metrics
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div style={{ color: 'var(--win95-text)' }}>
                <strong>Subscribers:</strong> Build and manage your email list
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
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
            Business owners running &euro;1M&ndash;&euro;50M companies who already know they are the
            integration layer between every system. The work that matters most still lives in their
            head. sevenlayers.io is the first hire that actually compounds.
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
            href="https://twitter.com/sevenlayers_io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            @sevenlayers_io (Twitter)
          </a>
          <a
            href="https://www.linkedin.com/company/sevenlayers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            LinkedIn
          </a>
          <a
            href="https://open.spotify.com/show/sevenlayers"
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
        Private AI. You can Trust. • Powered by sevenlayers.io
      </div>
    </div>
  );
}
