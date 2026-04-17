import type { Coords } from "../types"
import { createRateLimiter } from "./rate-limiter"

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const USER_AGENT = "stay-distance/0.0.1 (+https://github.com/stay-distance/stay-distance)"

// Nominatim fair-use: max 1 req/s per app.
const limit = createRateLimiter(1100)

export type GeocodeFn = (address: string) => Promise<Coords>

export const geocode: GeocodeFn = (address) =>
  limit(async () => {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
    if (!res.ok) throw new Error(`Geocoding failed for "${address}": ${res.status}`)

    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    const first = data[0]
    if (!first) throw new Error(`Address not found: "${address}"`)

    return { lat: parseFloat(first.lat), lon: parseFloat(first.lon) }
  })
