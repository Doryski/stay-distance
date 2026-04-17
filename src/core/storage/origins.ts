import { z } from "zod"
import { originSchema, STORAGE_KEYS } from "./schema"
import { readKey, writeKey } from "./kv"
import { getSettings, updateSettings } from "./settings"
import type { Origin } from "../types"

const originsArraySchema = z.array(originSchema)

export const listOrigins = async (): Promise<Origin[]> => {
  const raw = await readKey<unknown>(STORAGE_KEYS.origins, [])
  const parsed = originsArraySchema.safeParse(raw)
  return parsed.success ? parsed.data : []
}

export const saveOrigins = (origins: Origin[]): Promise<void> =>
  writeKey(STORAGE_KEYS.origins, origins)

export const addOrigin = async (origin: Origin): Promise<Origin[]> => {
  const current = await listOrigins()
  const next = [...current.filter((o) => o.id !== origin.id), origin]
  await saveOrigins(next)
  return next
}

export const moveOrigin = async (
  id: string,
  direction: "up" | "down"
): Promise<Origin[]> => {
  const current = await listOrigins()
  const index = current.findIndex((o) => o.id === id)
  if (index === -1) return current
  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= current.length) return current
  const next = [...current]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  await saveOrigins(next)
  return next
}

export const removeOrigin = async (id: string): Promise<Origin[]> => {
  const next = (await listOrigins()).filter((o) => o.id !== id)
  await saveOrigins(next)
  const settings = await getSettings()
  if (settings.activeOriginIds.includes(id)) {
    await updateSettings({
      activeOriginIds: settings.activeOriginIds.filter((x) => x !== id),
    })
  }
  return next
}
