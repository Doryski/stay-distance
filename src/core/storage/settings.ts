import { DEFAULT_SETTINGS, settingsSchema, STORAGE_KEYS, type Settings } from "./schema"
import { readKey, writeKey } from "./kv"

export const getSettings = async (): Promise<Settings> => {
  const raw = await readKey<unknown>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export const updateSettings = async (patch: Partial<Settings>): Promise<Settings> => {
  const next = { ...(await getSettings()), ...patch }
  await writeKey(STORAGE_KEYS.settings, next)
  return next
}
