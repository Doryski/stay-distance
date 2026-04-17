import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ExportPdfButton } from "../../src/core/ui/ExportPdfButton"
import { addSavedListing } from "../../src/core/storage/listings"
import { addOrigin } from "../../src/core/storage/origins"
import { updateSettings } from "../../src/core/storage/settings"
import { writeGeocode, writeRoute } from "../../src/core/storage/cache"

// vi.mock is hoisted above top-level statements, so mock fns must be declared
// via vi.hoisted() to be available inside the factory.
const { download, createPdf, addVirtualFileSystem } = vi.hoisted(() => {
  const download = vi.fn()
  return {
    download,
    createPdf: vi.fn(() => ({ download })),
    addVirtualFileSystem: vi.fn(),
  }
})

vi.mock("pdfmake/build/pdfmake", () => ({
  default: { createPdf, addVirtualFileSystem },
}))
vi.mock("pdfmake/build/vfs_fonts", () => ({ default: {} }))

const wrap = (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe("ExportPdfButton", () => {
  it("is disabled with 'Save a listing first' tooltip when no listings are saved", async () => {
    wrap(<ExportPdfButton />)
    const btn = (await screen.findByRole("button", {
      name: /Save a listing first/i,
    })) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it("is enabled when listings exist and triggers a PDF download on click", async () => {
    const origin = {
      id: "o1",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    }
    await addOrigin(origin)
    await updateSettings({ activeOriginIds: ["o1"] })
    await addSavedListing({
      platformId: "booking",
      externalId: "a",
      title: "Hotel A",
      url: "https://www.booking.com/hotel/a.html",
      coords: { lat: 50, lon: 19 },
      savedAt: 1,
    })
    await addSavedListing({
      platformId: "booking",
      externalId: "b",
      title: "Hotel B",
      url: "https://www.booking.com/hotel/b.html",
      address: "Krakow",
      savedAt: 2,
    })
    await writeGeocode("Krakow", { lat: 50.06, lon: 19.93 })
    await writeRoute(origin.coords, { lat: 50, lon: 19 }, "driving", {
      durationMinutes: 300,
      distanceKm: 300,
    })

    createPdf.mockClear()
    download.mockClear()

    wrap(<ExportPdfButton />)
    const btn = (await screen.findByRole("button", {
      name: /Export PDF report/i,
    })) as HTMLButtonElement
    await waitFor(() => expect(btn.disabled).toBe(false))
    await userEvent.click(btn)

    await waitFor(() => expect(createPdf).toHaveBeenCalledTimes(1))
    expect(download).toHaveBeenCalledTimes(1)
    const filename = download.mock.calls[0]![0] as string
    expect(filename).toMatch(/\.pdf$/i)
  })
})
