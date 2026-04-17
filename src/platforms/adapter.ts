import type { ExtractedListing } from "../core/types"

export type ListingElement = HTMLElement

export type PlatformAdapter = {
  id: string
  matchUrl: (url: URL) => boolean
  detectListings: (root: ParentNode) => ListingElement[]
  extractListing: (el: ListingElement) => ExtractedListing | null
  getInjectionPoint: (el: ListingElement) => HTMLElement
  getDetailPageListing?: () => ExtractedListing | null
}
