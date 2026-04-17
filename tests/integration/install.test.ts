import { describe, it, expect } from "vitest"
import { runInstallMigrations } from "../../src/background/install"
import { readKey } from "../../src/core/storage/kv"
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  STORAGE_VERSION,
} from "../../src/core/storage/schema"

describe("install migrations", () => {
  it("writes default settings and version on fresh install", async () => {
    await runInstallMigrations()
    expect(await readKey(STORAGE_KEYS.version, 0)).toBe(STORAGE_VERSION)
    expect(await readKey(STORAGE_KEYS.settings, null)).toEqual(DEFAULT_SETTINGS)
  })

  it("is idempotent when version already matches", async () => {
    await runInstallMigrations()
    const customSettings = { ...DEFAULT_SETTINGS, transportMode: "cycling" as const }
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: customSettings })

    await runInstallMigrations()
    expect(await readKey(STORAGE_KEYS.settings, null)).toEqual(customSettings)
  })

  it("preserves existing settings on first-time migration", async () => {
    const existing = { ...DEFAULT_SETTINGS, showInlineBadge: false }
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: existing })

    await runInstallMigrations()
    expect(await readKey(STORAGE_KEYS.settings, null)).toEqual(existing)
    expect(await readKey(STORAGE_KEYS.version, 0)).toBe(STORAGE_VERSION)
  })
})
