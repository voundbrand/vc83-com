/* @vitest-environment jsdom */

import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  useSearchParamsMock,
  usePathnameMock,
  useRouterMock,
  useLanguageMock,
  useToastMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useRouterMock: vi.fn(),
  useLanguageMock: vi.fn(),
  useToastMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
}))

vi.mock("@/lib/language-context", () => ({
  useLanguage: useLanguageMock,
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: useToastMock,
}))

vi.mock("lucide-react", () => ({
  CheckCircle2: () => React.createElement("span", null, "CheckCircle2"),
  Sparkles: () => React.createElement("span", null, "Sparkles"),
  Anchor: () => React.createElement("span", null, "Anchor"),
  Users: () => React.createElement("span", null, "Users"),
  Phone: () => React.createElement("span", null, "Phone"),
  MessageCircle: () => React.createElement("span", null, "MessageCircle"),
  Loader2: () => React.createElement("span", null, "Loader2"),
}))

vi.mock("@/components/header", () => ({
  Header: () => React.createElement("div", null, "header"),
}))

vi.mock("@/components/footer", () => ({
  Footer: () => React.createElement("div", null, "footer"),
}))

vi.mock("@/components/wave-divider", () => ({
  WaveDivider: () => React.createElement("div", null, "wave-divider"),
}))

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => React.createElement("div", null, "toaster"),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    asChild,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props as Record<string, unknown>)
    }
    return React.createElement("button", props, children)
  },
}))

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props, children),
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props, children),
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props, children),
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) =>
    React.createElement("h3", props, children),
  CardDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) =>
    React.createElement("p", props, children),
}))

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement("input", props),
}))

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) =>
    React.createElement("label", props, children),
}))

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
    React.createElement("textarea", props),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: () => React.createElement("div", null, "calendar"),
}))

import BookingPage from "../../../apps/segelschule-altwarp/app/booking/page"

describe("Segelschule booking page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).React = React
    useSearchParamsMock.mockReturnValue(new URLSearchParams("course=wochenende"))
    usePathnameMock.mockReturnValue("/booking")
    useRouterMock.mockReturnValue({
      replace: vi.fn(),
    })
    useLanguageMock.mockReturnValue({
      language: "de",
      setLanguage: vi.fn(),
    })
    useToastMock.mockReturnValue({
      toast: vi.fn(),
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes("/api/booking/catalog")) {
          return new Response(
            JSON.stringify({
              ok: true,
              boats: [
                { id: "fraukje", name: "Fraukje", seatCount: 4 },
                { id: "rose", name: "Rose", seatCount: 4 },
              ],
              courses: [
                {
                  courseId: "schnupper",
                  aliases: ["schnupper"],
                  title: "Schnupperkurs",
                  description: "Erster Einstieg auf dem Wasser.",
                  durationLabel: "3 Stunden",
                  durationMinutes: 180,
                  priceInCents: 12900,
                  currency: "EUR",
                  isMultiDay: false,
                },
                {
                  courseId: "grund",
                  aliases: ["grund", "wochenende"],
                  title: "Wochenendkurs",
                  description: "Zwei Tage Segelpraxis.",
                  durationLabel: "2 Tage",
                  durationMinutes: 480,
                  priceInCents: 19900,
                  currency: "EUR",
                  isMultiDay: true,
                },
              ],
            }),
            { status: 200 }
          )
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })
    )
  })

  it("keeps landing-page preselection but lets step 1 change the active backend course", async () => {
    render(React.createElement(BookingPage))

    const router = useRouterMock.mock.results[0]?.value as {
      replace: ReturnType<typeof vi.fn>
    }

    expect(await screen.findByText("Schnupperkurs")).toBeTruthy()
    expect(screen.getByText("Wochenendkurs")).toBeTruthy()
    expect(screen.queryByText("Intensivkurs")).toBeFalsy()

    const continueButton = await screen.findByRole("button", { name: "Weiter" })
    await waitFor(() => {
      expect(continueButton.hasAttribute("disabled")).toBe(false)
    })
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/booking?course=grund", {
        scroll: false,
      })
    })

    fireEvent.click(continueButton)

    expect(
      await screen.findByText("Wähle Datum, Uhrzeit & Plätze")
    ).toBeTruthy()
    expect(screen.getByText("Wochenendkurs")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Wähle deinen Kurs" }))
    fireEvent.click(await screen.findByText("Schnupperkurs"))
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/booking?course=schnupper", {
        scroll: false,
      })
    })
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }))

    expect(
      await screen.findByText("Wähle Datum, Uhrzeit & Plätze")
    ).toBeTruthy()
    expect(screen.getByText("Schnupperkurs")).toBeTruthy()
    expect(screen.queryByText("Wochenendkurs")).toBeFalsy()
  })

  it("shows an empty-state message when the backend catalog resolves no products", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes("/api/booking/catalog")) {
          return new Response(
            JSON.stringify({
              ok: true,
              boats: [
                { id: "fraukje", name: "Fraukje", seatCount: 4 },
                { id: "rose", name: "Rose", seatCount: 4 },
              ],
              courses: [],
            }),
            { status: 200 }
          )
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })
    )

    render(React.createElement(BookingPage))

    expect(
      await screen.findByText("No products are currently available for this booking surface.")
    ).toBeTruthy()
    expect(screen.queryByText("Schnupperkurs")).toBeFalsy()
    expect(screen.getByRole("button", { name: "Weiter" }).hasAttribute("disabled")).toBe(true)
  })
})
