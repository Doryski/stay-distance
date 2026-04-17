import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  initSidePanelScope,
  shouldEnableForUrl,
} from "../../src/background/sidepanel-scope"

describe("shouldEnableForUrl", () => {
  it("enables on booking.com hostnames", () => {
    expect(shouldEnableForUrl("https://www.booking.com/searchresults.html")).toBe(true)
    expect(shouldEnableForUrl("https://www.booking.com/hotel/nl/foo.html")).toBe(true)
    expect(shouldEnableForUrl("https://booking.com/")).toBe(true)
  })

  it("disables on unsupported sites", () => {
    expect(shouldEnableForUrl("https://www.google.com/")).toBe(false)
    expect(shouldEnableForUrl("https://airbnb.com/")).toBe(false)
  })

  it("disables on non-http(s) schemes", () => {
    expect(shouldEnableForUrl("chrome://newtab/")).toBe(false)
    expect(shouldEnableForUrl("about:blank")).toBe(false)
    expect(shouldEnableForUrl("file:///tmp/x.html")).toBe(false)
  })

  it("disables on missing / malformed URLs", () => {
    expect(shouldEnableForUrl(undefined)).toBe(false)
    expect(shouldEnableForUrl("")).toBe(false)
    expect(shouldEnableForUrl("not a url")).toBe(false)
  })
})

type UpdatedListener = (
  tabId: number,
  changeInfo: { url?: string; status?: string },
  tab: { url?: string }
) => void
type ActivatedListener = (info: { tabId: number }) => void

describe("initSidePanelScope", () => {
  let updated: UpdatedListener | undefined
  let activated: ActivatedListener | undefined
  let setOptions: ReturnType<typeof vi.fn>

  beforeEach(() => {
    updated = undefined
    activated = undefined
    ;(
      chrome.tabs.onUpdated.addListener as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation((fn: UpdatedListener) => {
      updated = fn
    })
    ;(
      chrome.tabs.onActivated.addListener as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation((fn: ActivatedListener) => {
      activated = fn
    })
    setOptions = vi.fn().mockResolvedValue(undefined)
    ;(
      chrome.sidePanel as unknown as { setOptions: ReturnType<typeof vi.fn> }
    ).setOptions = setOptions

    initSidePanelScope()
  })

  it("enables side panel on a booking.com URL change", async () => {
    updated?.(42, { url: "https://www.booking.com/searchresults.html" }, {})
    await Promise.resolve()
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 42,
      path: "src/sidepanel/index.html",
      enabled: true,
    })
  })

  it("disables side panel on non-platform URL change", async () => {
    updated?.(7, { url: "https://www.google.com/" }, {})
    await Promise.resolve()
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 7,
      path: "src/sidepanel/index.html",
      enabled: false,
    })
  })

  it("uses tab.url on status=complete when changeInfo.url is absent", async () => {
    updated?.(9, { status: "complete" }, { url: "https://www.booking.com/" })
    await Promise.resolve()
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 9,
      path: "src/sidepanel/index.html",
      enabled: true,
    })
  })

  it("ignores change events with no url and no completion", async () => {
    updated?.(9, { status: "loading" }, { url: "https://www.booking.com/" })
    await Promise.resolve()
    expect(setOptions).not.toHaveBeenCalled()
  })

  it("queries the active tab and updates on tab activation", async () => {
    ;(chrome.tabs.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_tabId: number, cb: (tab: { url?: string }) => void) => {
        cb({ url: "https://www.booking.com/hotel/nl/x.html" })
      }
    )
    activated?.({ tabId: 12 })
    await Promise.resolve()
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 12,
      path: "src/sidepanel/index.html",
      enabled: true,
    })
  })

  it("disables side panel when activated tab has no url", async () => {
    ;(chrome.tabs.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_tabId: number, cb: (tab: { url?: string }) => void) => cb({})
    )
    activated?.({ tabId: 33 })
    await Promise.resolve()
    expect(setOptions).toHaveBeenCalledWith({
      tabId: 33,
      path: "src/sidepanel/index.html",
      enabled: false,
    })
  })

  it("skips updates when chrome.tabs.get reports lastError (tab gone)", async () => {
    const runtime = chrome.runtime as unknown as { lastError?: { message: string } }
    ;(chrome.tabs.get as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_tabId: number, cb: (tab: { url?: string }) => void) => {
        runtime.lastError = { message: "No tab with id" }
        cb({})
        delete runtime.lastError
      }
    )
    activated?.({ tabId: 99 })
    await Promise.resolve()
    expect(setOptions).not.toHaveBeenCalled()
  })

  it("swallows setOptions rejection (tab may have closed mid-flight)", async () => {
    setOptions.mockRejectedValueOnce(new Error("tab gone"))
    updated?.(55, { url: "https://www.booking.com/" }, {})
    // Await the microtask queue — if the rejection escaped, Vitest would fail.
    await new Promise((r) => setTimeout(r, 0))
    expect(setOptions).toHaveBeenCalledTimes(1)
  })
})
