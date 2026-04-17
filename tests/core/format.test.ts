import { describe, it, expect } from "vitest"
import { formatDuration, formatDistance } from "../../src/core/utils/format"

describe("formatDuration", () => {
  it("formats sub-hour as minutes", () => {
    expect(formatDuration(45)).toBe("45min")
  })
  it("formats 1+ hour as h + min", () => {
    expect(formatDuration(75)).toBe("1h 15min")
    expect(formatDuration(120)).toBe("2h 0min")
  })
})

describe("formatDistance", () => {
  it("shows one decimal under 10 km", () => {
    expect(formatDistance(3.4)).toBe("3.4 km")
  })
  it("rounds above 10 km", () => {
    expect(formatDistance(42.7)).toBe("43 km")
  })
})
