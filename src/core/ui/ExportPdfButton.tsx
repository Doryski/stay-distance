import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip"
import { useStorageKey } from "../hooks/useStorage"
import { useSelectedOrigins, useSettings } from "../hooks/useActiveOrigin"
import { STORAGE_KEYS } from "../storage/schema"
import { sendMessage } from "../messaging/client"
import { MESSAGE_KIND } from "../messaging/protocol"
import {
  TRANSPORT_MODES,
  type Coords,
  type RouteResult,
  type SavedListing,
  type TransportMode,
} from "../types"
import {
  buildAllPagesOrdered,
  buildListingsReport,
  reportFileName,
} from "../services/pdfExport/buildReport"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"

// pdfmake ships a CJS build whose vfs_fonts module assigns fonts in multiple
// shapes depending on how it's bundled. Normalize here so createPdf() can find
// the virtual FS regardless of whether Rollup gave us the fonts object directly
// or wrapped as { vfs }, and handle both the 0.3.x addVirtualFileSystem() API
// and the older pdfMake.vfs assignment.
const fontVfs = ((pdfFonts as unknown as { vfs?: Record<string, string> }).vfs ??
  pdfFonts) as Record<string, string>
const pdfMakeWithFs = pdfMake as unknown as {
  vfs?: Record<string, string>
  addVirtualFileSystem?: (vfs: Record<string, string>) => void
  createPdf: (typeof pdfMake)["createPdf"]
}
if (typeof pdfMakeWithFs.addVirtualFileSystem === "function") {
  pdfMakeWithFs.addVirtualFileSystem(fontVfs)
} else {
  pdfMakeWithFs.vfs = fontVfs
}

// Resolve via the background service worker so missing geocodes are fetched
// (not just read from cache) — the PDF export must include complete data even
// when the user hasn't opened every listing in the matrix yet.
const resolveCoords = async (listing: SavedListing): Promise<Coords | null> => {
  if (listing.coords) return listing.coords
  if (!listing.address) return null
  try {
    const res = await sendMessage({
      kind: MESSAGE_KIND.resolveListingCoords,
      address: listing.address,
    })
    return res.coords
  } catch {
    return null
  }
}

const fetchRoute = async (
  from: Coords,
  to: Coords,
  mode: TransportMode
): Promise<RouteResult | null> => {
  try {
    const { result } = await sendMessage({ kind: MESSAGE_KIND.route, from, to, mode })
    return result
  } catch {
    return null
  }
}

const routeKey = (li: number, oid: string, mode: TransportMode) => `${mode}:${li}:${oid}`

export const ExportPdfButton = () => {
  const [listings] = useStorageKey<SavedListing[]>(STORAGE_KEYS.savedListings, [])
  const { origins } = useSelectedOrigins()
  const [settings] = useSettings()
  const [busy, setBusy] = useState(false)

  const disabled = listings.length === 0 || busy
  const tooltip = listings.length === 0 ? "Save a listing first" : "Export PDF report"

  const handleClick = async () => {
    if (disabled) return
    setBusy(true)
    try {
      const coordsByIndex = await Promise.all(listings.map(resolveCoords))
      const routeMap = new Map<string, RouteResult>()

      const fetches: Promise<void>[] = []
      for (const mode of TRANSPORT_MODES) {
        for (let li = 0; li < listings.length; li++) {
          const to = coordsByIndex[li]
          if (!to) continue
          for (const o of origins) {
            fetches.push(
              fetchRoute(o.coords, to, mode).then((r) => {
                if (r) routeMap.set(routeKey(li, o.id, mode), r)
              })
            )
          }
        }
      }
      await Promise.all(fetches)

      const generatedAt = new Date()
      const pages = buildAllPagesOrdered({
        transportMode: settings.transportMode,
        metric: settings.matrixDisplayMetric,
      })

      const docDef = buildListingsReport({
        listings,
        origins,
        getRoute: (li, oid, mode) => routeMap.get(routeKey(li, oid, mode)) ?? null,
        pages,
        sort: settings.matrixSort,
        generatedAt,
        locale: navigator.language,
      })

      pdfMakeWithFs.createPdf(docDef).download(reportFileName(generatedAt))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            aria-label={tooltip}
          >
            <Download className="size-3.5" aria-hidden />
            Export PDF
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
