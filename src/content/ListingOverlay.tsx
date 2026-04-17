import { InlineBadge } from "../core/ui/InlineBadge"
import { BrandMark } from "../core/ui/BrandMark"
import { SaveButton } from "../core/ui/SaveButton"
import { MODE_ICON } from "../core/ui/transport"
import { useSelectedOrigins } from "../core/hooks/useActiveOrigin"
import { useListingCoords, useRoute } from "../core/hooks/useRoute"
import { useSettings } from "../core/hooks/useActiveOrigin"
import { useStorageKey } from "../core/hooks/useStorage"
import { STORAGE_KEYS, type MatrixDisplayMetric } from "../core/storage/schema"
import { addSavedListing, removeSavedListing } from "../core/storage/listings"
import { listingKey } from "../core/utils/hash"
import type { Coords, ExtractedListing, SavedListing, TransportMode } from "../core/types"

type Props = { listing: ExtractedListing }

type OriginBadgeProps = {
  originLabel: string
  originCoords: Coords
  listingCoords: Coords | undefined
  listingLoading: boolean
  mode: TransportMode
  metric: MatrixDisplayMetric
  fastThreshold: number
}

const OriginBadge = ({
  originLabel,
  originCoords,
  listingCoords,
  listingLoading,
  mode,
  metric,
  fastThreshold,
}: OriginBadgeProps) => {
  const route = useRoute(originCoords, listingCoords, mode)
  return (
    <InlineBadge
      compact
      result={route.data ?? null}
      loading={route.isLoading || listingLoading}
      originLabel={originLabel}
      metric={metric}
      fastThreshold={fastThreshold}
    />
  )
}

export const ListingOverlay = ({ listing }: Props) => {
  const { origins } = useSelectedOrigins()
  const [settings] = useSettings()
  const [saved] = useStorageKey<SavedListing[]>(STORAGE_KEYS.savedListings, [])

  const listingCoordsQuery = useListingCoords(listing.coords, listing.address)

  const key = listingKey(listing.platformId, listing.externalId)
  const isSaved = saved.some((l) => listingKey(l.platformId, l.externalId) === key)

  const toggleSaved = () => {
    if (isSaved) {
      removeSavedListing(listing.platformId, listing.externalId)
    } else {
      addSavedListing({ ...listing, savedAt: Date.now() })
    }
  }

  const showBadges = settings.showInlineBadge && origins.length > 0
  const ModeIcon = MODE_ICON[settings.transportMode]
  const fastThreshold =
    settings.fastThresholds[settings.matrixDisplayMetric][settings.transportMode]

  return (
    <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface,#fff)] px-2 py-1 shadow-sm">
      <BrandMark className="h-4 w-4 shrink-0" title="Stay Distance" />
      {showBadges && (
        <ModeIcon
          aria-hidden
          className="h-4 w-4 shrink-0 text-[#c9d1d3]"
          strokeWidth={1.25}
        />
      )}
      {showBadges &&
        origins.map((o) => (
          <OriginBadge
            key={o.id}
            originLabel={o.label}
            originCoords={o.coords}
            listingCoords={listingCoordsQuery.data}
            listingLoading={listingCoordsQuery.isLoading}
            mode={settings.transportMode}
            metric={settings.matrixDisplayMetric}
            fastThreshold={fastThreshold}
          />
        ))}
      <SaveButton saved={isSaved} onToggle={toggleSaved} />
    </div>
  )
}
