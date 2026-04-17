import type { Coords, RouteResult, TransportMode } from "../types"

export const MESSAGE_KIND = {
  geocode: "sd/geocode",
  route: "sd/route",
  resolveListingCoords: "sd/resolve-listing-coords",
  clearCaches: "sd/clear-caches",
} as const

export type MessageKind = (typeof MESSAGE_KIND)[keyof typeof MESSAGE_KIND]

export type GeocodeRequest = {
  kind: typeof MESSAGE_KIND.geocode
  address: string
}
export type GeocodeResponse = { coords: Coords }

export type RouteRequest = {
  kind: typeof MESSAGE_KIND.route
  from: Coords
  to: Coords
  mode: TransportMode
}
export type RouteResponse = { result: RouteResult | null }

export type ResolveListingCoordsRequest = {
  kind: typeof MESSAGE_KIND.resolveListingCoords
  coords?: Coords
  address?: string
}
export type ResolveListingCoordsResponse = { coords: Coords }

export type ClearCachesRequest = { kind: typeof MESSAGE_KIND.clearCaches }
export type ClearCachesResponse = { ok: true }

export type Request =
  | GeocodeRequest
  | RouteRequest
  | ResolveListingCoordsRequest
  | ClearCachesRequest

export type ResponseFor<R extends Request> = R extends GeocodeRequest
  ? GeocodeResponse
  : R extends RouteRequest
    ? RouteResponse
    : R extends ResolveListingCoordsRequest
      ? ResolveListingCoordsResponse
      : R extends ClearCachesRequest
        ? ClearCachesResponse
        : never

export type Envelope<T> = { ok: true; data: T } | { ok: false; error: string }
