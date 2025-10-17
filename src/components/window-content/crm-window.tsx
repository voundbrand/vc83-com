"use client"

import { useState } from "react"
import { Users, Building2 } from "lucide-react"
import { ContactsList } from "./crm-window/contacts-list"
import { ContactDetail } from "./crm-window/contact-detail"
import { OrganizationsList } from "./crm-window/organizations-list"
import { OrganizationDetail } from "./crm-window/organization-detail"
import type { Id } from "../../../convex/_generated/dataModel"

type ViewType = "contacts" | "organizations"

export function CRMWindow() {
  const [activeView, setActiveView] = useState<ViewType>("contacts")
  const [selectedContactId, setSelectedContactId] = useState<Id<"objects"> | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"objects"> | null>(null)

  // Reset selection when switching views
  const handleViewSwitch = (view: ViewType) => {
    setActiveView(view)
    setSelectedContactId(null)
    setSelectedOrgId(null)
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* View Switcher Tabs */}
      <div className="flex gap-1 border-b-2 border-gray-400 p-2 bg-gray-200">
        <button
          onClick={() => handleViewSwitch("contacts")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "contacts" ? "shadow-inner bg-gray-300" : ""
          }`}
        >
          <Users size={16} />
          <span className="font-pixel text-xs">CONTACTS</span>
        </button>
        <button
          onClick={() => handleViewSwitch("organizations")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "organizations" ? "shadow-inner bg-gray-300" : ""
          }`}
        >
          <Building2 size={16} />
          <span className="font-pixel text-xs">ORGANIZATIONS</span>
        </button>
      </div>

      {/* Split Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: List View */}
        <div className="w-1/2 border-r-2 border-gray-400 overflow-y-auto bg-white">
          {activeView === "contacts" ? (
            <ContactsList
              selectedId={selectedContactId}
              onSelect={setSelectedContactId}
            />
          ) : (
            <OrganizationsList
              selectedId={selectedOrgId}
              onSelect={setSelectedOrgId}
            />
          )}
        </div>

        {/* Right: Detail View */}
        <div className="w-1/2 overflow-y-auto bg-gray-50 p-4">
          {activeView === "contacts" ? (
            selectedContactId ? (
              <ContactDetail contactId={selectedContactId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <Users size={48} className="mb-4 opacity-30" />
                <p className="font-pixel text-sm">SELECT A CONTACT</p>
                <p className="text-xs mt-2">Click a contact from the list to view details</p>
              </div>
            )
          ) : (
            selectedOrgId ? (
              <OrganizationDetail organizationId={selectedOrgId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <Building2 size={48} className="mb-4 opacity-30" />
                <p className="font-pixel text-sm">SELECT AN ORGANIZATION</p>
                <p className="text-xs mt-2">Click an organization from the list to view details</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
