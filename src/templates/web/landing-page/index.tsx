/**
 * LANDING PAGE TEMPLATE
 *
 * Classic landing page structure:
 * - Header with logo
 * - Hero section with headline and CTA
 * - Features section
 * - Testimonials section
 * - Pricing section
 * - Footer with links
 *
 * Theme-agnostic: Accepts any theme for styling.
 */

import { TemplateProps } from "../../types";
import { LandingPageContent } from "./schema";
import styles from "./styles.module.css";

export function LandingPageTemplate({
  page,
  data,
  organization,
  theme,
}: TemplateProps) {
  // Get template content from page.customProperties.templateContent
  // This is where the content is actually stored when creating/editing pages
  const content = (page.customProperties?.templateContent as unknown as LandingPageContent) || {} as LandingPageContent;

  // Apply theme as CSS variables
  const cssVars = {
    "--color-primary": theme.colors.primary,
    "--color-secondary": theme.colors.secondary,
    "--color-accent": theme.colors.accent,
    "--color-background": theme.colors.background,
    "--color-surface": theme.colors.surface,
    "--color-text": theme.colors.text,
    "--color-textLight": theme.colors.textLight,
    "--color-textDark": theme.colors.textDark,
    "--color-border": theme.colors.border,
    "--color-success": theme.colors.success,
    "--color-error": theme.colors.error,
    "--color-warning": theme.colors.warning,
    "--color-info": theme.colors.info,
    "--font-heading": theme.typography.fontFamily.heading,
    "--font-body": theme.typography.fontFamily.body,
    "--font-mono": theme.typography.fontFamily.mono,
    "--font-size-h1": theme.typography.fontSize.h1,
    "--font-size-h2": theme.typography.fontSize.h2,
    "--font-size-h3": theme.typography.fontSize.h3,
    "--font-size-body": theme.typography.fontSize.body,
    "--font-size-small": theme.typography.fontSize.small,
    "--font-weight-normal": theme.typography.fontWeight.normal,
    "--font-weight-medium": theme.typography.fontWeight.medium,
    "--font-weight-semibold": theme.typography.fontWeight.semibold,
    "--font-weight-bold": theme.typography.fontWeight.bold,
    "--line-height-tight": theme.typography.lineHeight.tight,
    "--line-height-normal": theme.typography.lineHeight.normal,
    "--line-height-relaxed": theme.typography.lineHeight.relaxed,
    "--spacing-xs": theme.spacing.xs,
    "--spacing-sm": theme.spacing.sm,
    "--spacing-md": theme.spacing.md,
    "--spacing-lg": theme.spacing.lg,
    "--spacing-xl": theme.spacing.xl,
    "--spacing-2xl": theme.spacing["2xl"],
    "--spacing-3xl": theme.spacing["3xl"],
    "--spacing-4xl": theme.spacing["4xl"],
    "--border-radius-none": theme.borderRadius.none,
    "--border-radius-sm": theme.borderRadius.sm,
    "--border-radius-md": theme.borderRadius.md,
    "--border-radius-lg": theme.borderRadius.lg,
    "--border-radius-xl": theme.borderRadius.xl,
    "--border-radius-full": theme.borderRadius.full,
    "--shadow-none": theme.shadows.none,
    "--shadow-sm": theme.shadows.sm,
    "--shadow-md": theme.shadows.md,
    "--shadow-lg": theme.shadows.lg,
    "--shadow-xl": theme.shadows.xl,
    "--shadow-2xl": theme.shadows["2xl"],
    "--layout-maxWidth-sm": theme.layout.maxWidth.sm,
    "--layout-maxWidth-md": theme.layout.maxWidth.md,
    "--layout-maxWidth-lg": theme.layout.maxWidth.lg,
    "--layout-maxWidth-xl": theme.layout.maxWidth.xl,
    "--layout-maxWidth-2xl": theme.layout.maxWidth["2xl"],
  } as React.CSSProperties;

  return (
    <div className={styles.template} style={cssVars}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>{organization.name}</div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          {content.hero?.headline || page.name || "Welcome"}
        </h1>
        <p className={styles.heroSubtitle}>
          {content.hero?.subheadline || page.customProperties?.metaDescription || ""}
        </p>
        {content.hero?.ctaText && (
          <a
            href={content.hero.ctaUrl || "#"}
            className={styles.ctaButton}
            style={{ display: "inline-block", marginTop: "var(--spacing-lg)" }}
          >
            {content.hero.ctaText}
          </a>
        )}
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className={styles.content}>
          <h2 className={styles.contentTitle}>Features</h2>
          <div className={styles.contentBody}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-lg)" }}>
              {content.features.map((feature) => (
                <div key={feature.id} style={{ padding: "var(--spacing-md)", border: "1px solid var(--color-border)", borderRadius: "var(--border-radius-md)" }}>
                  <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--spacing-sm)" }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-textLight)" }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className={styles.content} style={{ background: "var(--color-surface)" }}>
          <h2 className={styles.contentTitle}>What Our Customers Say</h2>
          <div className={styles.contentBody}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--spacing-lg)" }}>
              {content.testimonials.map((testimonial) => (
                <div key={testimonial.id} style={{ padding: "var(--spacing-lg)", background: "var(--color-background)", borderRadius: "var(--border-radius-md)", boxShadow: "var(--shadow-sm)" }}>
                  <p style={{ fontSize: "var(--font-size-body)", fontStyle: "italic", marginBottom: "var(--spacing-md)" }}>
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-small)" }}>
                    {testimonial.author}
                  </div>
                  <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-textLight)" }}>
                    {testimonial.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      {content.pricing?.plans && content.pricing.plans.length > 0 && (
        <section className={styles.content}>
          <h2 className={styles.contentTitle}>Pricing</h2>
          <div className={styles.contentBody}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--spacing-lg)" }}>
              {content.pricing.plans.map((plan) => (
                <div key={plan.id} style={{ padding: "var(--spacing-xl)", border: "2px solid var(--color-border)", borderRadius: "var(--border-radius-lg)", textAlign: "center" }}>
                  <h3 style={{ fontSize: "var(--font-size-h3)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--spacing-sm)" }}>
                    {plan.name}
                  </h3>
                  <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", margin: "var(--spacing-md) 0" }}>
                    {plan.price}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, marginBottom: "var(--spacing-lg)", textAlign: "left" }}>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} style={{ padding: "var(--spacing-xs) 0", fontSize: "var(--font-size-small)" }}>
                        ✓ {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.ctaUrl || "#"}
                    className={styles.ctaButton}
                    style={{ display: "inline-block", width: "100%" }}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          {content.footer?.links && content.footer.links.length > 0 ? (
            content.footer.links.map((link) => (
              <a key={link.id} href={link.url} className={styles.footerLink}>
                {link.text}
              </a>
            ))
          ) : (
            <>
              <a href="#" className={styles.footerLink}>Privacy</a>
              <a href="#" className={styles.footerLink}>Terms</a>
              <a href="#" className={styles.footerLink}>Contact</a>
            </>
          )}
        </div>
        <p className={styles.footerCopyright}>
          © {new Date().getFullYear()} {content.footer?.companyName || organization.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
