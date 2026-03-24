/* @vitest-environment jsdom */

import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  ChatMarkdownMessage,
  normalizeDenseAssistantMarkdown,
} from "../../../src/components/window-content/ai-chat-window/chat-markdown-message"

describe("ChatMarkdownMessage", () => {
  it("renders markdown structure for assistant responses", () => {
    render(
      React.createElement(ChatMarkdownMessage, {
        content:
          "**Contacts & CRM**\n- Create contacts\n- Organize contacts\n\n[Open docs](https://example.com/docs)",
      })
    )

    const lists = screen.getAllByRole("list")
    expect(lists).toHaveLength(1)
    expect(lists[0]?.querySelectorAll("li")).toHaveLength(2)
    expect(screen.getByText("Contacts & CRM").tagName).toBe("STRONG")

    const docsLink = screen.getByRole("link", { name: "Open docs" }) as HTMLAnchorElement
    expect(docsLink.getAttribute("href")).toBe("https://example.com/docs")
    expect(docsLink.getAttribute("target")).toBe("_blank")
  })

  it("normalizes dense single-line capability dumps into markdown lists", () => {
    const dense =
      "I help you run operations across a few key areas: **Contacts & CRM** - Create contacts - Organize with tags **Events & Scheduling** - Create events - Manage capacity limits"

    const normalized = normalizeDenseAssistantMarkdown(dense)
    expect(normalized).toContain("**Contacts & CRM**\n- Create contacts\n- Organize with tags")
    expect(normalized).toContain("**Events & Scheduling**\n- Create events\n- Manage capacity limits")

    render(React.createElement(ChatMarkdownMessage, { content: dense }))
    expect(screen.getAllByRole("list").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("Events & Scheduling")).toBeTruthy()
  })
})
