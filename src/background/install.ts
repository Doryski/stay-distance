import { DEFAULT_SETTINGS, STORAGE_KEYS, STORAGE_VERSION } from "../core/storage/schema"
import { readKey, writeKey } from "../core/storage/kv"

export const runInstallMigrations = async (): Promise<void> => {
  const currentVersion = await readKey<number>(STORAGE_KEYS.version, 0)
  if (currentVersion === STORAGE_VERSION) return

  if (currentVersion === 0) {
    const existing = await readKey(STORAGE_KEYS.settings, null)
    if (!existing) await writeKey(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  }

  // Future migrations: switch on currentVersion → STORAGE_VERSION.
  await writeKey(STORAGE_KEYS.version, STORAGE_VERSION)
}
