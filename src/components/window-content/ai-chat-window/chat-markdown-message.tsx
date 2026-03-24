"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { CHAT_MESSAGE_X_SCROLL_FALLBACK_CLASS } from "./message-content-styles"

const CHAT_MARKDOWN_ROOT_CLASS = "min-w-0 break-words [overflow-wrap:anywhere]"

function joinClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export function normalizeDenseAssistantMarkdown(rawContent: string): string {
  const content = rawContent.replace(/\r\n?/g, "\n").trim()
  if (content.length === 0) {
    return content
  }

  const hasHeadingBulletPattern = /\*\*[^*]+\*\*\s-\s/.test(content)
  const hasInlineBullets = (content.match(/\s-\s/g) || []).length >= 2
  const hasExplicitLineBreaks = content.includes("\n")

  if (!hasExplicitLineBreaks && hasHeadingBulletPattern && hasInlineBullets) {
    return content
      .replace(/\s+\*\*([^*][^*]*?)\*\*\s-\s/g, "\n\n**$1**\n- ")
      .replace(/\s-\s/g, "\n- ")
      .replace(/^\n+/, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }

  return content
}

interface ChatMarkdownMessageProps {
  content: string
  className?: string
}

export function ChatMarkdownMessage({ content, className }: ChatMarkdownMessageProps) {
  const normalizedContent = normalizeDenseAssistantMarkdown(content)
  return (
    <div className={joinClasses(CHAT_MESSAGE_X_SCROLL_FALLBACK_CLASS, className)}>
      <div className={CHAT_MARKDOWN_ROOT_CLASS}>
        <ReactMarkdown
          skipHtml
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            p: ({ children, ...props }) => (
              <p {...props} className="mb-3 leading-relaxed last:mb-0">
                {children}
              </p>
            ),
            ul: ({ children, ...props }) => (
              <ul {...props} className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
                {children}
              </ul>
            ),
            ol: ({ children, ...props }) => (
              <ol {...props} className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
                {children}
              </ol>
            ),
            li: ({ children, ...props }) => (
              <li {...props} className="leading-relaxed">
                {children}
              </li>
            ),
            h1: ({ children, ...props }) => (
              <h1 {...props} className="mb-2 text-base font-semibold leading-snug last:mb-0">
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 {...props} className="mb-2 text-[15px] font-semibold leading-snug last:mb-0">
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 {...props} className="mb-2 text-sm font-semibold leading-snug last:mb-0">
                {children}
              </h3>
            ),
            hr: (props) => (
              <hr
                {...props}
                className="my-3 border-0 border-t"
                style={{ borderColor: "var(--shell-border-soft)" }}
              />
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote
                {...props}
                className="mb-3 border-l-2 pl-3 italic last:mb-0"
                style={{ borderColor: "var(--shell-border-soft)", color: "var(--shell-text-dim)" }}
              >
                {children}
              </blockquote>
            ),
            pre: ({ children, ...props }) => (
              <pre
                {...props}
                className="mb-3 overflow-x-auto rounded-lg border px-3 py-2 text-xs leading-relaxed last:mb-0"
                style={{
                  borderColor: "var(--shell-border-soft)",
                  background: "var(--shell-surface)",
                }}
              >
                {children}
              </pre>
            ),
            code: ({ children, className: markdownClassName, ...props }) => (
              <code
                {...props}
                className={joinClasses(
                  "font-mono text-[0.9em]",
                  markdownClassName
                    ? markdownClassName
                    : "rounded px-1 py-0.5",
                )}
                style={
                  markdownClassName
                    ? undefined
                    : {
                        background: "rgba(15, 23, 42, 0.08)",
                      }
                }
              >
                {children}
              </code>
            ),
            a: ({ children, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-opacity hover:opacity-90"
                style={{ color: "var(--shell-accent)" }}
              >
                {children}
              </a>
            ),
          }}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}
