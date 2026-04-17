import { Bike, Car, Footprints, type LucideIcon } from "lucide-react"
import type { TransportMode } from "../types"
import type { MatrixDisplayMetric } from "../storage/schema"

export const TRANSPORT_OPTIONS = [
  { value: "driving", label: "Driving", Icon: Car },
  { value: "cycling", label: "Cycling", Icon: Bike },
  { value: "walking", label: "Walking", Icon: Footprints },
] as const satisfies ReadonlyArray<{
  value: TransportMode
  label: string
  Icon: LucideIcon
}>

export const METRIC_OPTIONS = [
  { value: "duration", label: "min" },
  { value: "distance", label: "km" },
] as const satisfies ReadonlyArray<{ value: MatrixDisplayMetric; label: string }>

export const MODE_ICON: Record<TransportMode, LucideIcon> = {
  driving: Car,
  cycling: Bike,
  walking: Footprints,
}
