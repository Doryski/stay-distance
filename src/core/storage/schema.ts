import { z } from "zod"
import { TRANSPORT_MODES } from "../types"

export const STORAGE_VERSION = 1

export const coordsSchema = z.object({
  lat: z.number(),
  lon: z.number(),
})

export const originSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  address: z.string().min(1),
  coords: coordsSchema,
  color: z.string().optional(),
  createdAt: z.number(),
})

// Scraped URLs must be https to block javascript:, data:, and http: schemes
// flowing from untrusted DOM into stored data and rendered <a href>/<img src>.
const httpsUrl = z.url().refine((u) => u.startsWith("https://"), {
  message: "URL must use https scheme",
})

export const savedListingSchema = z.object({
  platformId: z.string(),
  externalId: z.string(),
  title: z.string(),
  url: httpsUrl,
  thumbnailUrl: httpsUrl.optional(),
  coords: coordsSchema.optional(),
  address: z.string().optional(),
  savedAt: z.number(),
  notes: z.string().optional(),
})

export const routeResultSchema = z.object({
  durationMinutes: z.number(),
  distanceKm: z.number(),
})

export const MATRIX_DISPLAY_METRICS = ["duration", "distance"] as const
export type MatrixDisplayMetric = (typeof MATRIX_DISPLAY_METRICS)[number]

// Earth's circumference in km. Used as the "around the globe" upper sanity
// cap — any threshold above this is nonsensical regardless of transport mode.
const EARTH_CIRCUMFERENCE_KM = 40075

// At ~50 km/h average (mixed driving+cycling+walking), circumnavigating
// the planet would take ~48,000 minutes — use 50,000 as a clean round cap.
const AROUND_THE_GLOBE_MINUTES = 50000

export const FAST_THRESHOLD_LIMITS = {
  min: 1,
  maxDurationMinutes: AROUND_THE_GLOBE_MINUTES,
  maxDistanceKm: EARTH_CIRCUMFERENCE_KM,
} as const

const perModeThresholdSchema = (maxValue: number) =>
  z.object({
    driving: z.number().int().min(FAST_THRESHOLD_LIMITS.min).max(maxValue),
    cycling: z.number().int().min(FAST_THRESHOLD_LIMITS.min).max(maxValue),
    walking: z.number().int().min(FAST_THRESHOLD_LIMITS.min).max(maxValue),
  })

export const DEFAULT_FAST_THRESHOLDS = {
  duration: { driving: 20, cycling: 25, walking: 15 },
  distance: { driving: 15, cycling: 10, walking: 2 },
} as const

export const fastThresholdsSchema = z.object({
  duration: perModeThresholdSchema(FAST_THRESHOLD_LIMITS.maxDurationMinutes),
  distance: perModeThresholdSchema(FAST_THRESHOLD_LIMITS.maxDistanceKm),
})

export const matrixSortKeySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("title") }),
  z.object({ kind: z.literal("origin"), id: z.string() }),
  z.object({ kind: z.literal("total") }),
])

export const matrixSortSchema = z.object({
  key: matrixSortKeySchema,
  dir: z.enum(["asc", "desc"]),
})

export type MatrixSortKey = z.infer<typeof matrixSortKeySchema>
export type MatrixSort = z.infer<typeof matrixSortSchema>

export const DEFAULT_MATRIX_SORT: MatrixSort = {
  key: { kind: "title" },
  dir: "asc",
}

export const settingsSchema = z.object({
  activeOriginIds: z.array(z.string()).default([]),
  transportMode: z.enum(TRANSPORT_MODES),
  showInlineBadge: z.boolean(),
  offlineMode: z.boolean(),
  matrixDisplayMetric: z.enum(MATRIX_DISPLAY_METRICS).default("duration"),
  matrixSort: matrixSortSchema.default(DEFAULT_MATRIX_SORT),
  fastThresholds: fastThresholdsSchema.default(DEFAULT_FAST_THRESHOLDS),
})

export type Settings = z.infer<typeof settingsSchema>
export type FastThresholds = Settings["fastThresholds"]

export const DEFAULT_SETTINGS: Settings = {
  activeOriginIds: [],
  transportMode: "driving",
  showInlineBadge: true,
  offlineMode: false,
  matrixDisplayMetric: "duration",
  matrixSort: DEFAULT_MATRIX_SORT,
  fastThresholds: DEFAULT_FAST_THRESHOLDS,
}

export const ORIGIN_LIMITS = {
  labelMax: 40,
  addressMin: 5,
  addressMax: 200,
  maxOrigins: 10,
} as const

export const STORAGE_KEYS = {
  version: "sd:version",
  origins: "sd:origins",
  savedListings: "sd:savedListings",
  settings: "sd:settings",
  geocodeCache: "sd:cache:geocode",
  routeCache: "sd:cache:route",
} as const
