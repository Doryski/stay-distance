import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { InlineBadge } from "../../src/core/ui/InlineBadge"
import { SaveButton } from "../../src/core/ui/SaveButton"
import { MatrixView } from "../../src/core/ui/MatrixView"
import { OriginManager } from "../../src/core/ui/OriginManager"
import { addSavedListing } from "../../src/core/storage/listings"
import { addOrigin, listOrigins } from "../../src/core/storage/origins"
import { getSettings, updateSettings } from "../../src/core/storage/settings"
import { MESSAGE_KIND } from "../../src/core/messaging/protocol"

const wrap = (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe("InlineBadge", () => {
  it("shows placeholder when result is null", () => {
    render(<InlineBadge result={null} />)
    expect(screen.getByText("—")).toBeDefined()
  })

  it("shows loading indicator", () => {
    render(<InlineBadge result={null} loading />)
    expect(screen.getByText("…")).toBeDefined()
  })

  it("formats duration and distance", () => {
    render(
      <InlineBadge result={{ durationMinutes: 75, distanceKm: 20 }} originLabel="Home" />
    )
    expect(screen.getByText(/1h 15min/)).toBeDefined()
    expect(screen.getByText(/20 km/)).toBeDefined()
  })

  it("honors the distance metric in compact mode", () => {
    render(
      <InlineBadge
        compact
        metric="distance"
        result={{ durationMinutes: 75, distanceKm: 20 }}
        originLabel="Home"
      />
    )
    expect(screen.getByText("Home")).toBeDefined()
    expect(screen.getByText(/20 km/)).toBeDefined()
    expect(screen.queryByText(/1h 15min/)).toBeNull()
  })

  it("paints the fast tier when value is within the threshold", () => {
    const { container } = render(
      <InlineBadge
        compact
        metric="duration"
        result={{ durationMinutes: 10, distanceKm: 5 }}
        fastThreshold={15}
        originLabel="Home"
      />
    )
    const chip = container.querySelector("span[aria-label]")
    expect(chip?.className).toMatch(/brand/)
  })

  it("paints the neutral tier when value is above the threshold", () => {
    const { container } = render(
      <InlineBadge
        compact
        metric="duration"
        result={{ durationMinutes: 40, distanceKm: 30 }}
        fastThreshold={15}
        originLabel="Home"
      />
    )
    const chip = container.querySelector("span[aria-label]")
    expect(chip?.className).not.toMatch(/brand/)
  })

  it("evaluates fast tier against the distance metric when active", () => {
    const { container } = render(
      <InlineBadge
        compact
        metric="distance"
        result={{ durationMinutes: 120, distanceKm: 5 }}
        fastThreshold={10}
        originLabel="Home"
      />
    )
    const chip = container.querySelector("span[aria-label]")
    expect(chip?.className).toMatch(/brand/)
  })
})

describe("SaveButton", () => {
  it("renders unsaved state", () => {
    render(<SaveButton saved={false} onToggle={() => {}} />)
    const btn = screen.getByRole("button")
    expect(btn.getAttribute("aria-pressed")).toBe("false")
    expect(btn.textContent).toMatch(/Save/)
  })

  it("renders saved state", () => {
    render(<SaveButton saved={true} onToggle={() => {}} />)
    const btn = screen.getByRole("button")
    expect(btn.getAttribute("aria-pressed")).toBe("true")
    expect(btn.textContent).toMatch(/Saved/)
  })

  it("calls onToggle and prevents default", async () => {
    const onToggle = vi.fn()
    render(<SaveButton saved={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole("button"))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})

describe("MatrixView", () => {
  it("shows empty state when no saved listings", async () => {
    wrap(<MatrixView />)
    await waitFor(() => expect(screen.getByText(/Listings you save/i)).toBeDefined())
  })

  it("lists saved listings", async () => {
    await addSavedListing({
      platformId: "booking",
      externalId: "1",
      title: "Hotel Alpha",
      url: "https://www.booking.com/hotel/a.html",
      savedAt: 1,
    })
    wrap(<MatrixView />)
    await waitFor(() => expect(screen.getByText("Hotel Alpha")).toBeDefined())
    const link = screen.getByRole("link", { name: "Hotel Alpha" }) as HTMLAnchorElement
    expect(link.href).toContain("booking.com/hotel/a.html")
  })
})

describe("OriginManager", () => {
  const openForm = async () => {
    await userEvent.click(screen.getByRole("button", { name: /Add place/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/Label/)).toBeDefined())
  }

  it("renders empty hint with the add-place CTA hidden initially", async () => {
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText(/Add a place/i)).toBeDefined())
    expect(screen.getByRole("button", { name: /Add place/i })).toBeDefined()
    expect(screen.queryByPlaceholderText(/Label/)).toBeNull()
    expect(screen.queryByPlaceholderText(/Address/)).toBeNull()
  })

  it("reveals the form after clicking Add place", async () => {
    wrap(<OriginManager />)
    await openForm()
    expect(screen.getByPlaceholderText(/Label/)).toBeDefined()
    expect(screen.getByPlaceholderText(/Address/)).toBeDefined()
    expect(screen.getByRole("button", { name: /Save/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDefined()
  })

  it("Cancel hides the form and clears inputs", async () => {
    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "draft")
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }))
    await waitFor(() => expect(screen.queryByPlaceholderText(/Label/)).toBeNull())
    // Reopen: inputs should be empty
    await openForm()
    expect((screen.getByPlaceholderText(/Label/) as HTMLInputElement).value).toBe("")
  })

  it("validates label and address before sending", async () => {
    wrap(<OriginManager />)
    await openForm()
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() => expect(screen.getByText(/Label is required/i)).toBeDefined())
    expect(screen.getByText(/Address must be at least 5 characters/i)).toBeDefined()
  })

  it("treats whitespace-only inputs as invalid", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockReset()
    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "   ")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "\t")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() => expect(screen.getByText(/Label is required/i)).toBeDefined())
    expect(screen.getByText(/Address must be at least 5 characters/i)).toBeDefined()
    expect(fn).not.toHaveBeenCalled()
  })

  it("adds a place via geocode message, trims inputs, and auto-selects the new origin", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({
      ok: true,
      data: { coords: { lat: 52, lon: 21 } },
    })

    wrap(<OriginManager />)
    await openForm()
    const labelInput = screen.getByPlaceholderText(/Label/) as HTMLInputElement
    const addressInput = screen.getByPlaceholderText(/Address/) as HTMLInputElement
    await userEvent.type(labelInput, "  Home  ")
    await userEvent.type(addressInput, "  Warszawa  ")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))

    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    expect(fn).toHaveBeenCalledWith({
      kind: MESSAGE_KIND.geocode,
      address: "Warszawa",
    })
    // Form auto-closed after success
    await waitFor(() => expect(screen.queryByPlaceholderText(/Label/)).toBeNull())
    // Trimmed before persist
    const stored = await listOrigins()
    expect(stored[0]!.label).toBe("Home")
    expect(stored[0]!.address).toBe("Warszawa")
    // Newly added origin is auto-selected
    expect((await getSettings()).activeOriginIds).toEqual([stored[0]!.id])
    fn.mockReset()
  })

  it("appends new origin to existing selection when a new place is added", async () => {
    await addOrigin({
      id: "keep",
      label: "Keep",
      address: "Addr",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["keep"] })
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({ ok: true, data: { coords: { lat: 2, lon: 2 } } })

    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("Keep")).toBeDefined())
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "Second")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "Gdansk")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))

    await waitFor(() => expect(screen.getByText("Second")).toBeDefined())
    const ids = (await getSettings()).activeOriginIds
    expect(ids[0]).toBe("keep")
    expect(ids).toHaveLength(2)
    fn.mockReset()
  })

  it("surfaces geocode errors from the envelope", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({ ok: false, error: "Address not found" })

    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "X")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "nowhere")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() => expect(screen.getByText(/Address not found/i)).toBeDefined())
    fn.mockReset()
  })

  it("surfaces non-Error thrown values as stringified errors", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockRejectedValue("boom-string")

    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "X")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "nowhere")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() => expect(screen.getByText(/boom-string/)).toBeDefined())
    fn.mockReset()
  })

  it("disables the Save button and shows loading label while pending", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    let resolve: ((value: unknown) => void) | undefined
    fn.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        })
    )

    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "Home")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "Warszawa")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Adding/i })).toBeDefined()
    )
    const pendingBtn = screen.getByRole("button", {
      name: /Adding/i,
    }) as HTMLButtonElement
    expect(pendingBtn.disabled).toBe(true)
    const cancelBtn = screen.getByRole("button", {
      name: /Cancel/i,
    }) as HTMLButtonElement
    expect(cancelBtn.disabled).toBe(true)

    resolve?.({ ok: true, data: { coords: { lat: 1, lon: 2 } } })
    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    fn.mockReset()
  })

  it("clears validation error after fixing inputs and submitting successfully", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({ ok: true, data: { coords: { lat: 1, lon: 2 } } })

    wrap(<OriginManager />)
    await openForm()
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() => expect(screen.getByText(/Label is required/i)).toBeDefined())

    await userEvent.type(screen.getByPlaceholderText(/Label/), "Home")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "Warszawa")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))

    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    expect(screen.queryByText(/Label is required/i)).toBeNull()
    expect(screen.queryByText(/Address must be at least/i)).toBeNull()
    fn.mockReset()
  })

  it("lists existing origins with remove buttons and removes them", async () => {
    await addOrigin({
      id: "a",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    })
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    expect(screen.getByLabelText(/Toggle Home/i)).toBeDefined()

    await userEvent.click(screen.getByLabelText(/^Remove Home$/i))
    await userEvent.click(screen.getByLabelText(/Confirm remove Home/i))
    await waitFor(async () => expect((await listOrigins()).length).toBe(0))
  })

  it("rejects labels longer than the 40-char limit", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockReset()
    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "x".repeat(41))
    await userEvent.type(screen.getByPlaceholderText(/Address/), "Warszawa")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() =>
      expect(screen.getByText(/Label must be 40 characters or less/i)).toBeDefined()
    )
    expect(fn).not.toHaveBeenCalled()
  })

  it("rejects duplicate labels case-insensitively", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockReset()
    await addOrigin({
      id: "a",
      label: "Home",
      address: "Warszawa Centrum",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "home")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "Gdansk Stare")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() =>
      expect(screen.getByText(/A place with this label already exists/i)).toBeDefined()
    )
    expect(fn).not.toHaveBeenCalled()
  })

  it("rejects addresses shorter than 5 characters", async () => {
    wrap(<OriginManager />)
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "Home")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "abc")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() =>
      expect(screen.getByText(/Address must be at least 5 characters/i)).toBeDefined()
    )
  })

  it("rejects addresses that match an existing one after normalization", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockReset()
    await addOrigin({
      id: "a",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    await openForm()
    await userEvent.type(screen.getByPlaceholderText(/Label/), "Office")
    await userEvent.type(screen.getByPlaceholderText(/Address/), "  warszawa ")
    await userEvent.click(screen.getByRole("button", { name: /^Save$/ }))
    await waitFor(() =>
      expect(screen.getByText(/Another place already uses this address/i)).toBeDefined()
    )
    expect(fn).not.toHaveBeenCalled()
  })

  it("disables Add place and shows a hint when at the origins cap", async () => {
    for (let i = 0; i < 10; i++) {
      await addOrigin({
        id: `o${i}`,
        label: `P${i}`,
        address: `Address number ${i}`,
        coords: { lat: i, lon: i },
        createdAt: i,
      })
    }
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("P0")).toBeDefined())
    const addButton = screen.getByRole("button", {
      name: /Add place/i,
    }) as HTMLButtonElement
    expect(addButton.disabled).toBe(true)
    expect(screen.getByText(/10-place limit/i)).toBeDefined()
  })

  it("disables Save in edit mode when nothing has changed", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockReset()
    await addOrigin({
      id: "a",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    await userEvent.click(screen.getByLabelText(/^Edit Home$/i))
    const saveBtn = await screen.findByRole("button", { name: /Save changes/i })
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(saveBtn)
    expect(fn).not.toHaveBeenCalled()
  })

  it("allows editing an origin without tripping its own duplicate check", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({ ok: true, data: { coords: { lat: 9, lon: 9 } } })
    await addOrigin({
      id: "a",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("Home")).toBeDefined())
    await userEvent.click(screen.getByLabelText(/^Edit Home$/i))
    const addressInput = await screen.findByPlaceholderText(/Address/)
    await userEvent.clear(addressInput)
    await userEvent.type(addressInput, "Krakow Stare Miasto")
    await userEvent.click(screen.getByRole("button", { name: /Save changes/i }))
    await waitFor(() => expect(screen.getByText("Krakow Stare Miasto")).toBeDefined())
    fn.mockReset()
  })

  it("toggles selected origins via the checkbox input", async () => {
    await addOrigin({
      id: "a",
      label: "A",
      address: "aaa",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    await addOrigin({
      id: "b",
      label: "B",
      address: "bbb",
      coords: { lat: 2, lon: 2 },
      createdAt: 2,
    })
    wrap(<OriginManager />)
    await waitFor(() => expect(screen.getByText("A")).toBeDefined())
    await userEvent.click(screen.getByLabelText(/Toggle B/i))
    await waitFor(async () =>
      expect((await getSettings()).activeOriginIds).toEqual(["b"])
    )
    await userEvent.click(screen.getByLabelText(/Toggle A/i))
    await waitFor(async () =>
      expect((await getSettings()).activeOriginIds).toEqual(["b", "a"])
    )
    await userEvent.click(screen.getByLabelText(/Toggle B/i))
    await waitFor(async () =>
      expect((await getSettings()).activeOriginIds).toEqual(["a"])
    )
  })
})
