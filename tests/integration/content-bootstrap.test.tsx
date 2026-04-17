import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const originalLocation = window.location

const setLocation = (href: string) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(href),
  })
}

beforeEach(() => {
  document.body.innerHTML = ""
  vi.resetModules()
})

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  })
})

describe("content/index.tsx bootstrap", () => {
  it("no-ops on a non-booking URL (no scanning side effects)", async () => {
    setLocation("https://example.com/")
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    await import("../../src/content/index")
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("no adapter"),
      expect.any(String)
    )
    debugSpy.mockRestore()
  })

  it("initial scan skips cards when extractors return null", async () => {
    setLocation("https://www.booking.com/searchresults.html")

    // Put a card in the DOM; extractors are placeholders → no listing is produced.
    const card = document.createElement("div")
    card.setAttribute("data-testid", "property-card")
    document.body.appendChild(card)

    await import("../../src/content/index")
    await new Promise((r) => setTimeout(r, 0))

    // No mount attribute should be set because extractListing returns null.
    expect(card.hasAttribute("data-stay-distance-mounted")).toBe(false)
  })
})
