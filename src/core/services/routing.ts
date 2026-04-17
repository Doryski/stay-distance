import type { Coords, RouteResult, TransportMode } from "../types"

// The public router.project-osrm.org demo only loads the car profile and
// returns driving results regardless of the URL slug. OSM.de hosts separate
// instances per profile, so route them there to get real cycling/walking data.
const OSRM_BASE_BY_MODE: Record<TransportMode, string> = {
  driving: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  cycling: "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
  walking: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
}

// OSRM uses lon,lat order.
const coordPair = ({ lat, lon }: Coords) => `${lon},${lat}`

export type GetRouteFn = (
  from: Coords,
  to: Coords,
  mode: TransportMode
) => Promise<RouteResult | null>

export const getRoute: GetRouteFn = async (from, to, mode) => {
  const url = `${OSRM_BASE_BY_MODE[mode]}/${coordPair(from)};${coordPair(to)}?overview=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM request failed: ${res.status}`)

  const data = (await res.json()) as {
    code: string
    routes?: Array<{ duration: number; distance: number }>
  }

  const route = data.routes?.[0]
  if (data.code !== "Ok" || !route) return null

  return {
    durationMinutes: Math.round(route.duration / 60),
    distanceKm: Math.round(route.distance / 1000),
  }
}
