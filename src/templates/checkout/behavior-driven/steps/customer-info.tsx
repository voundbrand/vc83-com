"use client";

/**
 * STEP 3: CUSTOMER INFO (Simplified - Behaviors Handle Employer Detection)
 *
 * Minimal customer info collection.
 * Behaviors auto-fill company details if employer detected.
 */

import { useState } from "react";
import { StepProps } from "../types";
import { User, Mail, Phone, ArrowLeft } from "lucide-react";

export function CustomerInfoStep({ checkoutData, onComplete, onBack }: StepProps) {
  const [email, setEmail] = useState(checkoutData.customerInfo?.email || "");
  const [name, setName] = useState(checkoutData.customerInfo?.name || "");
  const [phone, setPhone] = useState(checkoutData.customerInfo?.phone || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onComplete({
      customerInfo: {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
      },
    });
  };

  const isValid = email.trim().length > 0 && name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <User size={32} />
          Your Information
        </h2>
        <p className="text-gray-600">Please provide your contact details</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">
            <Mail size={16} className="inline mr-2" />
            Email Address <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
          />
          <p className="text-sm text-gray-600 mt-2">
            We&apos;ll send your tickets and confirmation to this email
          </p>
        </div>

        {/* Full Name */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">
            <User size={16} className="inline mr-2" />
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
          />
        </div>

        {/* Phone (Optional) */}
        <div className="mb-8">
          <label className="block text-sm font-bold mb-2">
            <Phone size={16} className="inline mr-2" />
            Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-lg font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="flex-1 px-6 py-3 text-lg font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            Continue to Review →
          </button>
        </div>
      </form>
    </div>
  );
}
