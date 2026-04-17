import { describe, it, expect, vi, afterEach } from "vitest"
import { geocode } from "../../src/core/services/geocode"
import { getRoute } from "../../src/core/services/routing"

const mockFetch = (body: unknown, ok = true) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: ok ? 200 : 500,
    })
  )

afterEach(() => vi.restoreAllMocks())

describe("geocode", () => {
  it("parses Nominatim response", async () => {
    mockFetch([{ lat: "52.23", lon: "21.01" }])
    const coords = await geocode("Warszawa")
    expect(coords).toEqual({ lat: 52.23, lon: 21.01 })
  })

  it("throws when address not found", async () => {
    mockFetch([])
    await expect(geocode("nowhere-xyz")).rejects.toThrow(/not found/i)
  })
})

describe("getRoute", () => {
  it("converts OSRM seconds/meters to minutes/km", async () => {
    mockFetch({
      code: "Ok",
      routes: [{ duration: 1800, distance: 20000 }],
    })
    const result = await getRoute({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, "driving")
    expect(result).toEqual({ durationMinutes: 30, distanceKm: 20 })
  })

  it("returns null for code != Ok", async () => {
    mockFetch({ code: "NoRoute", routes: [] })
    const result = await getRoute({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, "driving")
    expect(result).toBeNull()
  })

  it("uses mode-specific OSRM host", async () => {
    const spy = mockFetch({
      code: "Ok",
      routes: [{ duration: 600, distance: 5000 }],
    })
    await getRoute({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, "cycling")
    const url = spy.mock.calls[0]![0] as string
    expect(url).toContain("routed-bike")
  })

  it("uses foot host for walking", async () => {
    const spy = mockFetch({
      code: "Ok",
      routes: [{ duration: 600, distance: 5000 }],
    })
    await getRoute({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, "walking")
    const url = spy.mock.calls[0]![0] as string
    expect(url).toContain("routed-foot")
  })

  it("uses car host for driving and encodes lon,lat order", async () => {
    const spy = mockFetch({
      code: "Ok",
      routes: [{ duration: 60, distance: 1000 }],
    })
    await getRoute({ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, "driving")
    const url = spy.mock.calls[0]![0] as string
    expect(url).toContain("routed-car")
    expect(url).toContain("20,10;40,30")
  })

  it("throws when OSRM returns non-ok status", async () => {
    mockFetch({}, false)
    await expect(
      getRoute({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, "driving")
    ).rejects.toThrow(/OSRM request failed/)
  })
})
