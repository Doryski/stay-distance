import { describe, it, expect } from "vitest"
import { sortKeyEquals, sortListingIndices } from "../../src/core/utils/matrixSort"
import type { Origin, RouteResult, SavedListing } from "../../src/core/types"
import type { MatrixSort } from "../../src/core/storage/schema"

const listing = (title: string, i: number): SavedListing => ({
  platformId: "booking",
  externalId: `e${i}`,
  title,
  url: `https://www.booking.com/hotel/e${i}.html`,
  savedAt: i,
})

const origin = (id: string): Origin => ({
  id,
  label: id,
  address: id,
  coords: { lat: 0, lon: 0 },
  createdAt: 0,
})

const route = (durationMinutes: number, distanceKm: number): RouteResult => ({
  durationMinutes,
  distanceKm,
})

describe("sortKeyEquals", () => {
  it("returns false for different kinds", () => {
    expect(sortKeyEquals({ kind: "title" }, { kind: "total" })).toBe(false)
  })
  it("returns true for matching title keys", () => {
    expect(sortKeyEquals({ kind: "title" }, { kind: "title" })).toBe(true)
  })
  it("returns true for matching total keys", () => {
    expect(sortKeyEquals({ kind: "total" }, { kind: "total" })).toBe(true)
  })
  it("matches origin keys by id", () => {
    expect(sortKeyEquals({ kind: "origin", id: "a" }, { kind: "origin", id: "a" })).toBe(
      true
    )
    expect(sortKeyEquals({ kind: "origin", id: "a" }, { kind: "origin", id: "b" })).toBe(
      false
    )
  })
})

describe("sortListingIndices", () => {
  const listings = [listing("Cabin", 0), listing("alpine", 1), listing("Beach", 2)]
  const origins = [origin("o1"), origin("o2")]

  it("sorts by title ascending (case-insensitive)", () => {
    const sort: MatrixSort = { key: { kind: "title" }, dir: "asc" }
    const res = sortListingIndices(listings, origins, sort, "duration", () => null)
    expect(res.map((i) => listings[i]!.title)).toEqual(["alpine", "Beach", "Cabin"])
  })

  it("sorts by title descending", () => {
    const sort: MatrixSort = { key: { kind: "title" }, dir: "desc" }
    const res = sortListingIndices(listings, origins, sort, "duration", () => null)
    expect(res.map((i) => listings[i]!.title)).toEqual(["Cabin", "Beach", "alpine"])
  })

  it("sorts by origin duration ascending, pushing null routes to the end", () => {
    const routes: Record<string, RouteResult | null> = {
      "0:o1": route(30, 10),
      "1:o1": route(10, 20),
      "2:o1": null,
    }
    const sort: MatrixSort = { key: { kind: "origin", id: "o1" }, dir: "asc" }
    const res = sortListingIndices(
      listings,
      origins,
      sort,
      "duration",
      (i, id) => routes[`${i}:${id}`] ?? null
    )
    expect(res).toEqual([1, 0, 2])
  })

  it("sorts by total metric over all origins (null if any origin missing)", () => {
    const routes: Record<string, RouteResult | null> = {
      "0:o1": route(10, 5),
      "0:o2": route(20, 5),
      "1:o1": route(5, 5),
      "1:o2": route(5, 5),
      "2:o1": route(40, 5),
      "2:o2": null,
    }
    const sort: MatrixSort = { key: { kind: "total" }, dir: "asc" }
    const res = sortListingIndices(
      listings,
      origins,
      sort,
      "duration",
      (i, id) => routes[`${i}:${id}`] ?? null
    )
    expect(res[0]).toBe(1)
    expect(res[1]).toBe(0)
    expect(res[2]).toBe(2)
  })

  it("returns null total when there are no origins", () => {
    const sort: MatrixSort = { key: { kind: "total" }, dir: "asc" }
    const res = sortListingIndices(listings, [], sort, "duration", () => null)
    expect(res).toHaveLength(3)
  })

  it("sorts by distance metric", () => {
    const routes: Record<string, RouteResult | null> = {
      "0:o1": route(100, 8),
      "1:o1": route(5, 50),
      "2:o1": route(10, 2),
    }
    const sort: MatrixSort = { key: { kind: "origin", id: "o1" }, dir: "asc" }
    const res = sortListingIndices(
      listings,
      origins,
      sort,
      "distance",
      (i, id) => routes[`${i}:${id}`] ?? null
    )
    expect(res).toEqual([2, 0, 1])
  })
})
