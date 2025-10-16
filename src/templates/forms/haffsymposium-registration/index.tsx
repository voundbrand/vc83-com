/**
 * HAFFSYMPOSIUM REGISTRATION FORM TEMPLATE
 *
 * Comprehensive multi-category event registration form with conditional logic.
 * Based on the 8. HaffSymposium der Sportmedizin registration requirements.
 *
 * Features:
 * - 6 attendee categories with conditional sections
 * - Personal information collection
 * - Event-specific questions (arrival, accommodation, activities)
 * - Pricing logic for add-ons (UCRA boat event: €30/person)
 * - Multi-language support (German)
 * - Responsive design
 */

"use client";

import { useState } from "react";
import { FormTemplateProps, FormSubmissionData } from "../../types";
import styles from "./styles.module.css";

// Attendee category types
type AttendeeCategory = "external" | "ameos" | "haffnet" | "speaker" | "sponsor" | "orga";

interface HaffSymposiumFormData extends FormSubmissionData {
  attendeeCategory: AttendeeCategory;
  arrivalTime?: string;
  ucraParticipants?: number;
  accommodation?: string;
  activity?: string;
  bbqParticipation?: boolean;
  specialRequests?: string;
  billingAddress?: string;
  supportActivities?: string[];
  sponsorComment?: string;
}

