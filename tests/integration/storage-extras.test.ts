import { describe, it, expect, vi } from "vitest"
import {
  addSavedListing,
  listSavedListings,
  removeSavedListing,
  saveListings,
  saveOrigins,
} from "../../src/core/storage"
import { readKey, writeKey, removeKey } from "../../src/core/storage/kv"
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "../../src/core/storage/schema"
import { getSettings } from "../../src/core/storage/settings"
import { listOrigins } from "../../src/core/storage/origins"

describe("saved listings: remove", () => {
  it("removes by platform + externalId", async () => {
    await addSavedListing({
      platformId: "booking",
      externalId: "a",
      title: "A",
      url: "https://www.booking.com/hotel/a.html",
      savedAt: 1,
    })
    await addSavedListing({
      platformId: "booking",
      externalId: "b",
      title: "B",
      url: "https://www.booking.com/hotel/b.html",
      savedAt: 2,
    })
    const afterRemove = await removeSavedListing("booking", "a")
    expect(afterRemove.map((l) => l.externalId)).toEqual(["b"])
    expect((await listSavedListings()).length).toBe(1)
  })

  it("returns current list unchanged when id missing", async () => {
    const result = await removeSavedListing("booking", "does-not-exist")
    expect(result).toEqual([])
  })
})

describe("storage fallbacks on corrupt data", () => {
  it("listOrigins returns [] when blob is not an array of origins", async () => {
    await writeKey(STORAGE_KEYS.origins, { not: "valid" })
    expect(await listOrigins()).toEqual([])
  })

  it("listSavedListings returns [] when blob is corrupt", async () => {
    await writeKey(STORAGE_KEYS.savedListings, "garbage")
    expect(await listSavedListings()).toEqual([])
  })

  it("getSettings returns defaults when blob fails schema", async () => {
    await writeKey(STORAGE_KEYS.settings, { transportMode: "teleport" })
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })
})

describe("kv bulk writers", () => {
  it("saveOrigins / saveListings round-trip", async () => {
    await saveOrigins([
      {
        id: "x",
        label: "X",
        address: "x",
        coords: { lat: 0, lon: 0 },
        createdAt: 1,
      },
    ])
    expect((await listOrigins()).length).toBe(1)

    await saveListings([])
    expect(await listSavedListings()).toEqual([])

    expect(await readKey(STORAGE_KEYS.origins, [])).toHaveLength(1)
  })

  it("removeKey deletes the stored value", async () => {
    await writeKey(STORAGE_KEYS.origins, [{ marker: 1 }])
    await removeKey(STORAGE_KEYS.origins)
    expect(await readKey(STORAGE_KEYS.origins, [])).toEqual([])
  })
})

describe("kv: invalidated extension context", () => {
  const withInvalidContext = async (fn: () => Promise<void>) => {
    const originalId = chrome.runtime.id
    Object.defineProperty(chrome.runtime, "id", {
      configurable: true,
      get: () => undefined,
    })
    try {
      await fn()
    } finally {
      Object.defineProperty(chrome.runtime, "id", {
        configurable: true,
        writable: true,
        value: originalId,
      })
    }
  }

  it("readKey returns fallback when runtime.id is missing", async () => {
    await withInvalidContext(async () => {
      expect(await readKey("anything", "fallback-value")).toBe("fallback-value")
    })
  })

  it("writeKey and removeKey silently no-op when runtime.id is missing", async () => {
    await withInvalidContext(async () => {
      await expect(writeKey("k", 1)).resolves.toBeUndefined()
      await expect(removeKey("k")).resolves.toBeUndefined()
    })
  })

  it("readKey returns fallback when storage.get throws 'Extension context invalidated'", async () => {
    const getSpy = vi
      .spyOn(chrome.storage.local, "get")
      .mockRejectedValueOnce(new Error("Extension context invalidated."))
    expect(await readKey("k", "fb")).toBe("fb")
    getSpy.mockRestore()
  })

  it("writeKey no-ops when storage.set throws 'Extension context invalidated'", async () => {
    const setSpy = vi
      .spyOn(chrome.storage.local, "set")
      .mockRejectedValueOnce(new Error("Extension context invalidated."))
    await expect(writeKey("k", 1)).resolves.toBeUndefined()
    setSpy.mockRestore()
  })

  it("removeKey no-ops when storage.remove throws 'Extension context invalidated'", async () => {
    const rmSpy = vi
      .spyOn(chrome.storage.local, "remove")
      .mockRejectedValueOnce(new Error("Extension context invalidated."))
    await expect(removeKey("k")).resolves.toBeUndefined()
    rmSpy.mockRestore()
  })

  it("readKey rethrows unrelated storage errors", async () => {
    const getSpy = vi
      .spyOn(chrome.storage.local, "get")
      .mockRejectedValueOnce(new Error("disk full"))
    await expect(readKey("k", "fb")).rejects.toThrow("disk full")
    getSpy.mockRestore()
  })

  it("writeKey rethrows unrelated storage errors", async () => {
    const setSpy = vi
      .spyOn(chrome.storage.local, "set")
      .mockRejectedValueOnce(new Error("quota exceeded"))
    await expect(writeKey("k", 1)).rejects.toThrow("quota exceeded")
    setSpy.mockRestore()
  })

  it("removeKey rethrows unrelated storage errors", async () => {
    const rmSpy = vi
      .spyOn(chrome.storage.local, "remove")
      .mockRejectedValueOnce(new Error("no perms"))
    await expect(removeKey("k")).rejects.toThrow("no perms")
    rmSpy.mockRestore()
  })
})
