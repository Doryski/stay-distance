import { geocode, getRoute } from "../core/services"
import type { Coords, RouteResult, TransportMode } from "../core/types"
import { readGeocode, readRoute, writeGeocode, writeRoute } from "../core/storage/cache"
import { getSettings } from "../core/storage/settings"

export const resolveGeocode = async (address: string): Promise<Coords> => {
  const cached = await readGeocode(address)
  if (cached) return cached

  const { offlineMode } = await getSettings()
  if (offlineMode) throw new Error("Offline mode — geocoding disabled")

  const coords = await geocode(address)
  await writeGeocode(address, coords)
  return coords
}

export const resolveRoute = async (
  from: Coords,
  to: Coords,
  mode: TransportMode
): Promise<RouteResult | null> => {
  const cached = await readRoute(from, to, mode)
  if (cached) return cached

  const { offlineMode } = await getSettings()
  if (offlineMode) return null

  const result = await getRoute(from, to, mode)
  if (result) await writeRoute(from, to, mode, result)
  return result
}

export const resolveListingCoords = async (input: {
  coords?: Coords
  address?: string
}): Promise<Coords> => {
  if (input.coords) return input.coords
  if (input.address) return resolveGeocode(input.address)
  throw new Error("Listing has neither coords nor address")
}
