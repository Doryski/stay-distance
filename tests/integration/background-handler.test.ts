import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import {
  MESSAGE_KIND,
  type Envelope,
  type Request,
} from "../../src/core/messaging/protocol"
import { updateSettings } from "../../src/core/storage/settings"
import { readGeocode, readRoute } from "../../src/core/storage/cache"

type Listener = (
  req: Request,
  sender: unknown,
  sendResponse: (envelope: Envelope<unknown>) => void
) => boolean

let messageListener: Listener

beforeAll(async () => {
  // Ensure chrome.sidePanel.setPanelBehavior returns a promise so the import-time
  // `.catch` chain in background/index doesn't explode.
  ;(
    chrome.sidePanel as unknown as { setPanelBehavior: ReturnType<typeof vi.fn> }
  ).setPanelBehavior = vi.fn().mockResolvedValue(undefined)

  const addMsg = chrome.runtime.onMessage.addListener as unknown as ReturnType<
    typeof vi.fn
  >
  addMsg.mockImplementation((fn: Listener) => {
    messageListener = fn
  })

  await import("../../src/background/index")
})

afterEach(() => vi.restoreAllMocks())

const invoke = <T>(req: Request): Promise<Envelope<T>> =>
  new Promise((resolve) => {
    const keepAlive = messageListener(
      req,
      { id: chrome.runtime.id },
      resolve as (e: Envelope<unknown>) => void
    )
    // Background handler returns true to signal async response.
    expect(keepAlive).toBe(true)
  })

const mockFetchJson = (body: unknown) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }))

describe("background message handler", () => {
  it("handles geocode requests via cache + fetch", async () => {
    const fetchSpy = mockFetchJson([{ lat: "1.5", lon: "2.5" }])
    const env = await invoke<{ coords: { lat: number; lon: number } }>({
      kind: MESSAGE_KIND.geocode,
      address: "SomeCity",
    })
    expect(env.ok).toBe(true)
    if (!env.ok) return
    expect(env.data.coords).toEqual({ lat: 1.5, lon: 2.5 })
    expect(await readGeocode("somecity")).toEqual({ lat: 1.5, lon: 2.5 })

    // Second call is cache hit, no fetch.
    const env2 = await invoke<{ coords: unknown }>({
      kind: MESSAGE_KIND.geocode,
      address: "SomeCity",
    })
    expect(env2.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("handles route requests and caches the result", async () => {
    mockFetchJson({
      code: "Ok",
      routes: [{ duration: 600, distance: 5000 }],
    })
    const from = { lat: 10, lon: 10 }
    const to = { lat: 11, lon: 11 }
    const env = await invoke<{
      result: { durationMinutes: number; distanceKm: number } | null
    }>({
      kind: MESSAGE_KIND.route,
      from,
      to,
      mode: "cycling",
    })
    expect(env.ok).toBe(true)
    if (!env.ok) return
    expect(env.data.result).toEqual({ durationMinutes: 10, distanceKm: 5 })
    expect(await readRoute(from, to, "cycling")).toEqual(env.data.result)
  })

  it("returns error envelope when geocode fails", async () => {
    mockFetchJson([])
    const env = await invoke({
      kind: MESSAGE_KIND.geocode,
      address: "does-not-exist-xyz",
    })
    expect(env.ok).toBe(false)
    if (env.ok) return
    expect(env.error).toMatch(/not found/i)
  })

  it("handles resolveListingCoords with pre-supplied coords (no fetch)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const env = await invoke<{ coords: { lat: number; lon: number } }>({
      kind: MESSAGE_KIND.resolveListingCoords,
      coords: { lat: 3, lon: 4 },
    })
    expect(env.ok).toBe(true)
    if (!env.ok) return
    expect(env.data.coords).toEqual({ lat: 3, lon: 4 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("handles clearCaches by wiping geocode+route caches", async () => {
    mockFetchJson([{ lat: "1", lon: "2" }])
    await invoke({ kind: MESSAGE_KIND.geocode, address: "ToWipe" })
    expect(await readGeocode("towipe")).not.toBeNull()

    const env = await invoke<{ ok: true }>({ kind: MESSAGE_KIND.clearCaches })
    expect(env.ok).toBe(true)
    expect(await readGeocode("towipe")).toBeNull()
  })

  it("honours offlineMode for route requests", async () => {
    await updateSettings({ offlineMode: true })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const env = await invoke<{ result: unknown }>({
      kind: MESSAGE_KIND.route,
      from: { lat: 0, lon: 0 },
      to: { lat: 1, lon: 1 },
      mode: "driving",
    })
    expect(env.ok).toBe(true)
    if (!env.ok) return
    expect(env.data.result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects messages from senders outside this extension", () => {
    const sendResponse = vi.fn()
    const keepAlive = messageListener(
      { kind: MESSAGE_KIND.geocode, address: "attacker-chosen" },
      { id: "some-other-extension-id", origin: "https://evil.example" },
      sendResponse
    )
    expect(keepAlive).toBe(false)
    expect(sendResponse).not.toHaveBeenCalled()
  })
})
