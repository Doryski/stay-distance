import { describe, it, expect } from "vitest"
import {
  addOrigin,
  listOrigins,
  moveOrigin,
  removeOrigin,
} from "../../src/core/storage/origins"
import { addSavedListing, listSavedListings } from "../../src/core/storage/listings"
import { getSettings, updateSettings } from "../../src/core/storage/settings"
import {
  readGeocode,
  readRoute,
  writeGeocode,
  writeRoute,
} from "../../src/core/storage/cache"

describe("origins storage", () => {
  it("add / list / remove", async () => {
    await addOrigin({
      id: "a",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    })
    expect((await listOrigins()).length).toBe(1)
    await removeOrigin("a")
    expect((await listOrigins()).length).toBe(0)
  })

  it("moves origins up and down", async () => {
    const base = { address: "x", coords: { lat: 0, lon: 0 }, createdAt: 1 }
    await addOrigin({ id: "a", label: "A", ...base })
    await addOrigin({ id: "b", label: "B", ...base })
    await addOrigin({ id: "c", label: "C", ...base })

    await moveOrigin("c", "up")
    expect((await listOrigins()).map((o) => o.id)).toEqual(["a", "c", "b"])

    await moveOrigin("a", "down")
    expect((await listOrigins()).map((o) => o.id)).toEqual(["c", "a", "b"])

    await moveOrigin("c", "up")
    expect((await listOrigins()).map((o) => o.id)).toEqual(["c", "a", "b"])

    await moveOrigin("b", "down")
    expect((await listOrigins()).map((o) => o.id)).toEqual(["c", "a", "b"])

    await moveOrigin("missing", "up")
    expect((await listOrigins()).map((o) => o.id)).toEqual(["c", "a", "b"])
  })

  it("upserts by id", async () => {
    await addOrigin({
      id: "a",
      label: "Home",
      address: "x",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    await addOrigin({
      id: "a",
      label: "Home v2",
      address: "y",
      coords: { lat: 2, lon: 2 },
      createdAt: 2,
    })
    const list = await listOrigins()
    expect(list.length).toBe(1)
    expect(list[0]!.label).toBe("Home v2")
  })
})

describe("saved listings storage", () => {
  it("upserts by platform+externalId", async () => {
    await addSavedListing({
      platformId: "booking",
      externalId: "1",
      title: "A",
      url: "https://www.booking.com/hotel/a.html",
      savedAt: 1,
    })
    await addSavedListing({
      platformId: "booking",
      externalId: "1",
      title: "A (updated)",
      url: "https://www.booking.com/hotel/a.html",
      savedAt: 2,
    })
    const list = await listSavedListings()
    expect(list.length).toBe(1)
    expect(list[0]!.title).toBe("A (updated)")
  })
})

describe("settings storage", () => {
  it("merges patches", async () => {
    await updateSettings({ transportMode: "cycling" })
    const s = await getSettings()
    expect(s.transportMode).toBe("cycling")
    expect(s.showInlineBadge).toBe(true)
  })
})

describe("cache storage", () => {
  it("reads back written geocode", async () => {
    await writeGeocode("Warsaw", { lat: 52, lon: 21 })
    expect(await readGeocode("warsaw")).toEqual({ lat: 52, lon: 21 })
  })

  it("keys route cache by mode", async () => {
    const from = { lat: 1, lon: 1 }
    const to = { lat: 2, lon: 2 }
    await writeRoute(from, to, "driving", {
      durationMinutes: 30,
      distanceKm: 20,
    })
    expect(await readRoute(from, to, "driving")).toEqual({
      durationMinutes: 30,
      distanceKm: 20,
    })
    expect(await readRoute(from, to, "cycling")).toBeNull()
  })
})
