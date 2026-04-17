import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { observeDom } from "../../src/content/observer"

beforeEach(() => {
  document.body.innerHTML = ""
  vi.useFakeTimers()
})

afterEach(() => vi.useRealTimers())

describe("observeDom", () => {
  it("debounces DOM mutations into a single callback", async () => {
    const onMutations = vi.fn()
    const stop = observeDom({ onMutations, debounceMs: 100 })

    document.body.appendChild(document.createElement("div"))
    document.body.appendChild(document.createElement("span"))
    // MutationObserver delivers asynchronously; flush microtasks.
    await Promise.resolve()
    await Promise.resolve()

    expect(onMutations).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(150)
    expect(onMutations).toHaveBeenCalledTimes(1)

    stop()
  })

  it("fires on history.pushState (SPA navigation)", async () => {
    const onMutations = vi.fn()
    const stop = observeDom({ onMutations, debounceMs: 50 })

    history.pushState({}, "", "/search")
    await vi.advanceTimersByTimeAsync(100)
    expect(onMutations).toHaveBeenCalledTimes(1)

    stop()
  })

  it("fires on popstate", async () => {
    const onMutations = vi.fn()
    const stop = observeDom({ onMutations, debounceMs: 50 })

    window.dispatchEvent(new PopStateEvent("popstate"))
    await vi.advanceTimersByTimeAsync(100)
    expect(onMutations).toHaveBeenCalledTimes(1)

    stop()
  })

  it("stops firing and restores history methods after cleanup", async () => {
    const onMutations = vi.fn()
    const origPush = history.pushState
    const stop = observeDom({ onMutations, debounceMs: 50 })
    expect(history.pushState).not.toBe(origPush)

    stop()
    expect(history.pushState).toBe(origPush)

    document.body.appendChild(document.createElement("div"))
    await vi.advanceTimersByTimeAsync(100)
    expect(onMutations).not.toHaveBeenCalled()
  })
})
