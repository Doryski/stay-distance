import { z } from "zod"
import { savedListingSchema, STORAGE_KEYS } from "./schema"
import { readKey, writeKey } from "./kv"
import type { SavedListing } from "../types"
import { listingKey } from "../utils/hash"

const savedListingsArraySchema = z.array(savedListingSchema)

export const listSavedListings = async (): Promise<SavedListing[]> => {
  const raw = await readKey<unknown>(STORAGE_KEYS.savedListings, [])
  const parsed = savedListingsArraySchema.safeParse(raw)
  return parsed.success ? parsed.data : []
}

export const saveListings = (items: SavedListing[]): Promise<void> =>
  writeKey(STORAGE_KEYS.savedListings, items)

export const addSavedListing = async (listing: SavedListing): Promise<SavedListing[]> => {
  const current = await listSavedListings()
  const key = listingKey(listing.platformId, listing.externalId)
  const filtered = current.filter((l) => listingKey(l.platformId, l.externalId) !== key)
  const next = [...filtered, listing]
  await saveListings(next)
  return next
}

export const removeSavedListing = async (
  platformId: string,
  externalId: string
): Promise<SavedListing[]> => {
  const key = listingKey(platformId, externalId)
  const next = (await listSavedListings()).filter(
    (l) => listingKey(l.platformId, l.externalId) !== key
  )
  await saveListings(next)
  return next
}
