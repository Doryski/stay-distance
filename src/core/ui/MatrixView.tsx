import { useState, type ReactNode } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  Check,
  ExternalLink,
  X,
} from "lucide-react"
import { useQueries } from "@tanstack/react-query"
import { useStorageKey } from "../hooks/useStorage"
import { useSelectedOrigins, useSettings } from "../hooks/useActiveOrigin"
import { sendMessage } from "../messaging/client"
import { MESSAGE_KIND } from "../messaging/protocol"
import { removeSavedListing } from "../storage/listings"
import { updateSettings } from "../storage/settings"
import {
  STORAGE_KEYS,
  type MatrixDisplayMetric,
  type MatrixSortKey,
} from "../storage/schema"
import { formatDistance, formatDuration } from "../utils/format"
import { sortKeyEquals, sortListingIndices } from "../utils/matrixSort"
import type { Origin, RouteResult, SavedListing, TransportMode } from "../types"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import { METRIC_OPTIONS, TRANSPORT_OPTIONS } from "./transport"

type SortDir = "asc" | "desc"

const metricValue = (route: RouteResult, metric: MatrixDisplayMetric): number =>
  metric === "duration" ? route.durationMinutes : route.distanceKm

export const MatrixView = () => {
  const [saved] = useStorageKey<SavedListing[]>(STORAGE_KEYS.savedListings, [])
  const { origins } = useSelectedOrigins()
  const [settings] = useSettings()
  const sort = settings.matrixSort
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState<string | null>(null)

  const coordsQueries = useQueries({
    queries: saved.map((l) => ({
      queryKey: ["listing-coords", l.coords, l.address],
      enabled: !!l.coords || !!l.address,
      queryFn: async () => {
        const res = await sendMessage({
          kind: MESSAGE_KIND.resolveListingCoords,
          ...(l.coords ? { coords: l.coords } : {}),
          ...(l.address ? { address: l.address } : {}),
        })
        return res.coords
      },
      staleTime: Infinity,
    })),
  })

  const routePairs = saved.flatMap((l, li) =>
    origins.map((o, oi) => ({
      listingIndex: li,
      originIndex: oi,
      from: o.coords,
      to: coordsQueries[li]?.data,
    }))
  )

  const routeQueries = useQueries({
    queries: routePairs.map((p) => ({
      queryKey: ["route", p.from, p.to, settings.transportMode],
      enabled: !!p.from && !!p.to,
      queryFn: async () => {
        const { result } = await sendMessage({
          kind: MESSAGE_KIND.route,
          from: p.from,
          to: p.to!,
          mode: settings.transportMode,
        })
        return result
      },
      staleTime: Infinity,
    })),
  })

  const routeMap = new Map<string, RouteResult | null | undefined>()
  const routeLoadingMap = new Map<string, boolean>()
  routePairs.forEach((p, i) => {
    const originId = origins[p.originIndex]?.id
    if (!originId) return
    const key = `${p.listingIndex}:${originId}`
    const q = routeQueries[i]
    routeMap.set(key, q?.data ?? null)
    routeLoadingMap.set(key, !!q?.isLoading)
  })

  const getRoute = (listingIndex: number, originId: string): RouteResult | null =>
    routeMap.get(`${listingIndex}:${originId}`) ?? null

  // Total is only defined when every origin has a resolved route — a partial
  // sum across an incomplete set of origins would misrank listings.
  const totalFor = (listingIndex: number): number | null => {
    if (origins.length === 0) return null
    let sum = 0
    for (const o of origins) {
      const route = getRoute(listingIndex, o.id)
      if (!route) return null
      sum += metricValue(route, settings.matrixDisplayMetric)
    }
    return sum
  }

  const indices = sortListingIndices(
    saved,
    origins,
    sort,
    settings.matrixDisplayMetric,
    getRoute
  )

  const toggleSort = (key: MatrixSortKey) => {
    const sameKey = sortKeyEquals(sort.key, key)
    const dir: SortDir = sameKey && sort.dir === "asc" ? "desc" : "asc"
    void updateSettings({ matrixSort: { key, dir: sameKey ? dir : "asc" } })
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bookmark className="size-4 text-[var(--primary)]" />
        <h2 className="text-sm font-semibold tracking-tight">Saved listings</h2>
      </div>

      {saved.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          Listings you save on booking.com will appear here with driving times to each of
          your places.
        </p>
      ) : (
        <>
          {origins.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Select at least one place to see travel times.
            </p>
          )}
          <MatrixToolbar
            mode={settings.transportMode}
            metric={settings.matrixDisplayMetric}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--muted-foreground)]">
                  <SortHeader
                    label="Listing"
                    active={sort.key.kind === "title"}
                    dir={sort.dir}
                    onClick={() => toggleSort({ kind: "title" })}
                    className="sticky left-0 z-10 bg-[var(--background)] pr-3 shadow-[1px_0_0_0_var(--border)]"
                  />
                  {origins.map((o) => (
                    <SortHeader
                      key={o.id}
                      label={o.label}
                      active={sort.key.kind === "origin" && sort.key.id === o.id}
                      dir={sort.dir}
                      onClick={() => toggleSort({ kind: "origin", id: o.id })}
                      className="px-3 whitespace-nowrap"
                    />
                  ))}
                  {origins.length > 0 && (
                    <SortHeader
                      label="Total"
                      active={sort.key.kind === "total"}
                      dir={sort.dir}
                      onClick={() => toggleSort({ kind: "total" })}
                      className="px-3 whitespace-nowrap border-l border-[var(--border)]"
                    />
                  )}
                  <th className="border-b border-[var(--border)] py-2 w-0" />
                </tr>
              </thead>
              <tbody>
                {indices.map((i) => {
                  const l = saved[i]!
                  const rowKey = `${l.platformId}:${l.externalId}`
                  return (
                    <ListingRow
                      key={rowKey}
                      listing={l}
                      origins={origins}
                      metric={settings.matrixDisplayMetric}
                      listingIndex={i}
                      resolving={!!coordsQueries[i]?.isLoading}
                      routeMap={routeMap}
                      routeLoadingMap={routeLoadingMap}
                      total={totalFor(i)}
                      confirmingDelete={confirmingDeleteKey === rowKey}
                      onRequestDelete={() => setConfirmingDeleteKey(rowKey)}
                      onCancelDelete={() => setConfirmingDeleteKey(null)}
                      onConfirmDelete={async () => {
                        await removeSavedListing(l.platformId, l.externalId)
                        setConfirmingDeleteKey(null)
                      }}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

type SortHeaderProps = {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  className?: string
}

const SortHeader = ({ label, active, dir, onClick, className }: SortHeaderProps) => {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th className={cn("border-b border-[var(--border)] py-2 font-medium", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium transition-colors",
          "hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded",
          active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        )}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-50")} aria-hidden />
      </button>
    </th>
  )
}

type MatrixToolbarProps = {
  mode: TransportMode
  metric: MatrixDisplayMetric
}

const MatrixToolbar = ({ mode, metric }: MatrixToolbarProps) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <SegmentedControl
      ariaLabel="Travel mode"
      value={mode}
      options={TRANSPORT_OPTIONS}
      onChange={(value) => {
        void updateSettings({ transportMode: value })
      }}
      renderOption={({ Icon, label }) => (
        <>
          <Icon className="size-3.5" aria-hidden />
          <span className="sr-only">{label}</span>
        </>
      )}
    />
    <SegmentedControl
      ariaLabel="Display metric"
      value={metric}
      options={METRIC_OPTIONS}
      onChange={(value) => {
        void updateSettings({ matrixDisplayMetric: value })
      }}
      renderOption={({ label }) => <span>{label}</span>}
    />
  </div>
)

type SegmentedOption<V extends string> = { value: V; label: string }

type SegmentedControlProps<V extends string, O extends SegmentedOption<V>> = {
  ariaLabel: string
  value: V
  options: ReadonlyArray<O>
  onChange: (value: V) => void
  renderOption: (option: O) => ReactNode
}

const SegmentedControl = <V extends string, O extends SegmentedOption<V>>({
  ariaLabel,
  value,
  options,
  onChange,
  renderOption,
}: SegmentedControlProps<V, O>) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--muted)] p-0.5"
  >
    {options.map((option) => {
      const selected = option.value === value
      return (
        <Tooltip key={option.value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                selected
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {renderOption(option)}
            </button>
          </TooltipTrigger>
          <TooltipContent>{option.label}</TooltipContent>
        </Tooltip>
      )
    })}
  </div>
)

