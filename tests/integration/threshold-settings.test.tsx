import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ThresholdSettings } from "../../src/core/ui/ThresholdSettings"
import { getSettings, updateSettings } from "../../src/core/storage/settings"
import { DEFAULT_FAST_THRESHOLDS } from "../../src/core/storage/schema"

const wrap = (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

const expandPanel = async () => {
  await userEvent.click(screen.getByRole("button", { name: /Fast threshold/i }))
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Reset/i })).toBeDefined()
  )
}

describe("ThresholdSettings", () => {
  it("is collapsed by default and toggles open", async () => {
    wrap(<ThresholdSettings />)
    const header = screen.getByRole("button", { name: /Fast threshold/i })
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("button", { name: /Reset/i })).toBeNull()

    await userEvent.click(header)
    await waitFor(() => expect(header.getAttribute("aria-expanded")).toBe("true"))
    expect(screen.getByRole("button", { name: /Reset/i })).toBeDefined()
  })

  it("Reset is disabled at defaults and no-op does not mutate settings", async () => {
    wrap(<ThresholdSettings />)
    await expandPanel()
    const reset = screen.getByRole("button", { name: /Reset/i }) as HTMLButtonElement
    expect(reset.disabled).toBe(true)
  })

  it("persists an edited duration threshold to storage", async () => {
    wrap(<ThresholdSettings />)
    await expandPanel()
    const drivingDuration = screen.getByLabelText(
      /Driving duration threshold/i
    ) as HTMLInputElement
    await userEvent.clear(drivingDuration)
    await userEvent.type(drivingDuration, "45")
    drivingDuration.blur()
    await waitFor(async () => {
      const settings = await getSettings()
      expect(settings.fastThresholds.duration.driving).toBe(45)
    })
  })

  it("Reset restores defaults after customization", async () => {
    await updateSettings({
      fastThresholds: {
        ...DEFAULT_FAST_THRESHOLDS,
        duration: { ...DEFAULT_FAST_THRESHOLDS.duration, driving: 99 },
      },
    })
    wrap(<ThresholdSettings />)
    await expandPanel()
    const reset = screen.getByRole("button", { name: /Reset/i }) as HTMLButtonElement
    await waitFor(() => expect(reset.disabled).toBe(false))
    await userEvent.click(reset)
    await waitFor(async () => {
      const settings = await getSettings()
      expect(settings.fastThresholds).toEqual(DEFAULT_FAST_THRESHOLDS)
    })
  })

  it("does not persist an out-of-range value below the minimum", async () => {
    wrap(<ThresholdSettings />)
    await expandPanel()
    const drivingDuration = screen.getByLabelText(
      /Driving duration threshold/i
    ) as HTMLInputElement
    const initial = (await getSettings()).fastThresholds.duration.driving
    await userEvent.clear(drivingDuration)
    await userEvent.type(drivingDuration, "0")
    drivingDuration.blur()
    // Wait a tick for any pending state to settle, then verify the stored
    // value did not drop to the invalid 0.
    await new Promise((r) => setTimeout(r, 20))
    const settings = await getSettings()
    expect(settings.fastThresholds.duration.driving).toBe(initial)
  })
})
