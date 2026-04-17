import { describe, it, expect, vi, afterEach } from "vitest"
import {
  sendMessage,
  ExtensionContextInvalidatedError,
} from "../../src/core/messaging/client"
import { MESSAGE_KIND } from "../../src/core/messaging/protocol"

const mockReply = (envelope: unknown) => {
  const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
  fn.mockResolvedValueOnce(envelope)
  return fn
}

afterEach(() => {
  const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
  fn.mockReset()
})

describe("sendMessage client envelope", () => {
  it("unwraps ok envelope data", async () => {
    mockReply({ ok: true, data: { coords: { lat: 1, lon: 2 } } })
    const res = await sendMessage({
      kind: MESSAGE_KIND.geocode,
      address: "x",
    })
    expect(res.coords).toEqual({ lat: 1, lon: 2 })
  })

  it("throws with error message from envelope", async () => {
    mockReply({ ok: false, error: "boom" })
    await expect(
      sendMessage({ kind: MESSAGE_KIND.geocode, address: "x" })
    ).rejects.toThrow("boom")
  })

  it("forwards the request to chrome.runtime.sendMessage", async () => {
    const fn = mockReply({ ok: true, data: { ok: true } })
    await sendMessage({ kind: MESSAGE_KIND.clearCaches })
    expect(fn).toHaveBeenCalledWith({ kind: MESSAGE_KIND.clearCaches })
  })

  it("throws ExtensionContextInvalidatedError when runtime.id is missing", async () => {
    const originalId = chrome.runtime.id
    Object.defineProperty(chrome.runtime, "id", {
      configurable: true,
      get: () => undefined,
    })
    try {
      await expect(
        sendMessage({ kind: MESSAGE_KIND.clearCaches })
      ).rejects.toBeInstanceOf(ExtensionContextInvalidatedError)
    } finally {
      Object.defineProperty(chrome.runtime, "id", {
        configurable: true,
        writable: true,
        value: originalId,
      })
    }
  })

  it("wraps runtime 'Extension context invalidated' errors into the typed error", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockRejectedValueOnce(new Error("Extension context invalidated."))
    await expect(sendMessage({ kind: MESSAGE_KIND.clearCaches })).rejects.toBeInstanceOf(
      ExtensionContextInvalidatedError
    )
  })

  it("rethrows unrelated runtime errors unchanged", async () => {
    const fn = chrome.runtime.sendMessage as unknown as ReturnType<typeof vi.fn>
    fn.mockRejectedValueOnce(new Error("network boom"))
    await expect(sendMessage({ kind: MESSAGE_KIND.clearCaches })).rejects.toThrow(
      "network boom"
    )
  })
})
