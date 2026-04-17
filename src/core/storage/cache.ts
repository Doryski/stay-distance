import { z } from "zod"
import { coordsSchema, routeResultSchema, STORAGE_KEYS } from "./schema"
import { readKey, writeKey } from "./kv"
import type { Coords, RouteResult, TransportMode } from "../types"
import { geocodeCacheKey, routeCacheKey } from "../utils/hash"

const geocodeCacheSchema = z.record(z.string(), coordsSchema)
const routeCacheSchema = z.record(z.string(), routeResultSchema)

type GeocodeCache = z.infer<typeof geocodeCacheSchema>
type RouteCache = z.infer<typeof routeCacheSchema>

const readCache = async <T extends object>(
  key: string,
  schema: z.ZodType<T>
): Promise<T> => {
  const raw = await readKey<unknown>(key, {})
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : ({} as T)
}

export const readGeocode = async (address: string): Promise<Coords | null> => {
  const cache = await readCache(STORAGE_KEYS.geocodeCache, geocodeCacheSchema)
  return cache[geocodeCacheKey(address)] ?? null
}

export const writeGeocode = async (address: string, coords: Coords): Promise<void> => {
  const cache = await readCache(STORAGE_KEYS.geocodeCache, geocodeCacheSchema)
  cache[geocodeCacheKey(address)] = coords
  await writeKey<GeocodeCache>(STORAGE_KEYS.geocodeCache, cache)
}

export const readRoute = async (
  from: Coords,
  to: Coords,
  mode: TransportMode
): Promise<RouteResult | null> => {
  const cache = await readCache(STORAGE_KEYS.routeCache, routeCacheSchema)
  return cache[routeCacheKey(from, to, mode)] ?? null
}

export const writeRoute = async (
  from: Coords,
  to: Coords,
  mode: TransportMode,
  result: RouteResult
): Promise<void> => {
  const cache = await readCache(STORAGE_KEYS.routeCache, routeCacheSchema)
  cache[routeCacheKey(from, to, mode)] = result
  await writeKey<RouteCache>(STORAGE_KEYS.routeCache, cache)
}

export const clearCaches = async (): Promise<void> => {
  await Promise.all([
    writeKey(STORAGE_KEYS.geocodeCache, {}),
    writeKey(STORAGE_KEYS.routeCache, {}),
  ])
}
