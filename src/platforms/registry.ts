import type { PlatformAdapter } from "./adapter"
import { bookingAdapter } from "./booking/adapter"

const ADAPTERS: PlatformAdapter[] = [bookingAdapter]

export const resolveAdapter = (url: URL): PlatformAdapter | null =>
  ADAPTERS.find((a) => a.matchUrl(url)) ?? null

export const listAdapters = (): readonly PlatformAdapter[] => ADAPTERS
