import { useStorageKey } from "./useStorage"
import {
  DEFAULT_SETTINGS,
  settingsSchema,
  STORAGE_KEYS,
  type Settings,
} from "../storage/schema"
import { updateSettings } from "../storage/settings"
import type { Origin } from "../types"
import { useMemo } from "react"

// Parse through the schema so legacy/partial stored settings (e.g. missing
// `fastThresholds`) fall back to defaults instead of throwing at read sites.
const parseSettings = (raw: unknown): Settings => {
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export const useSettings = () =>
  useStorageKey<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS, parseSettings)

export const useOrigins = () => useStorageKey<Origin[]>(STORAGE_KEYS.origins, [])

export type UseSelectedOrigins = {
  origins: Origin[]
  selectedIds: string[]
  setSelected: (ids: string[]) => Promise<void>
  toggle: (id: string) => Promise<void>
}

export const useSelectedOrigins = (): UseSelectedOrigins => {
  const [settings] = useSettings()
  const [allOrigins] = useOrigins()
  const selectedIds = settings.activeOriginIds
  const origins = useMemo(
    () => allOrigins.filter((o) => selectedIds.includes(o.id)),
    [allOrigins, selectedIds]
  )
  const setSelected = (ids: string[]) =>
    updateSettings({ activeOriginIds: ids }).then(() => undefined)
  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    return setSelected(next)
  }
  return { origins, selectedIds, setSelected, toggle }
}
