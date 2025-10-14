/**
 * EVENT LANDING PAGE TEMPLATE
 *
 * Full-featured event landing page structure with sticky sidebar checkout.
 * Theme-agnostic: Accepts any theme for styling.
 */

"use client";

import { useMemo } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { TemplateProps } from "../../types";
import { EventLandingContent } from "./schema";
import { TicketCheckoutCard } from "../../checkout/ticket-checkout/ticket-checkout-card";
import { CheckoutItem } from "../../checkout/core/types";
import styles from "./styles.module.css";
import {
  Users,
  Lightbulb,
  Network,
  Award,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";

// Icon mapping for dynamic icon names
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  lightbulb: Lightbulb,
  network: Network,
  award: Award,
  mappin: MapPin,
  calendar: Calendar,
  clock: Clock,
};

export function EventLandingTemplate({
  page,
  organization,
  theme,
}: TemplateProps) {
  // Get template content from page.customProperties.templateContent
  // This is where the content is actually stored when creating/editing pages
  const content =
    (page.customProperties?.templateContent as unknown as EventLandingContent) ||
    ({} as EventLandingContent);

  // Transform tickets from content into CheckoutItem format for TicketCheckoutCard
  // Note: Prices are stored in cents, convert to dollars for display
  const checkoutItems: CheckoutItem[] = useMemo(() => {
    return content.checkout?.tickets?.map(ticket => ({
      id: ticket.id as Id<"objects">,
      name: ticket.name,
      description: ticket.description || "",
      price: ticket.price / 100, // Convert cents to dollars for display
      originalPrice: ticket.originalPrice ? ticket.originalPrice / 100 : undefined,
      currency: ticket.currency || "USD",
      features: ticket.features || [],
      customProperties: {
        checkoutUrl: ticket.checkoutUrl || "#",
      },
    })) || [];
  }, [content.checkout?.tickets]);

  // Merge content with checkout items
  const mergedContent = {
    ...content,
    checkout: {
      ...content.checkout,
      tickets: checkoutItems,
    },
  };

  // Calculate pricing for mobile checkout preview
  const minPrice = useMemo(() => {
    if (checkoutItems.length === 0) return 0;
    return Math.min(...checkoutItems.map((t) => t.price));
  }, [checkoutItems]);

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
      {/* Navigation - Sticky at top */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.navLogo}>{organization.name}</div>
          <div className={styles.navLinks}>
            <a href="#about" className={styles.navLink}>
              ABOUT
            </a>
            <a href="#agenda" className={styles.navLink}>
              SCHEDULE
            </a>
            <a href="#speakers" className={styles.navLink}>
              SPEAKERS
            </a>
            <a href="#faq" className={styles.navLink}>
              FAQ
            </a>
          </div>
          <div className={styles.navActions}>
            <button className={styles.navButton}>LOG IN</button>
            <button className={styles.navButtonPrimary}>SIGN UP</button>
          </div>
        </div>
      </nav>

      {/* Two-column layout: Main content + Sticky sidebar */}
      <div className={styles.layoutGrid}>
        {/* Main Content */}
        <main className={`${styles.mainContent} lg:pr-8`}>
          {/* Hero Section */}
          {mergedContent.hero && (
            <section className={styles.hero} id="hero">
              {(content.hero.videoUrl || content.hero.imageUrl) && (
                <div className={styles.heroBackground}>
                  {mergedContent.hero.imageUrl && (
                    <img
                      src={mergedContent.hero.imageUrl}
                      alt="Event"
                      className={styles.heroBackgroundImage}
                    />
                  )}
                </div>
              )}

              <div className={styles.heroGradientOverlay} />

              <div className={styles.heroContent}>
                <div className={styles.heroDateBadge}>{mergedContent.hero.date}</div>

                <h1 className={styles.heroTitle}>{mergedContent.hero.headline}</h1>

                <p className={styles.heroSubtitle}>
                  {mergedContent.hero.subheadline}
                </p>

                <div className={styles.heroInfo}>
                  <div className={styles.heroInfoItem}>
                    <MapPin className={styles.heroIcon} />
                    <span>{mergedContent.hero.location}</span>
                  </div>
                  <span className={styles.heroDivider}>•</span>
                  <div className={styles.heroInfoItem}>
                    <Calendar className={styles.heroIcon} />
                    <span>{mergedContent.hero.format}</span>
                  </div>
                </div>

                {mergedContent.hero.ctaButtons &&
                  content.hero.ctaButtons.length > 0 && (
                    <div className={styles.heroButtons}>
                      {mergedContent.hero.ctaButtons.map((btn) => (
                        <a
                          key={btn.id}
                          href={btn.url}
                          className={
                            btn.variant === "primary"
                              ? styles.ctaButtonPrimary
                              : styles.ctaButtonOutline
                          }
                        >
                          {btn.text}
                        </a>
                      ))}
                    </div>
                  )}
              </div>
            </section>
          )}

          {/* About Section */}
          {mergedContent.about && (
            <section className={styles.section} id="about">
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{mergedContent.about.title}</h2>
                <p className={styles.sectionDescription}>
                  {mergedContent.about.description}
                </p>
              </div>

              {mergedContent.about.stats && content.about.stats.length > 0 && (
                <div className={styles.statsGrid}>
                  {mergedContent.about.stats.map((stat) => {
                    const IconComponent =
                      iconMap[stat.icon.toLowerCase()] || Users;
                    return (
                      <div key={stat.id} className={styles.statCard}>
                        <IconComponent className={styles.statIcon} />
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statLabel}>{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mergedContent.about.highlights && content.about.highlights.length > 0 && (
                <div className={styles.highlightsGrid}>
                  {mergedContent.about.highlights.map((highlight) => {
                    const IconComponent =
                      iconMap[highlight.icon.toLowerCase()] || Lightbulb;
                    return (
                      <div key={highlight.id} className={styles.highlightCard}>
                        <div className={styles.highlightIconWrapper}>
                          <IconComponent className={styles.highlightIcon} />
                        </div>
                        <h3 className={styles.highlightTitle}>
                          {highlight.title}
                        </h3>
                        <p className={styles.highlightDescription}>
                          {highlight.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Agenda Section */}
          {mergedContent.agenda &&
            content.agenda.days &&
            content.agenda.days.length > 0 && (
              <section className={styles.section} id="agenda">
                <h2 className={styles.sectionTitle}>{mergedContent.agenda.title}</h2>
                <p className={styles.sectionSubtitle}>
                  {mergedContent.agenda.subtitle}
                </p>

                <div className={styles.agendaDays}>
                  {mergedContent.agenda.days.map((day) => (
                    <div key={day.id} className={styles.agendaDayContainer}>
                      <h3 className={styles.agendaDayTitle}>{day.date}</h3>
                      <div className={styles.agendaSessions}>
                        {day.sessions.map((session) => (
                          <div
                            key={session.id}
                            className={styles.agendaSessionCard}
                          >
                            <div className={styles.sessionTimeWrapper}>
                              <Clock className={styles.sessionIcon} />
                              <span className={styles.sessionTime}>
                                {session.time}
                              </span>
                            </div>

                            <div className={styles.sessionContent}>
                              <div className={styles.sessionHeader}>
                                <h4 className={styles.sessionTitle}>
                                  {session.title}
                                </h4>
                                <span
                                  className={`${styles.sessionType} ${styles[`sessionType-${session.type}`]}`}
                                >
                                  {session.type}
                                </span>
                              </div>

                              {session.speaker && (
                                <p className={styles.sessionSpeaker}>
                                  {session.speaker}
                                </p>
                              )}

                              {session.location && (
                                <div className={styles.sessionLocation}>
                                  <MapPin className={styles.sessionIcon} />
                                  <span>{session.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Speakers, Testimonials, FAQ sections continue... */}
          {/* (keeping original code for these sections) */}
          {mergedContent.speakers &&
            content.speakers.speakers &&
            content.speakers.speakers.length > 0 && (
              <section className={styles.section} id="speakers">
                <h2 className={styles.sectionTitle}>
                  {mergedContent.speakers.title}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {mergedContent.speakers.subtitle}
                </p>

                <div className={styles.speakersGrid}>
                  {mergedContent.speakers.speakers.map((speaker) => (
                    <div key={speaker.id} className={styles.speakerCard}>
                      <div className={styles.speakerImageWrapper}>
                        <img
                          src={speaker.imageUrl}
                          alt={speaker.name}
                          className={styles.speakerImage}
                        />
                      </div>

                      <div className={styles.speakerContent}>
                        <h3 className={styles.speakerName}>{speaker.name}</h3>
                        <p className={styles.speakerTitle}>
                          {speaker.role}
                          {speaker.company && `, ${speaker.company}`}
                        </p>
                        <p className={styles.speakerBio}>{speaker.bio}</p>

                        {speaker.socialLinks && (
                          <div className={styles.speakerSocial}>
                            {speaker.socialLinks.twitter && (
                              <a
                                href={speaker.socialLinks.twitter}
                                className={styles.socialLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Twitter"
                              >
                                <svg
                                  className={styles.socialIcon}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                                </svg>
                              </a>
                            )}
                            {speaker.socialLinks.linkedin && (
                              <a
                                href={speaker.socialLinks.linkedin}
                                className={styles.socialLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="LinkedIn"
                              >
                                <svg
                                  className={styles.socialIcon}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                  <rect x="2" y="9" width="4" height="12" />
                                  <circle cx="4" cy="4" r="2" />
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {mergedContent.testimonials &&
            content.testimonials.testimonials &&
            content.testimonials.testimonials.length > 0 && (
              <section className={styles.section} id="testimonials">
                <h2 className={styles.sectionTitle}>
                  {mergedContent.testimonials.title}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {mergedContent.testimonials.subtitle}
                </p>

                <div className={styles.testimonialsGrid}>
                  {mergedContent.testimonials.testimonials.map((testimonial) => (
                    <div key={testimonial.id} className={styles.testimonialCard}>
                      <div className={styles.testimonialStars}>
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={styles.starIcon}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>

                      <p className={styles.testimonialQuote}>
                        &ldquo;{testimonial.quote}&rdquo;
                      </p>

                      <div className={styles.testimonialAuthor}>
                        {testimonial.imageUrl && (
                          <img
                            src={testimonial.imageUrl}
                            alt={testimonial.author}
                            className={styles.testimonialImage}
                          />
                        )}
                        <div className={styles.testimonialAuthorInfo}>
                          <div className={styles.testimonialName}>
                            {testimonial.author}
                          </div>
                          <div className={styles.testimonialRole}>
                            {testimonial.role}
                            {testimonial.company && `, ${testimonial.company}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {mergedContent.faq &&
            content.faq.questions &&
            content.faq.questions.length > 0 && (
              <section className={styles.section} id="faq">
                <h2 className={styles.sectionTitle}>{mergedContent.faq.title}</h2>
                <p className={styles.sectionSubtitle}>{mergedContent.faq.subtitle}</p>

                <div className={styles.faqList}>
                  {mergedContent.faq.questions.map((faq) => (
                    <div key={faq.id} className={styles.faqItem}>
                      <h3 className={styles.faqQuestion}>{faq.question}</h3>
                      <p className={styles.faqAnswer}>{faq.answer}</p>
                    </div>
                  ))}
                </div>

                {mergedContent.faq.contactEmail && (
                  <div className={styles.faqContact}>
                    <h3 className={styles.faqContactTitle}>Still have questions?</h3>
                    <p className={styles.faqContactText}>
                      Our team is here to help you with any inquiries.
                    </p>
                    <a href={`mailto:${mergedContent.faq.contactEmail}`} className={styles.faqContactLink}>
                      {mergedContent.faq.contactEmail}
                    </a>
                  </div>
                )}
              </section>
            )}
        </main>

        {/* Sticky Checkout Sidebar (Desktop only) */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 pt-8">
            {checkoutItems.length > 0 ? (
              <TicketCheckoutCard
                eventId={page._id as Id<"objects">}
                eventName={mergedContent.hero?.headline || page.name}
                eventDate={new Date(mergedContent.hero?.date || Date.now())}
                venue={mergedContent.hero?.location}
                tickets={checkoutItems}
                organizationId={organization._id as Id<"organizations">}
                theme={theme}
                maxTicketsPerOrder={10}
              />
            ) : (
              <div className={styles.checkoutPlaceholder}>
                <div className={styles.placeholderIcon}>🛒</div>
                <h3 className={styles.placeholderTitle}>No Products Linked</h3>
                <p className={styles.placeholderText}>
                  Link products to this page to enable checkout.
                  Click the "Link" button next to products in the editor.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Checkout - Fixed at bottom */}
      {checkoutItems.length > 0 && (
        <div className={styles.mobileCheckout}>
          <div className={styles.mobileCheckoutContent}>
            <div>
              <div className={styles.mobileCheckoutTitle}>
                Get Your Ticket
              </div>
              <div className={styles.mobileCheckoutPrice}>
                From ${minPrice}
              </div>
            </div>
            <a href="#checkout" className={styles.mobileCheckoutButton}>
              View Tickets
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