export function HaffSymposiumRegistrationForm({
  theme,
  onSubmit,
  onCancel,
  initialData,
  mode = "standalone",
}: FormTemplateProps) {
  const [formData, setFormData] = useState<Partial<HaffSymposiumFormData>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof HaffSymposiumFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.attendeeCategory) {
      newErrors.attendeeCategory = "Bitte wählen Sie eine Anmeldekategorie";
    }
    if (!formData.salutation) newErrors.salutation = "Anrede ist erforderlich";
    if (!formData.firstName) newErrors.firstName = "Vorname ist erforderlich";
    if (!formData.lastName) newErrors.lastName = "Nachname ist erforderlich";
    if (!formData.email) newErrors.email = "E-Mail ist erforderlich";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        submittedAt: Date.now(),
      } as FormSubmissionData);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer} style={{ fontFamily: theme.typography.fontFamily.body }}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Header */}
        <div className={styles.header} style={{ background: theme.colors.primary }}>
          <h1 className={styles.headerTitle}>8. HaffSymposium der Sportmedizin</h1>
          <p className={styles.headerSubtitle}>31. Mai - 1. Juni 2024 • Ueckermünde</p>
        </div>

        {/* Attendee Category Selection */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Anmeldekategorie</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Bitte helfen Sie uns, Ihre Anmeldung besser zuzuordnen:</label>
            {[
              { value: "external", label: "Ich bin ein externer Teilnehmer." },
              { value: "ameos", label: "Ich bin ein Mitarbeiter der AMEOS Einrichtungen in Vorpommern." },
              { value: "haffnet", label: "Ich bin ein HaffNet-Mitglied/-Partner." },
              { value: "speaker", label: "Ich bin ein Referent der Veranstaltung." },
              { value: "sponsor", label: "Ich bin ein Sponsoring-Partner." },
              { value: "orga", label: "Ich gehöre zum Orga-Team." },
            ].map((option) => (
              <div key={option.value} className={styles.radioItem}>
                <input
                  type="radio"
                  id={option.value}
                  name="attendeeCategory"
                  value={option.value}
                  checked={formData.attendeeCategory === option.value}
                  onChange={(e) => handleChange("attendeeCategory", e.target.value)}
                />
                <label htmlFor={option.value}>{option.label}</label>
              </div>
            ))}
            {errors.attendeeCategory && <span className={styles.error}>{errors.attendeeCategory}</span>}
          </div>
        </section>

        {/* Personal Information */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Persönliche Angaben</h2>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="salutation" className={styles.label}>Anrede: *</label>
              <select
                id="salutation"
                value={formData.salutation || ""}
                onChange={(e) => handleChange("salutation", e.target.value)}
                className={styles.input}
              >
                <option value="">Bitte wählen</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
              </select>
              {errors.salutation && <span className={styles.error}>{errors.salutation}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>Titel:</label>
              <select
                id="title"
                value={formData.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                className={styles.input}
              >
                <option value="">Kein Titel</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
                <option value="Prof. Dr.">Prof. Dr.</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>Vorname: *</label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName || ""}
                onChange={(e) => handleChange("firstName", e.target.value)}
                className={styles.input}
              />
              {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>Nachname: *</label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName || ""}
                onChange={(e) => handleChange("lastName", e.target.value)}
                className={styles.input}
              />
              {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="mobilePhone" className={styles.label}>Handynummer:</label>
              <input
                type="tel"
                id="mobilePhone"
                value={formData.mobilePhone || ""}
                onChange={(e) => handleChange("mobilePhone", e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>E-Mail-Adresse: *</label>
              <input
                type="email"
                id="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className={styles.input}
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="organization" className={styles.label}>Praxis/Organisation mit kompletter Anschrift:</label>
            <textarea
              id="organization"
              value={formData.organization || ""}
              onChange={(e) => handleChange("organization", e.target.value)}
              className={styles.textarea}
              rows={3}
              placeholder="Name der Praxis/Organisation&#10;Straße und Hausnummer&#10;PLZ und Ort"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="profession" className={styles.label}>Fachrichtung:</label>
            <input
              type="text"
              id="profession"
              value={formData.profession || ""}
              onChange={(e) => handleChange("profession", e.target.value)}
              className={styles.input}
              placeholder="z.B. Fachärztin für Allgemeinmedizin oder Physiotherapeut"
            />
          </div>
        </section>

        {/* Conditional Sections Based on Category */}
        {formData.attendeeCategory && (
          <ConditionalSection category={formData.attendeeCategory} formData={formData} handleChange={handleChange} />
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitButton}
          style={{ background: theme.colors.primary }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Wird gesendet..." : "Anmeldung abschicken"}
        </button>

        {onCancel && mode !== "standalone" && (
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Abbrechen
          </button>
        )}
      </form>
    </div>
  );
}

// Conditional section component based on attendee category
function ConditionalSection({
  category,
  formData,
  handleChange,
}: {
  category: AttendeeCategory;
  formData: Partial<HaffSymposiumFormData>;
  handleChange: (field: keyof HaffSymposiumFormData, value: unknown) => void;
}) {
  const commonFields = (showUcraCost = true) => (
    <>
      <div className={styles.formGroup}>
        <label htmlFor="arrivalTime" className={styles.label}>
          Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit:
        </label>
        <input
          type="time"
          id="arrivalTime"
          value={formData.arrivalTime || ""}
          onChange={(e) => handleChange("arrivalTime", e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Mit wie viel Personen möchten Sie an der individuellen Abendveranstaltung auf der Pommernkogge &quot;UCRA&quot; teilnehmen?
        </label>
        {showUcraCost && (
          <div className={styles.note} style={{ background: "#e6fffa", borderColor: "#38b2ac" }}>
            Pro Person entstehen Ihnen zusätzliche Kosten von 30,00 EUR
          </div>
        )}
        <div className={styles.radioGroup}>
          {[
            { value: 0, label: "0 = gar nicht" },
            { value: 1, label: "1 = 1 Person" },
            { value: 2, label: "2 = Sie und Ihre Begleitung" },
          ].map((option) => (
            <div key={option.value} className={styles.radioItem}>
              <input
                type="radio"
                id={`ucra_${option.value}`}
                name="ucraParticipants"
                value={option.value}
                checked={formData.ucraParticipants === option.value}
                onChange={(e) => handleChange("ucraParticipants", parseInt(e.target.value))}
              />
              <label htmlFor={`ucra_${option.value}`}>{option.label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="accommodation" className={styles.label}>Informationen rund um Ihre Übernachtung:</label>
        <textarea
          id="accommodation"
          value={formData.accommodation || ""}
          onChange={(e) => handleChange("accommodation", e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Benötigen Sie eine Übernachtung? Besondere Wünsche?"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="activity" className={styles.label}>
          Ich möchte an folgender Aktivität am 01.06.2024 teilnehmen:
        </label>
        <select
          id="activity"
          value={formData.activity || ""}
          onChange={(e) => handleChange("activity", e.target.value)}
          className={styles.input}
        >
          <option value="">Bitte wählen</option>
          <option value="workshop_a">Workshop A</option>
          <option value="workshop_b">Workshop B</option>
          <option value="exkursion">Exkursion</option>
          <option value="andere">Andere Aktivität</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe&apos;s Bootsverleih im Stadthafen Ueckermünde begrüßen?
        </label>
        <div className={styles.radioGroup}>
          <div className={styles.radioItem}>
            <input
              type="radio"
              id="bbq_yes"
              name="bbqParticipation"
              checked={formData.bbqParticipation === true}
              onChange={() => handleChange("bbqParticipation", true)}
            />
            <label htmlFor="bbq_yes">Ja</label>
          </div>
          <div className={styles.radioItem}>
            <input
              type="radio"
              id="bbq_no"
              name="bbqParticipation"
              checked={formData.bbqParticipation === false}
              onChange={() => handleChange("bbqParticipation", false)}
            />
            <label htmlFor="bbq_no">Nein</label>
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="specialRequests" className={styles.label}>Möchten Sie uns etwas Bestimmtes mitteilen?</label>
        <textarea
          id="specialRequests"
          value={formData.specialRequests || ""}
          onChange={(e) => handleChange("specialRequests", e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches"
        />
      </div>
    </>
  );

  switch (category) {
    case "external":
    case "haffnet":
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {category === "external" ? "Anmeldung als externer Teilnehmer" : "Anmeldung als HaffNet-Mitglied/-Partner"}
          </h2>
          {commonFields(true)}
          <div className={styles.formGroup}>
            <label htmlFor="billingAddress" className={styles.label}>Wie lautet Ihre korrekte Rechnungsadresse?</label>
            <textarea
              id="billingAddress"
              value={formData.billingAddress || ""}
              onChange={(e) => handleChange("billingAddress", e.target.value)}
              className={styles.textarea}
              rows={3}
              placeholder="Vollständige Rechnungsadresse für die Teilnahmegebühren"
            />
          </div>
        </section>
      );

    case "ameos":
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ihre Anmeldung als AMEOS Mitarbeiter</h2>
          {commonFields(true)}
          <div className={styles.note} style={{ background: "#f0fff4", borderColor: "#48bb78" }}>
            Ihr Arbeitgeber wird die Kosten für die Veranstaltung sowie die UCRA-Ausfahrt übernehmen.
          </div>
        </section>
      );

    case "speaker":
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Angaben zu Ihrer Teilnahme als Referent</h2>
          {commonFields(false)}
        </section>
      );

    case "sponsor":
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Detaillierte Angaben zu Ihrer Teilnahme als Sponsoring-Partner</h2>
          <div className={styles.formGroup}>
            <label htmlFor="sponsorComment" className={styles.label}>Platz für Ihren Kommentar:</label>
            <textarea
              id="sponsorComment"
              value={formData.sponsorComment || ""}
              onChange={(e) => handleChange("sponsorComment", e.target.value)}
              className={styles.textarea}
              rows={3}
              placeholder="Ihre Anmerkungen oder Wünsche als Sponsoring-Partner"
            />
          </div>
          {commonFields(false)}
        </section>
      );

    case "orga":
      return (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Registrierung als Orga-Mitglied für das 8. Haff-Symposium</h2>
          <div className={styles.formGroup}>
            <label htmlFor="arrivalTime" className={styles.label}>
              Bitte teilen Sie uns Ihre geplante Anreisezeit im Bürgersaal am 31.05.2024 mit:
            </label>
            <input
              type="time"
              id="arrivalTime"
              value={formData.arrivalTime || ""}
              onChange={(e) => handleChange("arrivalTime", e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ich unterstütze folgende Aktivitäten am 01.06.2024:</label>
            <div className={styles.checkboxGroup}>
              {[
                { value: "setup", label: "Aufbau und Vorbereitung" },
                { value: "registration", label: "Registrierung und Check-in" },
                { value: "catering", label: "Catering-Betreuung" },
                { value: "technical", label: "Technische Unterstützung" },
                { value: "workshops", label: "Workshop-Betreuung" },
                { value: "activities", label: "Aktivitäten-Koordination" },
                { value: "cleanup", label: "Abbau und Nachbereitung" },
              ].map((option) => (
                <div key={option.value} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={option.value}
                    checked={formData.supportActivities?.includes(option.value) || false}
                    onChange={(e) => {
                      const current = formData.supportActivities || [];
                      if (e.target.checked) {
                        handleChange("supportActivities", [...current, option.value]);
                      } else {
                        handleChange("supportActivities", current.filter((v) => v !== option.value));
                      }
                    }}
                  />
                  <label htmlFor={option.value}>{option.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Dürfen wir Sie im Anschluss an Ihre Aktivität zum Grillen & Chillen bei Uwe&apos;s Bootsverleih einplanen?
            </label>
            <div className={styles.radioGroup}>
              <div className={styles.radioItem}>
                <input
                  type="radio"
                  id="bbq_yes_orga"
                  name="bbqParticipation"
                  checked={formData.bbqParticipation === true}
                  onChange={() => handleChange("bbqParticipation", true)}
                />
                <label htmlFor="bbq_yes_orga">Ja</label>
              </div>
              <div className={styles.radioItem}>
                <input
                  type="radio"
                  id="bbq_no_orga"
                  name="bbqParticipation"
                  checked={formData.bbqParticipation === false}
                  onChange={() => handleChange("bbqParticipation", false)}
                />
                <label htmlFor="bbq_no_orga">Nein</label>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="specialRequests" className={styles.label}>Möchten Sie uns etwas Bestimmtes mitteilen?</label>
            <textarea
              id="specialRequests"
              value={formData.specialRequests || ""}
              onChange={(e) => handleChange("specialRequests", e.target.value)}
              className={styles.textarea}
              rows={3}
              placeholder="z.B. eine Lebensmittelunverträglichkeit, Informationen zu einer Begleitperson oder Ähnliches"
            />
          </div>
        </section>
      );

    default:
      return null;
  }
}

// Export the schema with the component so form-builder can access field definitions
import { haffSymposiumFormSchema } from "./schema";
HaffSymposiumRegistrationForm.schema = haffSymposiumFormSchema;