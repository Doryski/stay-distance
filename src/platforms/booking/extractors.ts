import type { Coords } from "../../core/types"
import { BOOKING_SELECTORS, HOTEL_SLUG_REGEX } from "./selectors"

// ── externalId ───────────────────────────────────────────────────────────────

export const extractExternalId = (el: HTMLElement): string | null => {
  const href = el.querySelector<HTMLAnchorElement>(BOOKING_SELECTORS.linkInCard)?.href
  if (!href) return null
  return HOTEL_SLUG_REGEX.exec(href)?.[1] ?? null
}

// ── address (search card fallback) ───────────────────────────────────────────

export const extractAddress = (el: HTMLElement): string | null => {
  const text = el
    .querySelector<HTMLElement>(BOOKING_SELECTORS.addressInCard)
    ?.textContent?.trim()
  return text ? text : null
}

// ── coords from Apollo cache (keyed by URL slug / pageName) ──────────────────

type CoordMap = ReadonlyMap<string, Coords>
// Cache on the script element, not the Document: the Document is reused across
// SPA navigations (and across test cases in jsdom) but the injected Apollo
// script element is replaced when search results change.
const apolloCache = new WeakMap<HTMLScriptElement, CoordMap>()
const EMPTY_MAP: CoordMap = new Map()

const buildApolloCoordMap = (script: HTMLScriptElement): CoordMap => {
  const map = new Map<string, Coords>()
  if (!script.textContent) return map

  let root: unknown
  try {
    root = JSON.parse(script.textContent) as unknown
  } catch {
    return map
  }

  const stack: unknown[] = [root]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== "object") continue
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item)
      continue
    }
    const record = node as Record<string, unknown>
    const pageName = record.pageName
    const location = record.location as Record<string, unknown> | undefined
    const lat = location?.latitude
    const lon = location?.longitude
    if (
      typeof pageName === "string" &&
      typeof lat === "number" &&
      typeof lon === "number" &&
      !map.has(pageName)
    ) {
      map.set(pageName, { lat, lon })
    }
    for (const value of Object.values(record)) stack.push(value)
  }
  return map
}

const getApolloCoordMap = (doc: Document): CoordMap => {
  const script = doc.querySelector<HTMLScriptElement>(BOOKING_SELECTORS.apolloStore)
  if (!script) return EMPTY_MAP
  const cached = apolloCache.get(script)
  if (cached) return cached
  const map = buildApolloCoordMap(script)
  apolloCache.set(script, map)
  return map
}

export const extractCoords = (el: HTMLElement): Coords | null => {
  // Prefer inline attribute (some card variants / detail page embeds)
  const attr = el
    .querySelector<HTMLElement>(`[${"data-atlas-latlng"}]`)
    ?.getAttribute("data-atlas-latlng")
  if (attr) {
    const parts = attr.split(",").map(Number)
    const lat = parts[0]
    const lon = parts[1]
    if (
      typeof lat === "number" &&
      typeof lon === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lon)
    ) {
      return { lat, lon }
    }
  }

  const slug = extractExternalId(el)
  if (!slug) return null
  const doc = el.ownerDocument
  if (!doc) return null
  return getApolloCoordMap(doc).get(slug) ?? null
}

// ── detail page (property page) ──────────────────────────────────────────────

export const extractDetailCoords = (doc: Document): Coords | null => {
  const attr = doc
    .querySelector<HTMLElement>(BOOKING_SELECTORS.detailLatLng)
    ?.getAttribute("data-atlas-latlng")
  if (!attr) return null
  const parts = attr.split(",").map(Number)
  const lat = parts[0]
  const lon = parts[1]
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null
  }
  return { lat, lon }
}

type JsonLdHotel = {
  "@type"?: string
  name?: string
  address?: { streetAddress?: string } | string
  image?: string | string[]
}

const parseJsonLd = (doc: Document): JsonLdHotel | null => {
  const scripts = doc.querySelectorAll<HTMLScriptElement>(BOOKING_SELECTORS.jsonLd)
  for (const script of scripts) {
    if (!script.textContent) continue
    try {
      const parsed = JSON.parse(script.textContent) as JsonLdHotel | JsonLdHotel[]
      const entries = Array.isArray(parsed) ? parsed : [parsed]
      const hotel = entries.find(
        (e) => e["@type"] === "Hotel" || e["@type"] === "LodgingBusiness"
      )
      if (hotel) return hotel
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return null
}

export const extractDetailAddress = (doc: Document): string | null => {
  const jsonLd = parseJsonLd(doc)
  const addr = jsonLd?.address
  if (typeof addr === "string") return addr
  if (addr?.streetAddress) return addr.streetAddress
  return null
}

export const extractDetailTitle = (doc: Document): string | null => {
  const jsonLd = parseJsonLd(doc)
  if (jsonLd?.name) return jsonLd.name
  const el = doc.querySelector<HTMLElement>(BOOKING_SELECTORS.detailTitle)
  return el?.textContent?.trim() || null
}

export const extractDetailExternalId = (doc: Document): string | null =>
  HOTEL_SLUG_REGEX.exec(doc.location?.pathname ?? "")?.[1] ?? null

export const extractDetailThumbnail = (doc: Document): string | null => {
  const jsonLd = parseJsonLd(doc)
  const img = jsonLd?.image
  if (typeof img === "string") return img
  if (Array.isArray(img) && typeof img[0] === "string") return img[0]
  return null
}
