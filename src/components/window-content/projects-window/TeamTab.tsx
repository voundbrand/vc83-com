/**
 * TEAM TAB
 * Manage project team members (both internal team and client team)
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, User, UserMinus, Users, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { Id } from "../../../../convex/_generated/dataModel";

interface TeamTabProps {
  projectId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export default function TeamTab({
  projectId,
  sessionId,
  organizationId,
}: TeamTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<"internal" | "client">("internal");
  const [selectedId, setSelectedId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [loading, setLoading] = useState(false);

  const teamMembers = useQuery(api.projectOntology.getTeamMembers, {
    sessionId,
    projectId,
  });

  // Get all org members for internal team
  const orgUsers = useQuery(api.projectOntology.getOrganizationUsers, {
    sessionId,
    organizationId,
  });

  // Get all CRM contacts for client team
  const crmContacts = useQuery(api.projectOntology.getOrganizationContacts, {
    sessionId,
    organizationId,
  });

  const addInternalMember = useMutation(api.projectOntology.addInternalTeamMember);
  const addClientMember = useMutation(api.projectOntology.addClientTeamMember);
  const removeInternalMember = useMutation(api.projectOntology.removeInternalTeamMember);
  const removeClientMember = useMutation(api.projectOntology.removeClientTeamMember);

  const handleAdd = async () => {
    if (!selectedId) return;

    setLoading(true);
    try {
      if (selectedType === "internal") {
        await addInternalMember({
          sessionId,
          projectId,
          userId: selectedId as Id<"users">,
          role: selectedRole,
        });
      } else {
        await addClientMember({
          sessionId,
          projectId,
          contactId: selectedId as Id<"objects">,
          role: selectedRole,
        });
      }
      setShowAddForm(false);
      setSelectedId("");
      setSelectedRole("member");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add team member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (member: { id: string; type: "internal" | "client" }) => {
    if (confirm("Remove this team member from the project?")) {
      if (member.type === "internal") {
        await removeInternalMember({
          sessionId,
          projectId,
          userId: member.id as Id<"users">,
        });
      } else {
        await removeClientMember({
          sessionId,
          projectId,
          contactId: member.id as Id<"objects">,
        });
      }
    }
  };

  // Filter out members already on the team
  const internalTeamMembers = teamMembers?.filter(m => m.type === "internal") || [];
  const clientTeamMembers = teamMembers?.filter(m => m.type === "client") || [];

  const availableUsers = orgUsers?.filter(
    (u) => !internalTeamMembers.some((tm) => tm.id === u._id)
  );

  const availableContacts = crmContacts?.filter(
    (c) => !clientTeamMembers.some((tm) => tm.id === c._id)
  );

  if (teamMembers === undefined || orgUsers === undefined || crmContacts === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-gray-900">
          Team ({teamMembers.length} members)
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-xs font-bold border-2 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1"
          style={{ border: "var(--win95-border)" }}
        >
          <Plus size={14} />
          Add Member
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          className="p-3 border-2 rounded space-y-3"
          style={{
            border: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold mb-2 text-gray-700">
              Team Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedType("internal");
                  setSelectedId("");
                }}
                className={`flex-1 px-3 py-2 text-xs font-bold border-2 rounded flex items-center justify-center gap-2 ${
                  selectedType === "internal"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{ border: "var(--win95-border)" }}
              >
                <Users size={14} />
                Internal Team
              </button>
              <button
                onClick={() => {
                  setSelectedType("client");
                  setSelectedId("");
                }}
                className={`flex-1 px-3 py-2 text-xs font-bold border-2 rounded flex items-center justify-center gap-2 ${
                  selectedType === "client"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{ border: "var(--win95-border)" }}
              >
                <Building2 size={14} />
                Client Team
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Person Selector */}
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-700">
                {selectedType === "internal" ? "User" : "Contact"}
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ border: "var(--win95-border)" }}
              >
                <option value="">Select...</option>
                {selectedType === "internal"
                  ? availableUsers?.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))
                  : availableContacts?.map((contact) => (
                      <option key={contact._id} value={contact._id}>
                        {contact.name} ({contact.email})
                      </option>
                    ))}
              </select>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-700">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-2 py-1 text-sm border-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ border: "var(--win95-border)" }}
              >
                <option value="member">Member</option>
                <option value="lead">Lead</option>
                <option value="contributor">Contributor</option>
                {selectedType === "client" && <option value="stakeholder">Stakeholder</option>}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-xs border-2 rounded hover:bg-gray-100"
              style={{ border: "var(--win95-border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedId || loading}
              className="px-3 py-1 text-xs border-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              style={{ border: "var(--win95-border)" }}
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Internal Team Section */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-2">
          <Users size={14} />
          Internal Team ({internalTeamMembers.length})
        </h4>
        {internalTeamMembers.length === 0 ? (
          <div
            className="p-4 text-center border-2 rounded"
            style={{
              border: "var(--win95-border)",
              backgroundColor: "var(--win95-bg-light)",
            }}
          >
            <p className="text-xs text-gray-500">No internal team members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {internalTeamMembers.map((member) => (
              <div
                key={member.id}
                className="p-3 border-2 rounded bg-white flex items-center justify-between"
                style={{
                  border: "var(--win95-border)",
                  backgroundColor: "var(--win95-bg-light)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <User size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-gray-900">
                        {member.name}
                      </h5>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          member.role === "lead"
                            ? "bg-purple-100 text-purple-700"
                            : member.role === "contributor"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{member.email}</p>
                    <p className="text-xs text-gray-500">
                      Added {format(new Date(member.addedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(member)}
                  className="p-2 hover:bg-red-100 rounded"
                  title="Remove from team"
                >
                  <UserMinus size={16} className="text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Team Section */}
      <div>
        <h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-2">
          <Building2 size={14} />
          Client Team ({clientTeamMembers.length})
        </h4>
        {clientTeamMembers.length === 0 ? (
          <div
            className="p-4 text-center border-2 rounded"
            style={{
              border: "var(--win95-border)",
              backgroundColor: "var(--win95-bg-light)",
            }}
          >
            <p className="text-xs text-gray-500">No client team members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientTeamMembers.map((member) => (
              <div
                key={member.id}
                className="p-3 border-2 rounded bg-white flex items-center justify-between"
                style={{
                  border: "var(--win95-border)",
                  backgroundColor: "var(--win95-bg-light)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Building2 size={20} className="text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-gray-900">
                        {member.name}
                      </h5>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          member.role === "lead"
                            ? "bg-green-100 text-green-700"
                            : member.role === "stakeholder"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{member.email}</p>
                    <p className="text-xs text-gray-500">
                      Added {format(new Date(member.addedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(member)}
                  className="p-2 hover:bg-red-100 rounded"
                  title="Remove from team"
                >
                  <UserMinus size={16} className="text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