type ListingRowProps = {
  listing: SavedListing
  origins: Origin[]
  metric: MatrixDisplayMetric
  listingIndex: number
  resolving: boolean
  routeMap: Map<string, RouteResult | null | undefined>
  routeLoadingMap: Map<string, boolean>
  total: number | null
  confirmingDelete: boolean
  onRequestDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

const ListingRow = ({
  listing,
  origins,
  metric,
  listingIndex,
  resolving,
  routeMap,
  routeLoadingMap,
  total,
  confirmingDelete,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: ListingRowProps) => (
  <tr
    className="group/row align-middle [&>td]:border-b [&>td]:border-[var(--border)] last:[&>td]:border-b-0 data-[confirming=true]:bg-[var(--destructive,#c0392b)]/10"
    data-confirming={confirmingDelete}
  >
    <td className="sticky left-0 z-10 bg-[var(--background)] py-2 pr-3 shadow-[1px_0_0_0_var(--border)] group-data-[confirming=true]/row:bg-[color-mix(in_srgb,var(--destructive,#c0392b)_10%,var(--background))]">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-1.5 text-[var(--foreground)] hover:text-[var(--primary)]"
          >
            <span className="block max-w-[140px] truncate underline-offset-2 group-hover:underline">
              {listing.title}
            </span>
            <ExternalLink className="size-3 shrink-0 opacity-60 group-hover:opacity-100" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {listing.title}
        </TooltipContent>
      </Tooltip>
    </td>
    {origins.map((o) => {
      const key = `${listingIndex}:${o.id}`
      return (
        <RouteCell
          key={key}
          route={routeMap.get(key) ?? null}
          loading={resolving || !!routeLoadingMap.get(key)}
          metric={metric}
        />
      )
    })}
    {origins.length > 0 && (
      <td className="py-2 px-3 font-mono text-xs whitespace-nowrap border-l border-[var(--border)] font-semibold">
        {total === null ? (
          <span className="text-[var(--muted-foreground)] font-normal">—</span>
        ) : metric === "duration" ? (
          formatDuration(total)
        ) : (
          formatDistance(total)
        )}
      </td>
    )}
    <td className="py-2 pl-1 pr-1 whitespace-nowrap text-right">
      {confirmingDelete ? (
        <div className="inline-flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-7"
                onClick={onConfirmDelete}
                aria-label={`Confirm remove ${listing.title}`}
              >
                <Check className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Confirm remove</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onCancelDelete}
                aria-label={`Cancel remove ${listing.title}`}
              >
                <X className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onRequestDelete}
              aria-label={`Remove ${listing.title}`}
            >
              <X className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove</TooltipContent>
        </Tooltip>
      )}
    </td>
  </tr>
)

type RouteCellProps = {
  route: RouteResult | null | undefined
  loading: boolean
  metric: MatrixDisplayMetric
}

const RouteCell = ({ route, loading, metric }: RouteCellProps) => {
  if (loading) {
    return (
      <td className="py-2 px-3 font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap">
        …
      </td>
    )
  }

  if (!route) {
    return (
      <td className="py-2 px-3 font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap">
        —
      </td>
    )
  }

  const value =
    metric === "duration"
      ? formatDuration(route.durationMinutes)
      : formatDistance(route.distanceKm)

  return <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{value}</td>
}
