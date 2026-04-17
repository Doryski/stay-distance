import { describe, it, expect } from "vitest"
import {
  coordsKey,
  geocodeCacheKey,
  listingKey,
  routeCacheKey,
} from "../../src/core/utils/hash"

describe("hash utils", () => {
  it("coordsKey rounds to 5 digits", () => {
    expect(coordsKey({ lat: 52.123456789, lon: 21.0 })).toBe("52.12346,21")
  })
  it("routeCacheKey includes mode", () => {
    const from = { lat: 1, lon: 2 }
    const to = { lat: 3, lon: 4 }
    expect(routeCacheKey(from, to, "driving")).toBe("driving:1,2->3,4")
    expect(routeCacheKey(from, to, "cycling")).not.toBe(
      routeCacheKey(from, to, "driving")
    )
  })
  it("geocodeCacheKey normalises case and whitespace", () => {
    expect(geocodeCacheKey("  Warszawa  ")).toBe("warszawa")
  })
  it("listingKey combines platform and id", () => {
    expect(listingKey("booking", "hotel-42")).toBe("booking:hotel-42")
  })
})
