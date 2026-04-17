import { cva, type VariantProps } from "class-variance-authority"
import { formatDistance, formatDuration } from "../utils/format"
import type { RouteResult } from "../types"
import type { MatrixDisplayMetric } from "../storage/schema"

const badge = cva(
  [
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
    "text-[12px] font-medium leading-[1.4] tracking-tight",
    "border border-[var(--border)] shadow-sm",
  ],
  {
    variants: {
      tier: {
        fast: "bg-[var(--brand,#2E7D4F)] text-white border-transparent",
        normal: "bg-transparent text-[var(--surface-fg,#1C2B2D)]",
        loading: "bg-transparent text-[var(--muted,#6B7A7C)]",
        empty: "bg-transparent text-[var(--muted,#6B7A7C)]",
      },
    },
    defaultVariants: { tier: "normal" },
  }
)

type Tier = NonNullable<VariantProps<typeof badge>["tier"]>

const metricValue = (result: RouteResult, metric: MatrixDisplayMetric): number =>
  metric === "distance" ? result.distanceKm : result.durationMinutes

const tierFor = (
  result: RouteResult | null | undefined,
  metric: MatrixDisplayMetric,
  fastThreshold: number | undefined,
  loading?: boolean
): Tier => {
  if (loading) return "loading"
  if (!result) return "empty"
  if (fastThreshold !== undefined && metricValue(result, metric) <= fastThreshold)
    return "fast"
  return "normal"
}

type Props = {
  result: RouteResult | null | undefined
  loading?: boolean
  originLabel?: string
  compact?: boolean
  metric?: MatrixDisplayMetric
  fastThreshold?: number
}

export const InlineBadge = ({
  result,
  loading,
  originLabel,
  compact,
  metric = "duration",
  fastThreshold,
}: Props) => {
  const tier = tierFor(result, metric, fastThreshold, loading)
  const valueText = loading
    ? "…"
    : result
      ? metric === "distance"
        ? formatDistance(result.distanceKm)
        : formatDuration(result.durationMinutes)
      : "—"

  if (compact) {
    const tooltipText = result
      ? `${originLabel ? `${originLabel} · ` : ""}${formatDuration(result.durationMinutes)} · ${formatDistance(result.distanceKm)}`
      : (originLabel ?? "")
    return (
      <span
        className={badge({ tier })}
        title={tooltipText || undefined}
        aria-label={tooltipText || undefined}
      >
        {originLabel && (
          <span className="max-w-[80px] truncate opacity-80">{originLabel}</span>
        )}
        <span className="font-mono">{valueText}</span>
      </span>
    )
  }

  const fullText = loading
    ? "…"
    : result
      ? `${formatDuration(result.durationMinutes)} · ${formatDistance(result.distanceKm)}`
      : "—"
  return (
    <span
      className={badge({ tier })}
      title={originLabel ? `Time from ${originLabel}` : undefined}
    >
      <span className="font-mono">{fullText}</span>
    </span>
  )
}
