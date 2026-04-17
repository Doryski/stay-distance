import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { Popup } from "../../src/popup/Popup"
import { SidePanel } from "../../src/sidepanel/SidePanel"
import { ListingOverlay } from "../../src/content/ListingOverlay"
import { addOrigin } from "../../src/core/storage/origins"
import { updateSettings } from "../../src/core/storage/settings"
import { listSavedListings } from "../../src/core/storage/listings"
import { MESSAGE_KIND } from "../../src/core/messaging/protocol"

const wrap = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe("Popup", () => {
  it("renders controls and reflects stored settings", async () => {
    await addOrigin({
      id: "h",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["h"], transportMode: "cycling" })

    wrap(<Popup />)
    await waitFor(() =>
      expect(screen.getAllByText(/stay distance/i).length).toBeGreaterThan(0)
    )
    await waitFor(() => {
      const transport = document.getElementById("popup-mode") as HTMLElement
      expect(transport.textContent).toMatch(/cycling/)
    })
  })

  it("updates transport mode on change", async () => {
    wrap(<Popup />)
    const transport = await waitFor(
      () => screen.getByRole("combobox") as HTMLSelectElement
    )
    fireEvent.change(transport, { target: { value: "walking" } })
    await waitFor(() => expect(transport.value).toBe("walking"))
  })

  it("toggles inline badge switch", async () => {
    wrap(<Popup />)
    const toggle = await waitFor(() => screen.getByRole("switch") as HTMLButtonElement)
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("false"))
  })

  it("shows empty hint when no origins are configured", async () => {
    wrap(<Popup />)
    await waitFor(() => expect(screen.getByText(/No places yet/i)).toBeDefined())
  })

  it("toggles places via checkboxes", async () => {
    await addOrigin({
      id: "x",
      label: "X",
      address: "addr",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    wrap(<Popup />)
    const checkbox = await waitFor(
      () => screen.getByLabelText(/Toggle X/i) as HTMLInputElement
    )
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    await waitFor(() => expect(checkbox.checked).toBe(true))
  })
})

describe("SidePanel", () => {
  it("renders OriginManager + MatrixView + clear-cache button", async () => {
    wrap(<SidePanel />)
    expect(screen.getByRole("heading", { name: /Your places/i })).toBeDefined()
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Saved listings/i })).toBeDefined()
    )
    expect(screen.getByRole("button", { name: /Clear cache/i })).toBeDefined()
  })

  it("sends clearCaches when cache button is clicked", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({ ok: true, data: { ok: true } })
    wrap(<SidePanel />)

    fireEvent.click(screen.getByRole("button", { name: /Clear cache/i }))
    await waitFor(() =>
      expect(fn).toHaveBeenCalledWith({ kind: MESSAGE_KIND.clearCaches })
    )
    fn.mockReset()
  })
})

describe("ListingOverlay", () => {
  const listing = {
    platformId: "booking",
    externalId: "h1",
    title: "Hotel One",
    url: "https://www.booking.com/hotel/one.html",
    coords: { lat: 52, lon: 21 },
  }

  it("shows inline badge when origin active and badge enabled", async () => {
    await addOrigin({
      id: "home",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["home"] })

    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockImplementation(async (req: { kind: string }) => {
      if (req.kind === MESSAGE_KIND.resolveListingCoords)
        return { ok: true, data: { coords: { lat: 52, lon: 21 } } }
      if (req.kind === MESSAGE_KIND.route)
        return {
          ok: true,
          data: { result: { durationMinutes: 15, distanceKm: 10 } },
        }
      return { ok: true, data: {} }
    })

    wrap(<ListingOverlay listing={listing} />)
    await waitFor(() => expect(screen.getByText(/15min/)).toBeDefined())
    expect(screen.getByLabelText(/Home · 15min · 10 km/)).toBeDefined()
    fn.mockReset()
  })

  it("toggles saved state via SaveButton", async () => {
    wrap(<ListingOverlay listing={listing} />)
    const btn = await waitFor(
      () => screen.getByRole("button", { pressed: false }) as HTMLButtonElement
    )
    fireEvent.click(btn)
    await waitFor(async () => {
      const saved = await listSavedListings()
      expect(saved.length).toBe(1)
      expect(saved[0]!.externalId).toBe("h1")
    })

    fireEvent.click(btn)
    await waitFor(async () => {
      expect((await listSavedListings()).length).toBe(0)
    })
  })

  it("hides inline badge when showInlineBadge is false", async () => {
    await addOrigin({
      id: "home",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["home"], showInlineBadge: false })
    wrap(<ListingOverlay listing={listing} />)
    await waitFor(() => expect(screen.getByRole("button")).toBeDefined())
    // No badge icons rendered.
    expect(screen.queryByText("🚗")).toBeNull()
  })
})
