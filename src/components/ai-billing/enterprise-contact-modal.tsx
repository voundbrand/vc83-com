"use client";

import { X, Calendar, Mail, Phone, Send, User, Building2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Image from "next/image";

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: "starter" | "professional" | "enterprise";
}

export function EnterpriseContactModal({
  isOpen,
  onClose,
  tier,
}: EnterpriseContactModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Get avatar URL from Convex storage
  const avatarStorageId = process.env.NEXT_PUBLIC_REM_AVATAR_STORAGE_ID;
  const avatarUrl = useQuery(
    api.files.getFileUrl,
    avatarStorageId ? { storageId: avatarStorageId as Id<"_storage"> } : "skip"
  );

  if (!isOpen) return null;

  // Tier-specific information
  const tierInfo = {
    starter: {
      name: "Private LLM - Starter",
      price: "€2,999/month",
      description: "Self-hosted AI with scale-to-zero compute. ~50K requests/month. Full data sovereignty.",
    },
    professional: {
      name: "Private LLM - Professional",
      price: "€7,199/month",
      description: "Dedicated GPU infrastructure. ~200K requests/month. 99.5% SLA.",
    },
    enterprise: {
      name: "Private LLM - Enterprise",
      price: "€14,999/month",
      description: "Custom AI infrastructure with dedicated support and unlimited requests.",
    },
  };

  const currentTier = tierInfo[tier];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implement form submission to backend
    // This should send an email notification and create a sales lead

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitted(true);

    // Reset form after 3 seconds and close
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", company: "", email: "", phone: "", message: "" });
      onClose();
    }, 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Window Title Bar */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b-2"
          style={{
            backgroundColor: "var(--primary)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: "white" }} />
            <span className="text-sm font-bold" style={{ color: "white" }}>
              {currentTier.name} - Contact Sales
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center border-2"
            style={{
              backgroundColor: "var(--win95-button-face)",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!submitted ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Message */}
              <div className="space-y-4">
                {/* Profile Section */}
                <div
                  className="p-4 border-2"
                  style={{
                    backgroundColor: "var(--info)",
                    borderColor: "var(--win95-border)",
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    {/* Profile Image - Circular */}
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <div
                          className="w-24 h-24 relative overflow-hidden border-2"
                          style={{
                            borderRadius: "50%",
                            borderColor: "var(--win95-border)",
                          }}
                        >
                          <Image
                            src={avatarUrl}
                            alt="Remington Splettstoesser"
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                      ) : (
                        <div
                          className="w-24 h-24 flex items-center justify-center border-2"
                          style={{
                            borderRadius: "50%",
                            backgroundColor: "var(--win95-bg-light)",
                            borderColor: "var(--win95-border)",
                          }}
                        >
                          <User size={48} style={{ color: "var(--neutral-gray)" }} />
                        </div>
                      )}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        Remington Splettstoesser
                      </h3>
                      <p className="text-sm mb-2" style={{ color: "var(--neutral-gray)" }}>
                        Founder & CEO, L4YERCAK3
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Mail size={12} style={{ color: "var(--primary)" }} />
                          <a
                            href="mailto:remington@l4yercak3.com"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--primary)" }}
                          >
                            remington@l4yercak3.com
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={12} style={{ color: "var(--primary)" }} />
                          <a
                            href="tel:+4915140427103"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--primary)" }}
                          >
                            +49 151 404 27 103
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={12} style={{ color: "var(--primary)" }} />
                          <a
                            href="https://cal.com/voundbrand/open-end-meeting"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: "var(--primary)" }}
                          >
                            Schedule a Call
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div
                    className="p-3 border-2"
                    style={{
                      backgroundColor: "var(--win95-bg-light)",
                      borderColor: "var(--win95-border)",
                    }}
                  >
                    <div className="flex gap-2 mb-2">
                      <MessageSquare size={16} style={{ color: "var(--primary)" }} />
                      <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                        Personal Message:
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--win95-text)" }}>
                      Hey there! 👋
                      <br />
                      <br />
                      Thanks for your interest in our {currentTier.name} plan. This is our enterprise-grade
                      solution, and I'd love to chat with you personally to make sure it's the perfect fit
                      for your needs.
                      <br />
                      <br />
                      Private LLM hosting means your data never leaves your infrastructure. We'll set up
                      everything for you - from the initial deployment to ongoing support.
                      <br />
                      <br />
                      Feel free to reach out directly via{" "}
                      <a
                        href="mailto:remington@l4yercak3.com"
                        className="underline font-semibold"
                        style={{ color: "var(--primary)" }}
                      >
                        email
                      </a>
                      ,{" "}
                      <a
                        href="tel:+4915140427103"
                        className="underline font-semibold"
                        style={{ color: "var(--primary)" }}
                      >
                        phone
                      </a>
                      , or{" "}
                      <a
                        href="https://cal.com/voundbrand/open-end-meeting"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold"
                        style={{ color: "var(--primary)" }}
                      >
                        grab a time on my calendar
                      </a>
                      . Or just fill out the form and I'll get back to you within 24 hours.
                      <br />
                      <br />
                      Looking forward to connecting! 🚀
                      <br />
                      <br />
                      <span className="font-bold">- Remington</span>
                    </p>
                  </div>
                </div>

                {/* Tier Information */}
                <div
                  className="p-4 border-2"
                  style={{
                    backgroundColor: "var(--win95-bg-light)",
                    borderColor: "var(--win95-border)",
                  }}
                >
                  <h4 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    {currentTier.name}
                  </h4>
                  <p className="text-lg font-bold mb-2" style={{ color: "var(--primary)" }}>
                    {currentTier.price}
                  </p>
                  <p className="text-sm mb-3" style={{ color: "var(--neutral-gray)" }}>
                    {currentTier.description}
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: "var(--win95-text)" }}>
                    <li>✓ Self-hosted infrastructure</li>
                    <li>✓ Complete data sovereignty</li>
                    <li>✓ Zero data retention guaranteed</li>
                    <li>✓ Dedicated technical support</li>
                    <li>✓ Custom model fine-tuning</li>
                    <li>✓ SLA guarantees</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: "var(--win95-text)" }}>
                  Get in Touch
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--win95-bg-light)",
                        borderColor: "var(--win95-border)",
                        color: "var(--win95-text)",
                      }}
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--win95-bg-light)",
                        borderColor: "var(--win95-border)",
                        color: "var(--win95-text)",
                      }}
                      placeholder="Acme Corp"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--win95-bg-light)",
                        borderColor: "var(--win95-border)",
                        color: "var(--win95-text)",
                      }}
                      placeholder="john@acme.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2 text-sm border-2"
                      style={{
                        backgroundColor: "var(--win95-bg-light)",
                        borderColor: "var(--win95-border)",
                        color: "var(--win95-text)",
                      }}
                      placeholder="+49 123 456 7890 (optional)"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Tell us about your needs
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="w-full p-2 text-sm border-2 resize-none"
                      style={{
                        backgroundColor: "var(--win95-bg-light)",
                        borderColor: "var(--win95-border)",
                        color: "var(--win95-text)",
                      }}
                      placeholder="What are your expected usage levels? Do you have specific compliance requirements? Any other details that would help us prepare for our call..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "white",
                      border: "2px solid",
                      borderTopColor: "var(--win95-button-light)",
                      borderLeftColor: "var(--win95-button-light)",
                      borderBottomColor: "var(--win95-button-dark)",
                      borderRightColor: "var(--win95-button-dark)",
                      opacity: isSubmitting ? 0.6 : 1,
                      cursor: isSubmitting ? "wait" : "pointer",
                    }}
                  >
                    <Send size={16} />
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>

                  <p className="text-xs text-center" style={{ color: "var(--neutral-gray)" }}>
                    We'll get back to you within 24 hours
                  </p>
                </form>
              </div>
            </div>
          ) : (
            // Success State
            <div className="text-center py-12">
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--success)" }}
              >
                <Send size={48} style={{ color: "white" }} />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--success)" }}>
                Message Sent!
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--win95-text)" }}>
                Thanks for reaching out! I'll get back to you within 24 hours.
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Check your email for a confirmation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
