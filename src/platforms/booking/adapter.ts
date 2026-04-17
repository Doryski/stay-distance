import type { PlatformAdapter } from "../adapter"
import type { ExtractedListing } from "../../core/types"
import { BOOKING_SELECTORS } from "./selectors"
import { matchBookingUrl, isDetailPage } from "./routes"
import {
  extractAddress,
  extractCoords,
  extractDetailAddress,
  extractDetailCoords,
  extractDetailExternalId,
  extractDetailThumbnail,
  extractDetailTitle,
  extractExternalId,
} from "./extractors"

export const PLATFORM_ID = "booking"

// DOM-sourced URLs flow into stored data and rendered <a href>/<img src>,
// so reject any scheme other than https (javascript:, data:, http:, etc.).
const httpsOrNull = (raw: string | undefined | null): string | undefined => {
  if (!raw) return undefined
  try {
    return new URL(raw).protocol === "https:" ? raw : undefined
  } catch {
    return undefined
  }
}

export const bookingAdapter: PlatformAdapter = {
  id: PLATFORM_ID,

  matchUrl: matchBookingUrl,

  detectListings: (root) =>
    Array.from(root.querySelectorAll<HTMLElement>(BOOKING_SELECTORS.listCard)),

  extractListing: (el) => {
    const externalId = extractExternalId(el)
    const link = el.querySelector<HTMLAnchorElement>(BOOKING_SELECTORS.linkInCard)
    const title = el
      .querySelector<HTMLElement>(BOOKING_SELECTORS.titleInCard)
      ?.textContent?.trim()
    if (!externalId || !link || !title) return null

    const url = httpsOrNull(link.href)
    if (!url) return null

    const thumbnail = httpsOrNull(
      el.querySelector<HTMLImageElement>(BOOKING_SELECTORS.thumbnailInCard)?.src
    )

    const coords = extractCoords(el) ?? undefined
    const address = extractAddress(el) ?? undefined

    return {
      platformId: PLATFORM_ID,
      externalId,
      title,
      url,
      ...(thumbnail ? { thumbnailUrl: thumbnail } : {}),
      ...(coords ? { coords } : {}),
      ...(address ? { address } : {}),
    }
  },

  getInjectionPoint: (el) =>
    el.querySelector<HTMLElement>(BOOKING_SELECTORS.injectionAnchor) ?? el,

  getDetailPageListing: (): ExtractedListing | null => {
    const doc = typeof document === "undefined" ? null : document
    if (!doc || !isDetailPage(new URL(doc.location.href))) return null

    const externalId = extractDetailExternalId(doc)
    const title = extractDetailTitle(doc)
    if (!externalId || !title) return null

    const url = httpsOrNull(doc.location.href)
    if (!url) return null

    const coords = extractDetailCoords(doc) ?? undefined
    const address = extractDetailAddress(doc) ?? undefined
    const thumbnailUrl = httpsOrNull(extractDetailThumbnail(doc))

    return {
      platformId: PLATFORM_ID,
      externalId,
      title,
      url,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
      ...(coords ? { coords } : {}),
      ...(address ? { address } : {}),
    }
  },
}
