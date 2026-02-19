"use client";

/**
 * TEAM SECTION
 *
 * Displays team members in a grid layout.
 */

import { EditableText } from "@/components/project-editing";
import { Linkedin, Twitter, Mail } from "lucide-react";
import type { TeamSectionProps, TeamMember } from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface TeamSectionComponentProps extends TeamSectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

function TeamMemberCard({
  member,
  sectionId,
  index,
  isEditMode,
}: {
  member: TeamMember;
  sectionId: string;
  index: number;
  isEditMode: boolean;
}) {
  return (
    <div className="text-center">
      {/* Avatar */}
      <div className="relative mx-auto w-32 h-32 mb-4">
        {member.image ? (
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-amber-400 flex items-center justify-center text-white text-3xl font-bold">
            {member.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name */}
      {isEditMode ? (
        <EditableText
          blockId={`${sectionId}.members.${index}.name`}
          defaultValue={member.name}
          as="h3"
          className="text-lg font-semibold text-gray-900"
        />
      ) : (
        <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
      )}

      {/* Role */}
      {isEditMode ? (
        <EditableText
          blockId={`${sectionId}.members.${index}.role`}
          defaultValue={member.role}
          as="p"
          className="text-sm text-indigo-600 font-medium"
        />
      ) : (
        <p className="text-sm text-indigo-600 font-medium">{member.role}</p>
      )}

      {/* Bio */}
      {member.bio &&
        (isEditMode ? (
          <EditableText
            blockId={`${sectionId}.members.${index}.bio`}
            defaultValue={member.bio}
            as="p"
            className="mt-2 text-sm text-gray-500"
          />
        ) : (
          <p className="mt-2 text-sm text-gray-500">{member.bio}</p>
        ))}

      {/* Social links */}
      {member.social && (
        <div className="mt-4 flex justify-center gap-3">
          {member.social.linkedin && (
            <a
              href={member.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          )}
          {member.social.twitter && (
            <a
              href={member.social.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
          )}
          {member.social.email && (
            <a
              href={`mailto:${member.social.email}`}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Mail className="w-5 h-5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function TeamSection({
  sectionId,
  isEditMode = false,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-gray-50 py-16 sm:py-24",
  layout = "grid-3",
  members,
}: TeamSectionComponentProps) {
  const gridCols = {
    "grid-2": "md:grid-cols-2",
    "grid-3": "md:grid-cols-2 lg:grid-cols-3",
    "grid-4": "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={backgroundClassName}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {badge && (
            <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-full mb-4">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.badge`}
                  defaultValue={badge}
                  as="span"
                />
              ) : (
                badge
              )}
            </span>
          )}
          {isEditMode ? (
            <EditableText
              blockId={`${sectionId}.title`}
              defaultValue={title}
              as="h2"
              className={titleClassName}
            />
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
          {subtitle &&
            (isEditMode ? (
              <EditableText
                blockId={`${sectionId}.subtitle`}
                defaultValue={subtitle}
                as="p"
                className={subtitleClassName}
              />
            ) : (
              <p className={subtitleClassName}>{subtitle}</p>
            ))}
        </div>

        {/* Team Grid */}
        <div className={`grid gap-8 ${gridCols[layout]}`}>
          {members.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              sectionId={sectionId}
              index={index}
              isEditMode={isEditMode}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
