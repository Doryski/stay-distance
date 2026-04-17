import { describe, it, expect, vi, afterEach } from "vitest"
import { geocode } from "../../src/core/services/geocode"
import { getRoute } from "../../src/core/services/routing"

afterEach(() => vi.restoreAllMocks())

describe("service error paths", () => {
  it("geocode throws on non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 502 }))
    await expect(geocode("anywhere")).rejects.toThrow(/502/)
  })

  it("getRoute throws on non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }))
    await expect(
      getRoute({ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, "driving")
    ).rejects.toThrow(/500/)
  })
})
