"use client";

/**
 * TESTIMONIALS SECTION
 *
 * Displays customer testimonials in a grid or carousel layout.
 */

import { EditableText } from "@/components/project-editing";
import { Star } from "lucide-react";
import type {
  TestimonialsSectionProps,
  TestimonialItem,
} from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface TestimonialsSectionComponentProps extends TestimonialsSectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

function TestimonialCard({
  testimonial,
  sectionId,
  index,
  isEditMode,
}: {
  testimonial: TestimonialItem;
  sectionId: string;
  index: number;
  isEditMode: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* Rating stars */}
      {testimonial.rating && (
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= testimonial.rating!
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-200"
              }`}
            />
          ))}
        </div>
      )}

      {/* Quote */}
      <blockquote className="text-gray-700 mb-4">
        {isEditMode ? (
          <EditableText
            blockId={`${sectionId}.testimonials.${index}.quote`}
            defaultValue={testimonial.quote}
            as="p"
            className="italic"
          />
        ) : (
          <p className="italic">&ldquo;{testimonial.quote}&rdquo;</p>
        )}
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt={testimonial.author}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-semibold">
            {testimonial.author.charAt(0)}
          </div>
        )}
        <div>
          {isEditMode ? (
            <>
              <EditableText
                blockId={`${sectionId}.testimonials.${index}.author`}
                defaultValue={testimonial.author}
                as="p"
                className="font-semibold text-gray-900"
              />
              {testimonial.role && (
                <EditableText
                  blockId={`${sectionId}.testimonials.${index}.role`}
                  defaultValue={testimonial.role}
                  as="p"
                  className="text-sm text-gray-500"
                />
              )}
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-900">{testimonial.author}</p>
              {(testimonial.role || testimonial.company) && (
                <p className="text-sm text-gray-500">
                  {testimonial.role}
                  {testimonial.role && testimonial.company && " at "}
                  {testimonial.company}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection({
  sectionId,
  isEditMode = false,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-gray-50 py-16 sm:py-24",
  layout = "grid",
  testimonials,
}: TestimonialsSectionComponentProps) {
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

        {/* Testimonials Grid */}
        <div
          className={
            layout === "single"
              ? "max-w-2xl mx-auto"
              : layout === "carousel"
                ? "flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory"
                : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={layout === "carousel" ? "flex-shrink-0 w-80 snap-center" : ""}
            >
              <TestimonialCard
                testimonial={testimonial}
                sectionId={sectionId}
                index={index}
                isEditMode={isEditMode}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
