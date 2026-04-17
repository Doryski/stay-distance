export type Coords = { lat: number; lon: number }

export const TRANSPORT_MODES = ["driving", "cycling", "walking"] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

export type RouteResult = {
  durationMinutes: number
  distanceKm: number
}

export type Origin = {
  id: string
  label: string
  address: string
  coords: Coords
  color?: string
  createdAt: number
}

export type ExtractedListing = {
  platformId: string
  externalId: string
  title: string
  url: string
  thumbnailUrl?: string
  coords?: Coords
  address?: string
}

export type SavedListing = ExtractedListing & {
  savedAt: number
  notes?: string
}

export type PlatformId = string
