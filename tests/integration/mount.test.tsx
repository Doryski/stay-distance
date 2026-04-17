import { describe, it, expect, beforeEach } from "vitest"
import { act } from "@testing-library/react"
import { mountInShadow, unmount } from "../../src/content/mount"

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("mountInShadow", () => {
  it("attaches a shadow root next to the anchor and renders content", async () => {
    const anchor = document.createElement("div")
    anchor.id = "anchor"
    document.body.appendChild(anchor)

    let mounted!: ReturnType<typeof mountInShadow>
    await act(async () => {
      mounted = mountInShadow(anchor, <p>hello shadow</p>, "afterend")
    })
    expect(mounted.host.classList.contains("stay-distance-root")).toBe(true)
    expect(mounted.host.shadowRoot).not.toBeNull()
    expect(anchor.nextElementSibling).toBe(mounted.host)
    expect(mounted.host.shadowRoot?.textContent).toContain("hello shadow")
  })

  it("unmount removes the host element from the DOM", () => {
    const anchor = document.createElement("div")
    document.body.appendChild(anchor)
    const mounted = mountInShadow(anchor, <span>x</span>)
    expect(document.contains(mounted.host)).toBe(true)
    unmount(mounted)
    expect(document.contains(mounted.host)).toBe(false)
  })

  it("supports beforeend positioning inside the anchor", () => {
    const anchor = document.createElement("section")
    document.body.appendChild(anchor)
    const mounted = mountInShadow(anchor, <em>x</em>, "beforeend")
    expect(anchor.lastElementChild).toBe(mounted.host)
  })
})
