import type { Coords, TransportMode } from "../types"

const round = (n: number, digits = 5) => Number(n.toFixed(digits))

export const coordsKey = (c: Coords): string => `${round(c.lat)},${round(c.lon)}`

export const routeCacheKey = (from: Coords, to: Coords, mode: TransportMode): string =>
  `${mode}:${coordsKey(from)}->${coordsKey(to)}`

export const geocodeCacheKey = (address: string): string => address.trim().toLowerCase()

export const listingKey = (platformId: string, externalId: string): string =>
  `${platformId}:${externalId}`
