"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

interface BusinessRegisterFormProps {
  onSuccess?: () => void;
  onSwitchToPersonal?: () => void;
}

export function BusinessRegisterForm({ onSuccess, onSwitchToPersonal }: BusinessRegisterFormProps) {
  const { signUpBusiness } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot protection
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Country list - Germany and EU at top, then rest of world
  const countries = [
    // Germany first
    "Germany",
    // European countries
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", 
    "Denmark", "Estonia", "Finland", "France", "Greece", "Hungary", 
    "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", 
    "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", 
    "Spain", "Sweden",
    // Rest of world
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", 
    "Armenia", "Australia", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", 
    "Barbados", "Belarus", "Belize", "Benin", "Bhutan", "Bolivia", 
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Burkina Faso", 
    "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", 
    "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", 
    "Côte d'Ivoire", "Cuba", "Djibouti", "Dominica", "Dominican Republic", 
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Eswatini", 
    "Ethiopia", "Fiji", "Gabon", "Gambia", "Georgia", "Ghana", "Grenada", 
    "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", 
    "Hong Kong", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Israel", 
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", 
    "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Lesotho", "Liberia", "Libya", 
    "Liechtenstein", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", 
    "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", 
    "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", 
    "Myanmar", "Namibia", "Nauru", "Nepal", "New Zealand", "Nicaragua", "Niger", 
    "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", 
    "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
    "Philippines", "Qatar", "Russia", "Rwanda", "Saint Kitts and Nevis", 
    "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", 
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", 
    "Sierra Leone", "Singapore", "Solomon Islands", "Somalia", "South Africa", 
    "South Korea", "South Sudan", "Sri Lanka", "Sudan", "Suriname", "Switzerland", 
    "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", 
    "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", 
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
    "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", 
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  // Form data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    taxId: "",
    street: "",
    city: "",
    postalCode: "",
    country: "Germany",
    contactEmail: "",
    contactPhone: "",
    website: "",
    acceptTerms: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = (): boolean => {
    if (!formData.firstName || formData.firstName.length < 2) {
      setError("Please enter your first name");
      return false;
    }
    if (!formData.lastName || formData.lastName.length < 2) {
      setError("Please enter your last name");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError("Password must contain uppercase, lowercase, and number");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.businessName || formData.businessName.length < 2) {
      setError("Please enter your business name");
      return false;
    }
    // Tax ID validation only checks if it's provided (no format validation for international)
    if (formData.taxId && formData.taxId.length < 5) {
      setError("Tax ID must be at least 5 characters");
      return false;
    }
    if (!formData.street) {
      setError("Please enter your street address");
      return false;
    }
    if (!formData.city) {
      setError("Please enter your city");
      return false;
    }
    if (!formData.postalCode) {
      setError("Please enter your postal code");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Bot protection
    if (honeypot) {
      console.warn("Bot detected");
      return;
    }

    if (!formData.acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      await signUpBusiness({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        taxId: formData.taxId || undefined,
        street: formData.street,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Error Display */}
      {error && (
        <div className="retro-panel border-red-500 bg-red-50">
          <p className="text-sm text-red-800 font-semibold">⚠️ {error}</p>
        </div>
      )}

      {/* Progress Indicator - Separated Steps (Clickable) */}
      <div className="flex gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex-1 retro-panel text-center cursor-pointer hover:bg-purple-50 transition-colors ${
            step === 1 
              ? 'bg-purple-600 text-white border-purple-700' 
              : ''
          }`}
          disabled={isLoading}
        >
          1. Account
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex-1 retro-panel text-center cursor-pointer hover:bg-purple-50 transition-colors ${
            step === 2 
              ? 'bg-purple-600 text-white border-purple-700' 
              : ''
          }`}
          disabled={isLoading}
        >
          2. Business
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`flex-1 retro-panel text-center cursor-pointer hover:bg-purple-50 transition-colors ${
            step === 3 
              ? 'bg-purple-600 text-white border-purple-700' 
              : ''
          }`}
          disabled={isLoading}
        >
          3. Contact
        </button>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* Step 1: Account Details */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="retro-input w-full"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="retro-input w-full"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="retro-input w-full"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="retro-input w-full pr-10"
                placeholder="At least 8 characters"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <Eye className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
                ) : (
                  <EyeOff className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                className="retro-input w-full pr-10"
                placeholder="Confirm password"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={isLoading}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <Eye className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
                ) : (
                  <EyeOff className="w-4 h-4" style={{ color: 'var(--neutral-gray)' }} />
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Step 2: Business Information */}
      {step === 2 && (
        <>
          
          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Business Name
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              className="retro-input w-full"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              VAT/Tax ID (Optional)
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => updateField("taxId", e.target.value)}
              className="retro-input w-full"
              placeholder="Enter your business tax identification number"
              disabled={isLoading}
            />
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              E.g., VAT number, EIN, ABN, etc.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Street Address
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => updateField("street", e.target.value)}
              className="retro-input w-full"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="retro-input w-full"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
                className="retro-input w-full"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Country
            </label>
            <select
              value={formData.country}
              onChange={(e) => updateField("country", e.target.value)}
              className="retro-input w-full"
              required
              disabled={isLoading}
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Step 3: Contact Details */}
      {step === 3 && (
        <>
          
          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Contact Email (Optional)
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateField("contactEmail", e.target.value)}
              className="retro-input w-full"
              placeholder="Leave blank to use account email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => updateField("contactPhone", e.target.value)}
              className="retro-input w-full"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
              Website (Optional)
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => updateField("website", e.target.value)}
              className="retro-input w-full"
              placeholder="https://example.com"
              disabled={isLoading}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => updateField("acceptTerms", e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold">
              I accept the{" "}
              <a href="/terms" className="underline" style={{ color: 'var(--win95-text)' }}>
                Terms & Conditions
              </a>
            </span>
          </label>
        </>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 mt-4">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 retro-button"
            disabled={isLoading}
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 retro-button-primary"
            disabled={isLoading}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="flex-1 retro-button-primary"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Business Account"}
          </button>
        )}
      </div>

      {/* Switch to Personal */}
      {step === 1 && (
        <div className="text-center pt-4 border-t-2 mt-4" style={{ borderColor: 'var(--win95-border)' }}>
          <p className="text-sm">
            Need a personal account?{" "}
            <button
              type="button"
              onClick={onSwitchToPersonal}
              className="font-semibold underline"
              style={{ color: 'var(--win95-text)' }}
              disabled={isLoading}
            >
              Switch to Personal
            </button>
          </p>
        </div>
      )}
    </form>
  );
}