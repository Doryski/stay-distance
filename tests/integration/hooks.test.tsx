import { describe, it, expect, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useStorageKey } from "../../src/core/hooks/useStorage"
import {
  useSelectedOrigins,
  useOrigins,
  useSettings,
} from "../../src/core/hooks/useActiveOrigin"
import { useRoute, useListingCoords } from "../../src/core/hooks/useRoute"
import { writeKey } from "../../src/core/storage/kv"
import { addOrigin } from "../../src/core/storage/origins"
import { updateSettings } from "../../src/core/storage/settings"
import { MESSAGE_KIND } from "../../src/core/messaging/protocol"

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = "TestQueryWrapper"
  return Wrapper
}

describe("useStorageKey", () => {
  it("returns fallback then hydrates from storage", async () => {
    await writeKey("sd:test", "stored-value")
    const { result } = renderHook(() => useStorageKey<string>("sd:test", "fallback"))
    expect(result.current[0]).toBe("fallback")
    await waitFor(() => expect(result.current[0]).toBe("stored-value"))
  })

  it("reacts to chrome.storage.onChanged", async () => {
    const { result } = renderHook(() => useStorageKey<string>("sd:reactive", "x"))
    await waitFor(() => expect(result.current[0]).toBe("x"))
    await act(async () => {
      await writeKey("sd:reactive", "updated")
    })
    await waitFor(() => expect(result.current[0]).toBe("updated"))
  })

  it("writes via the setter", async () => {
    const { result } = renderHook(() => useStorageKey<number>("sd:w", 0))
    await waitFor(() => expect(result.current[0]).toBe(0))
    await act(async () => {
      await result.current[1](42)
      await new Promise((r) => setTimeout(r, 0))
    })
    await waitFor(() => expect(result.current[0]).toBe(42))
  })

  it("falls back when storage value is removed", async () => {
    await writeKey("sd:removable", "present")
    const { result } = renderHook(() => useStorageKey<string>("sd:removable", "DEFAULT"))
    await waitFor(() => expect(result.current[0]).toBe("present"))
    await act(async () => {
      await chrome.storage.local.remove("sd:removable")
    })
    await waitFor(() => expect(result.current[0]).toBe("DEFAULT"))
  })
})

describe("useSelectedOrigins / useSettings / useOrigins", () => {
  it("settings hook reads DEFAULT_SETTINGS initially and hydrates", async () => {
    await updateSettings({ transportMode: "walking" })
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current[0].transportMode).toBe("walking"))
  })

  it("resolves selected ids against the origins list", async () => {
    await addOrigin({
      id: "home",
      label: "Home",
      address: "Warszawa",
      coords: { lat: 52, lon: 21 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["home"] })

    const { result } = renderHook(() => {
      const sel = useSelectedOrigins()
      const [origins] = useOrigins()
      return { sel, origins }
    })

    await waitFor(() => expect(result.current.origins.length).toBe(1))
    await waitFor(() => expect(result.current.sel.origins[0]?.id).toBe("home"))
  })

  it("setSelected persists the array", async () => {
    await addOrigin({
      id: "work",
      label: "Work",
      address: "office",
      coords: { lat: 50, lon: 20 },
      createdAt: 1,
    })

    const { result } = renderHook(() => useSelectedOrigins())
    await act(async () => {
      await result.current.setSelected(["work"])
    })
    await waitFor(() => expect(result.current.origins[0]?.id).toBe("work"))
  })

  it("toggle adds and removes ids without mutating order", async () => {
    await addOrigin({
      id: "a",
      label: "A",
      address: "x",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    await addOrigin({
      id: "b",
      label: "B",
      address: "y",
      coords: { lat: 2, lon: 2 },
      createdAt: 2,
    })

    const { result } = renderHook(() => useSelectedOrigins())
    await waitFor(() => expect(result.current.selectedIds).toEqual([]))
    await act(async () => {
      await result.current.toggle("a")
    })
    await waitFor(() => expect(result.current.selectedIds).toEqual(["a"]))
    await act(async () => {
      await result.current.toggle("b")
    })
    await waitFor(() => expect(result.current.selectedIds).toEqual(["a", "b"]))
    await act(async () => {
      await result.current.toggle("a")
    })
    await waitFor(() => expect(result.current.selectedIds).toEqual(["b"]))
  })

  it("setSelected([]) clears the selection", async () => {
    await addOrigin({
      id: "w",
      label: "W",
      address: "a",
      coords: { lat: 1, lon: 1 },
      createdAt: 1,
    })
    await updateSettings({ activeOriginIds: ["w"] })

    const { result } = renderHook(() => useSelectedOrigins())
    await waitFor(() => expect(result.current.origins[0]?.id).toBe("w"))
    await act(async () => {
      await result.current.setSelected([])
      await new Promise((r) => setTimeout(r, 0))
    })
    await waitFor(() => expect(result.current.origins).toEqual([]))
  })
})

describe("useRoute", () => {
  it("is disabled until both from and to are provided", () => {
    const { result } = renderHook(() => useRoute(null, null, "driving"), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it("sends a route message and returns the result", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({
      ok: true,
      data: { result: { durationMinutes: 15, distanceKm: 10 } },
    })

    const { result } = renderHook(
      () => useRoute({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, "driving"),
      { wrapper: makeWrapper() }
    )
    await waitFor(() =>
      expect(result.current.data).toEqual({ durationMinutes: 15, distanceKm: 10 })
    )
    fn.mockReset()
  })
})

describe("useListingCoords", () => {
  it("stays disabled when no coords and no address", () => {
    const { result } = renderHook(() => useListingCoords(undefined, undefined), {
      wrapper: makeWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
  })

  it("sends resolveListingCoords request with coords", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValue({
      ok: true,
      data: { coords: { lat: 9, lon: 8 } },
    })

    const { result } = renderHook(() => useListingCoords({ lat: 9, lon: 8 }, undefined), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.data).toEqual({ lat: 9, lon: 8 }))
    expect(fn.mock.calls[0]![0]).toMatchObject({
      kind: MESSAGE_KIND.resolveListingCoords,
      coords: { lat: 9, lon: 8 },
    })
    fn.mockReset()
  })
})
