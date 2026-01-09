"use client";

import { Calendar, FileText, Mail, Phone } from "lucide-react";
import Image from "next/image";

interface ProjectPageConfig {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  theme: string;
  template: string;
  logoUrl?: string;
}

interface SimpleTemplateProps {
  config: ProjectPageConfig;
  slug: string;
}

const themeColors = {
  amber: {
    bg: "from-amber-50 to-orange-50",
    headerBg: "from-amber-600 to-orange-600",
    accent: "text-amber-600",
    badge: "bg-amber-100 text-amber-800",
    button: "bg-amber-600 hover:bg-amber-700",
    border: "border-amber-200",
  },
  purple: {
    bg: "from-purple-50 to-indigo-50",
    headerBg: "from-purple-600 to-indigo-600",
    accent: "text-purple-600",
    badge: "bg-purple-100 text-purple-800",
    button: "bg-purple-600 hover:bg-purple-700",
    border: "border-purple-200",
  },
  blue: {
    bg: "from-blue-50 to-cyan-50",
    headerBg: "from-blue-600 to-cyan-600",
    accent: "text-blue-600",
    badge: "bg-blue-100 text-blue-800",
    button: "bg-blue-600 hover:bg-blue-700",
    border: "border-blue-200",
  },
  green: {
    bg: "from-green-50 to-emerald-50",
    headerBg: "from-green-600 to-emerald-600",
    accent: "text-green-600",
    badge: "bg-green-100 text-green-800",
    button: "bg-green-600 hover:bg-green-700",
    border: "border-green-200",
  },
  neutral: {
    bg: "from-gray-50 to-slate-50",
    headerBg: "from-gray-700 to-slate-800",
    accent: "text-gray-600",
    badge: "bg-gray-100 text-gray-800",
    button: "bg-gray-700 hover:bg-gray-800",
    border: "border-gray-200",
  },
};

export default function SimpleTemplate({ config }: SimpleTemplateProps) {
  const colors = themeColors[config.theme as keyof typeof themeColors] || themeColors.purple;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.bg}`}>
      {/* Header */}
      <header className={`bg-gradient-to-r ${colors.headerBg} text-white py-6`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4">
            {config.logoUrl ? (
              <div className="w-12 h-12 bg-white/20 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={config.logoUrl}
                  alt={config.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{config.name}</h1>
              {config.description && (
                <p className="text-white/80 text-sm mt-1">
                  {config.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <section className={`bg-white p-8 rounded-lg shadow-sm border ${colors.border} mb-8`}>
          <div className="text-center">
            <span className={`inline-block ${colors.badge} px-3 py-1 rounded-full text-xs font-medium mb-4`}>
              Project Page
            </span>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Welcome to {config.name}
            </h2>
            {config.description && (
              <p className="text-gray-600 max-w-xl mx-auto">
                {config.description}
              </p>
            )}
          </div>
        </section>

        {/* Meetings Info */}
        <section className={`bg-white p-6 rounded-lg shadow-sm border ${colors.border} mb-8`}>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${colors.accent}`} />
            Project Meetings
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Click the floating button in the bottom-right corner to view upcoming meetings, notes, and files.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Meeting notes</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Scheduling</span>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className={`bg-white p-6 rounded-lg shadow-sm border ${colors.border}`}>
          <h3 className="font-bold text-gray-800 mb-4">Need Help?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Contact us if you have any questions about this project.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:contact@l4yercak3.com"
              className={`inline-flex items-center gap-2 px-4 py-2 ${colors.button} text-white rounded-lg text-sm transition-colors`}
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
            <a
              href="tel:+4915140427103"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <a
            href="https://l4yercak3.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`${colors.accent} hover:opacity-80 transition-colors`}
          >
            l4yercak3
          </a>
        </p>
      </footer>
    </div>
  );
}
