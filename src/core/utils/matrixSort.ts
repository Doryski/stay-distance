import type { MatrixDisplayMetric, MatrixSort, MatrixSortKey } from "../storage/schema"
import type { Origin, RouteResult, SavedListing } from "../types"

export type MatrixRouteLookup = (
  listingIndex: number,
  originId: string
) => RouteResult | null

export const sortKeyEquals = (a: MatrixSortKey, b: MatrixSortKey): boolean => {
  if (a.kind !== b.kind) return false
  if (a.kind === "origin" && b.kind === "origin") return a.id === b.id
  return true
}

const metricValue = (route: RouteResult, metric: MatrixDisplayMetric): number =>
  metric === "duration" ? route.durationMinutes : route.distanceKm

const totalFor = (
  listingIndex: number,
  origins: Origin[],
  metric: MatrixDisplayMetric,
  getRoute: MatrixRouteLookup
): number | null => {
  if (origins.length === 0) return null
  let sum = 0
  for (const o of origins) {
    const route = getRoute(listingIndex, o.id)
    if (!route) return null
    sum += metricValue(route, metric)
  }
  return sum
}

const sortValue = (
  listingIndex: number,
  listings: SavedListing[],
  origins: Origin[],
  sort: MatrixSort,
  metric: MatrixDisplayMetric,
  getRoute: MatrixRouteLookup
): number | string | null => {
  const key = sort.key
  if (key.kind === "title") return listings[listingIndex]!.title.toLowerCase()
  if (key.kind === "total") return totalFor(listingIndex, origins, metric, getRoute)
  const route = getRoute(listingIndex, key.id)
  if (!route) return null
  return metricValue(route, metric)
}

export const sortListingIndices = (
  listings: SavedListing[],
  origins: Origin[],
  sort: MatrixSort,
  metric: MatrixDisplayMetric,
  getRoute: MatrixRouteLookup
): number[] => {
  const indices = listings.map((_, i) => i)
  indices.sort((a, b) => {
    const va = sortValue(a, listings, origins, sort, metric, getRoute)
    const vb = sortValue(b, listings, origins, sort, metric, getRoute)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb))
    return sort.dir === "asc" ? cmp : -cmp
  })
  return indices
}
