import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { MatrixView } from "../../src/core/ui/MatrixView"
import { addSavedListing, listSavedListings } from "../../src/core/storage/listings"
import { addOrigin } from "../../src/core/storage/origins"
import { getSettings, updateSettings } from "../../src/core/storage/settings"
import { MESSAGE_KIND } from "../../src/core/messaging/protocol"

const wrap = (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

const seedListings = async () => {
  await addSavedListing({
    platformId: "booking",
    externalId: "a",
    title: "Alpha",
    url: "https://www.booking.com/hotel/a.html",
    coords: { lat: 10, lon: 10 },
    savedAt: 1,
  })
  await addSavedListing({
    platformId: "booking",
    externalId: "b",
    title: "Beta",
    url: "https://www.booking.com/hotel/b.html",
    coords: { lat: 20, lon: 20 },
    savedAt: 2,
  })
}

const stubRouteResponses = () => {
  const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
  fn.mockImplementation(async (msg: { kind: string }) => {
    if (msg.kind === MESSAGE_KIND.resolveListingCoords) {
      return { ok: true, data: { coords: { lat: 1, lon: 1 } } }
    }
    if (msg.kind === MESSAGE_KIND.route) {
      return {
        ok: true,
        data: { route: { durationMinutes: 30, distanceKm: 10 } },
      }
    }
    return { ok: true, data: {} }
  })
}

describe("MatrixView: sorting and toolbar", () => {
  it("renders origin headers and toggles sort key via header clicks", async () => {
    await seedListings()
    await addOrigin({
      id: "o1",
      label: "Home",
      address: "a",
      coords: { lat: 0, lon: 0 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["o1"] })
    stubRouteResponses()
    wrap(<MatrixView />)

    const homeHeader = await screen.findByRole("button", { name: /Home/ })
    await userEvent.click(homeHeader)

    await waitFor(async () => {
      const s = await getSettings()
      expect(s.matrixSort.key).toEqual({ kind: "origin", id: "o1" })
      expect(s.matrixSort.dir).toBe("asc")
    })
  })

  it("flips direction to desc when the current title sort is clicked again", async () => {
    await seedListings()
    wrap(<MatrixView />)
    const title = await screen.findByRole("button", { name: /Listing/ })
    await userEvent.click(title)
    await waitFor(async () => {
      const s = await getSettings()
      expect(s.matrixSort.key).toEqual({ kind: "title" })
      expect(s.matrixSort.dir).toBe("desc")
    })
  })

  it("updates transport mode via the segmented toolbar", async () => {
    await seedListings()
    wrap(<MatrixView />)
    const cycling = (await screen.findAllByRole("radio")).find(
      (el) => el.getAttribute("aria-label") === "Cycling"
    )
    expect(cycling).toBeDefined()
    await userEvent.click(cycling!)
    await waitFor(async () => {
      expect((await getSettings()).transportMode).toBe("cycling")
    })
  })

  it("updates display metric via the segmented toolbar", async () => {
    await seedListings()
    wrap(<MatrixView />)
    const distance = (await screen.findAllByRole("radio")).find(
      (el) => el.getAttribute("aria-label") === "km"
    )
    expect(distance).toBeDefined()
    await userEvent.click(distance!)
    await waitFor(async () => {
      expect((await getSettings()).matrixDisplayMetric).toBe("distance")
    })
  })
})

describe("MatrixView: deletion flow", () => {
  it("shows confirm controls when Remove is clicked and deletes on confirm", async () => {
    await seedListings()
    wrap(<MatrixView />)
    const remove = await screen.findByRole("button", { name: /Remove Alpha/ })
    await userEvent.click(remove)
    const confirm = await screen.findByRole("button", {
      name: /Confirm remove Alpha/,
    })
    await userEvent.click(confirm)
    await waitFor(async () => {
      const remaining = await listSavedListings()
      expect(remaining.map((l) => l.title)).toEqual(["Beta"])
    })
  })

  it("cancels deletion when Cancel is clicked", async () => {
    await seedListings()
    wrap(<MatrixView />)
    const remove = await screen.findByRole("button", { name: /Remove Alpha/ })
    await userEvent.click(remove)
    const cancel = await screen.findByRole("button", {
      name: /Cancel remove Alpha/,
    })
    await userEvent.click(cancel)
    await waitFor(async () => {
      expect(screen.queryByRole("button", { name: /Confirm remove Alpha/ })).toBeNull()
    })
    expect((await listSavedListings()).length).toBe(2)
  })
})

describe("MatrixView: empty-origins state", () => {
  it("prompts the user to select a place when listings exist without active origins", async () => {
    await seedListings()
    wrap(<MatrixView />)
    await waitFor(() =>
      expect(screen.getByText(/Select at least one place/i)).toBeDefined()
    )
  })
})

describe("MatrixView: listing link integrity", () => {
  it("renders external-open links for each saved listing", async () => {
    await seedListings()
    wrap(<MatrixView />)
    const alpha = await screen.findByRole("link", { name: /Alpha/ })
    expect((alpha as HTMLAnchorElement).target).toBe("_blank")
    expect((alpha as HTMLAnchorElement).rel).toContain("noreferrer")
  })
})

describe("MatrixView: total column", () => {
  it("renders a Total column header once an origin is active", async () => {
    await seedListings()
    await addOrigin({
      id: "o1",
      label: "Home",
      address: "a",
      coords: { lat: 0, lon: 0 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["o1"] })
    stubRouteResponses()
    wrap(<MatrixView />)
    const total = await screen.findByRole("button", { name: /Total/ })
    await userEvent.click(total)
    await waitFor(async () => {
      const s = await getSettings()
      expect(s.matrixSort.key).toEqual({ kind: "total" })
    })
    // Sanity: ensure at least one row still rendered under the new sort
    const rows = within(document.body).getAllByRole("row")
    expect(rows.length).toBeGreaterThan(1)
  })
})
