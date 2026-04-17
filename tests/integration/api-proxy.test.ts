import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import {
  resolveGeocode,
  resolveRoute,
  resolveListingCoords,
} from "../../src/background/api-proxy"
import { readGeocode, readRoute } from "../../src/core/storage/cache"
import { updateSettings } from "../../src/core/storage/settings"

type FetchMock = ReturnType<typeof vi.spyOn>

const mockFetchSequence = (bodies: unknown[]): FetchMock => {
  let i = 0
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const body = bodies[Math.min(i++, bodies.length - 1)]
    return new Response(JSON.stringify(body), { status: 200 })
  })
}

afterEach(() => vi.restoreAllMocks())
beforeEach(() => vi.useRealTimers())

describe("api-proxy: resolveGeocode", () => {
  it("fetches on cache miss, then serves from cache without a second fetch", async () => {
    const fetchSpy = mockFetchSequence([[{ lat: "52.23", lon: "21.01" }]])

    const first = await resolveGeocode("Warszawa")
    expect(first).toEqual({ lat: 52.23, lon: 21.01 })
    expect(await readGeocode("warszawa")).toEqual(first)

    const second = await resolveGeocode("Warszawa")
    expect(second).toEqual(first)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("normalises address casing for cache lookup", async () => {
    mockFetchSequence([[{ lat: "10", lon: "20" }]])
    await resolveGeocode("  Krakow ")
    const cached = await resolveGeocode("krakow")
    expect(cached).toEqual({ lat: 10, lon: 20 })
  })

  it("throws and does not cache when Nominatim returns empty", async () => {
    mockFetchSequence([[]])
    await expect(resolveGeocode("nowhere-xyz")).rejects.toThrow(/not found/i)
    expect(await readGeocode("nowhere-xyz")).toBeNull()
  })

  it("errors in offline mode on cache miss", async () => {
    await updateSettings({ offlineMode: true })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    await expect(resolveGeocode("anywhere")).rejects.toThrow(/offline/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("offline mode still returns cached coords", async () => {
    mockFetchSequence([[{ lat: "1", lon: "2" }]])
    await resolveGeocode("cached-city")
    vi.restoreAllMocks()

    await updateSettings({ offlineMode: true })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const coords = await resolveGeocode("cached-city")
    expect(coords).toEqual({ lat: 1, lon: 2 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("api-proxy: resolveRoute", () => {
  const from = { lat: 1, lon: 1 }
  const to = { lat: 2, lon: 2 }

  it("caches routes per mode", async () => {
    const fetchSpy = mockFetchSequence([
      { code: "Ok", routes: [{ duration: 1800, distance: 20000 }] },
    ])
    const r1 = await resolveRoute(from, to, "driving")
    expect(r1).toEqual({ durationMinutes: 30, distanceKm: 20 })
    expect(await readRoute(from, to, "driving")).toEqual(r1)

    const r2 = await resolveRoute(from, to, "driving")
    expect(r2).toEqual(r1)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("offline mode returns null on cache miss without fetching", async () => {
    await updateSettings({ offlineMode: true })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const result = await resolveRoute(from, to, "driving")
    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("does not cache null results from OSRM", async () => {
    mockFetchSequence([{ code: "NoRoute", routes: [] }])
    const result = await resolveRoute(from, to, "walking")
    expect(result).toBeNull()
    expect(await readRoute(from, to, "walking")).toBeNull()
  })
})

describe("api-proxy: resolveListingCoords", () => {
  it("returns passed coords directly without geocoding", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const coords = await resolveListingCoords({ coords: { lat: 5, lon: 6 } })
    expect(coords).toEqual({ lat: 5, lon: 6 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("falls back to geocoding the address", async () => {
    mockFetchSequence([[{ lat: "7", lon: "8" }]])
    const coords = await resolveListingCoords({ address: "Somewhere" })
    expect(coords).toEqual({ lat: 7, lon: 8 })
  })

  it("throws when neither coords nor address provided", async () => {
    await expect(resolveListingCoords({})).rejects.toThrow(/neither/i)
  })
})
