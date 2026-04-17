import { describe, it, expect, beforeEach, vi } from "vitest"

beforeEach(() => {
  document.body.innerHTML = ""
  vi.resetModules()
})

describe("popup/main.tsx bootstrap", () => {
  it("throws when #root is missing", async () => {
    await expect(import("../../src/popup/main")).rejects.toThrow(/#root/)
  })

  it("mounts React into #root when present", async () => {
    const root = document.createElement("div")
    root.id = "root"
    document.body.appendChild(root)
    await import("../../src/popup/main")
    // React renders are async — give it a beat.
    await new Promise((r) => setTimeout(r, 0))
    expect(document.body.textContent).toMatch(/stay[- ]distance/i)
  })
})

describe("sidepanel/main.tsx bootstrap", () => {
  it("throws when #root is missing", async () => {
    await expect(import("../../src/sidepanel/main")).rejects.toThrow(/#root/)
  })

  it("mounts React into #root when present", async () => {
    const root = document.createElement("div")
    root.id = "root"
    document.body.appendChild(root)
    await import("../../src/sidepanel/main")
    await new Promise((r) => setTimeout(r, 50))
    expect(document.body.textContent).toMatch(/stay[- ]distance/i)
  })
})
