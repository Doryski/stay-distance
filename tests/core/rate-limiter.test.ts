import { describe, it, expect, vi, afterEach } from "vitest"
import { createRateLimiter } from "../../src/core/services/rate-limiter"

afterEach(() => vi.useRealTimers())

describe("createRateLimiter", () => {
  it("spaces calls by minIntervalMs", async () => {
    vi.useFakeTimers()
    const limit = createRateLimiter(1000)
    const calls: number[] = []

    const task = () => {
      calls.push(Date.now())
      return Promise.resolve()
    }

    const p1 = limit(task)
    const p2 = limit(task)
    const p3 = limit(task)

    await vi.runAllTimersAsync()
    await Promise.all([p1, p2, p3])

    expect(calls.length).toBe(3)
    expect(calls[1]! - calls[0]!).toBeGreaterThanOrEqual(1000)
    expect(calls[2]! - calls[1]!).toBeGreaterThanOrEqual(1000)
  })
})
