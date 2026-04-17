import type {
  Content,
  ContentTable,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces"
import type { MatrixDisplayMetric, MatrixSort } from "../../storage/schema"
import type { Origin, RouteResult, SavedListing, TransportMode } from "../../types"
import { formatDistance, formatDuration } from "../../utils/format"
import { sortListingIndices } from "../../utils/matrixSort"
import { PDF_THEME } from "./theme"
import { PDF_LOGO_SVG } from "./logo"

const TRANSPORT_LABEL = {
  driving: "Driving",
  cycling: "Cycling",
  walking: "Walking",
} as const satisfies Record<TransportMode, string>

const METRIC_LABEL = {
  duration: "minutes",
  distance: "kilometres",
} as const satisfies Record<MatrixDisplayMetric, string>

const EM_DASH = "—"
const ORIGIN_HEADER_MAX = 18

export type RouteLookup = (
  listingIndex: number,
  originId: string,
  transportMode: TransportMode
) => RouteResult | null

export type PageConfig = {
  transportMode: TransportMode
  metric: MatrixDisplayMetric
}

export type BuildReportInput = {
  listings: SavedListing[]
  origins: Origin[]
  getRoute: RouteLookup
  pages: PageConfig[]
  sort: MatrixSort
  generatedAt: Date
  locale?: string
}

const truncate = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`

const metricValue = (route: RouteResult, metric: MatrixDisplayMetric): number =>
  metric === "duration" ? route.durationMinutes : route.distanceKm

const formatMetric = (value: number, metric: MatrixDisplayMetric): string =>
  metric === "duration" ? formatDuration(value) : formatDistance(value)

const formatDate = (date: Date, locale?: string): string => {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

const buildHeader = (
  generatedAt: Date,
  locale: string | undefined,
  page: PageConfig
): Content => ({
  columns: [
    { svg: PDF_LOGO_SVG, width: 32, height: 32 },
    {
      stack: [
        {
          text: "Stay Distance",
          fontSize: PDF_THEME.size.title,
          bold: true,
          color: PDF_THEME.color.foreground,
        },
        {
          text: `${TRANSPORT_LABEL[page.transportMode]} · ${METRIC_LABEL[page.metric]}`,
          fontSize: PDF_THEME.size.subtitle,
          color: PDF_THEME.color.muted,
          margin: [0, 2, 0, 0],
        },
      ],
      margin: [10, 0, 0, 0],
    },
    {
      text: formatDate(generatedAt, locale),
      fontSize: PDF_THEME.size.subtitle,
      color: PDF_THEME.color.muted,
      alignment: "right",
      margin: [0, 12, 0, 0],
    },
  ],
  columnGap: 0,
})

const buildAccentRule = (landscape: boolean): Content => ({
  canvas: [
    {
      type: "rect",
      x: 0,
      y: 0,
      w: landscape ? 730 : 483,
      h: 2,
      color: PDF_THEME.color.accent,
    },
  ],
  margin: [0, 12, 0, 12],
})

const buildMetaStrip = (origins: Origin[], page: PageConfig): Content => {
  const head = `Mode: ${TRANSPORT_LABEL[page.transportMode]}  ·  Metric: ${METRIC_LABEL[page.metric]}`
  if (origins.length === 0) {
    return {
      text: head,
      fontSize: PDF_THEME.size.meta,
      color: PDF_THEME.color.muted,
      margin: [0, 0, 0, 14],
    }
  }
  return {
    stack: [
      {
        text: head,
        fontSize: PDF_THEME.size.meta,
        color: PDF_THEME.color.muted,
      },
      {
        text: "Origins",
        fontSize: PDF_THEME.size.meta,
        color: PDF_THEME.color.muted,
        bold: true,
        margin: [0, 6, 0, 2],
      },
      {
        stack: origins.map((o) => ({
          columns: [
            {
              text: "•",
              width: 10,
              color: PDF_THEME.color.muted,
              fontSize: PDF_THEME.size.meta,
            },
            {
              text: [
                { text: o.label, bold: true, color: PDF_THEME.color.foreground },
                { text: `  —  ${o.address}`, color: PDF_THEME.color.muted },
              ],
              fontSize: PDF_THEME.size.meta,
            },
          ],
          columnGap: 0,
          margin: [0, 1, 0, 1],
        })),
      },
    ],
    margin: [0, 0, 0, 14],
  }
}

const buildHeaderRow = (origins: Origin[]): TableCell[] => {
  const headerStyle = {
    bold: true,
    color: PDF_THEME.color.primaryFg,
    fillColor: PDF_THEME.color.primary,
    fontSize: PDF_THEME.size.tableHeader,
    margin: [6, 6, 6, 6] as [number, number, number, number],
  }
  const cells: TableCell[] = [
    { text: "Listing", ...headerStyle },
    { text: "Address", ...headerStyle },
    ...origins.map((o) => ({
      text: truncate(o.label, ORIGIN_HEADER_MAX),
      alignment: "right" as const,
      noWrap: true,
      ...headerStyle,
    })),
  ]
  if (origins.length > 0) {
    cells.push({
      text: "Total",
      alignment: "right" as const,
      noWrap: true,
      ...headerStyle,
    })
  }
  return cells
}

const buildBodyRow = (
  listing: SavedListing,
  listingIndex: number,
  origins: Origin[],
  page: PageConfig,
  getRoute: RouteLookup,
  rowIndex: number
): TableCell[] => {
  const fillColor = rowIndex % 2 === 0 ? null : PDF_THEME.color.rowAlt
  const baseCell = {
    fontSize: PDF_THEME.size.tableBody,
    margin: [6, 6, 6, 6] as [number, number, number, number],
    ...(fillColor ? { fillColor } : {}),
  }
  const mutedCell = {
    ...baseCell,
    fontSize: PDF_THEME.size.addressCell,
    color: PDF_THEME.color.muted,
  }

  const titleCell: TableCell = {
    ...baseCell,
    text: listing.title,
    link: listing.url,
    color: PDF_THEME.color.primary,
    decoration: "underline",
    bold: true,
  }

  const addressCell: TableCell = {
    ...mutedCell,
    text: listing.address ?? EM_DASH,
  }

  const routes = origins.map((o) => getRoute(listingIndex, o.id, page.transportMode))

  const originCells: TableCell[] = routes.map((route) => ({
    ...baseCell,
    text: route ? formatMetric(metricValue(route, page.metric), page.metric) : EM_DASH,
    color: route ? PDF_THEME.color.foreground : PDF_THEME.color.muted,
    alignment: "right" as const,
    noWrap: true,
  }))

  const cells: TableCell[] = [titleCell, addressCell, ...originCells]

  if (origins.length > 0) {
    const allResolved = routes.every((r): r is RouteResult => r !== null)
    const total = allResolved
      ? routes.reduce((sum, r) => sum + metricValue(r, page.metric), 0)
      : null
    cells.push({
      ...baseCell,
      text: total === null ? EM_DASH : formatMetric(total, page.metric),
      color: total === null ? PDF_THEME.color.muted : PDF_THEME.color.foreground,
      bold: total !== null,
      alignment: "right" as const,
      fillColor: PDF_THEME.color.accentSoft,
      noWrap: true,
    })
  }

  return cells
}

const buildTable = (
  listings: SavedListing[],
  origins: Origin[],
  page: PageConfig,
  getRoute: RouteLookup,
  sortedIndices: number[]
): ContentTable => {
  const widths: (number | "*" | "auto")[] = ["*", "*"]
  origins.forEach(() => widths.push("auto"))
  if (origins.length > 0) widths.push("auto")

  const body: TableCell[][] = [
    buildHeaderRow(origins),
    ...sortedIndices.map((listingIndex, rowIndex) =>
      buildBodyRow(
        listings[listingIndex]!,
        listingIndex,
        origins,
        page,
        getRoute,
        rowIndex
      )
    ),
  ]

  return {
    table: {
      headerRows: 1,
      widths,
      body,
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  }
}

const buildEmptyState = (): Content => ({
  text: "No saved listings yet.",
  alignment: "center",
  color: PDF_THEME.color.muted,
  fontSize: PDF_THEME.size.tableBody,
  margin: [0, 60, 0, 0],
})

const buildPageContent = (
  input: BuildReportInput,
  page: PageConfig,
  landscape: boolean,
  isFirst: boolean
): Content[] => {
  const sortedIndices = sortListingIndices(
    input.listings,
    input.origins,
    input.sort,
    page.metric,
    (li, oid) => input.getRoute(li, oid, page.transportMode)
  )

  const blocks: Content[] = []
  if (!isFirst) {
    blocks.push({ text: "", pageBreak: "before" })
  }
  blocks.push(buildHeader(input.generatedAt, input.locale, page))
  blocks.push(buildAccentRule(landscape))
  blocks.push(buildMetaStrip(input.origins, page))
  blocks.push(
    input.listings.length === 0
      ? buildEmptyState()
      : buildTable(input.listings, input.origins, page, input.getRoute, sortedIndices)
  )
  return blocks
}

export const buildListingsReport = (input: BuildReportInput): TDocumentDefinitions => {
  const landscape = input.origins.length > 2
  const pages =
    input.pages.length > 0
      ? input.pages
      : [
          {
            transportMode: "driving" as TransportMode,
            metric: "duration" as MatrixDisplayMetric,
          },
        ]

  const content: Content[] = pages.flatMap((page, i) =>
    buildPageContent(input, page, landscape, i === 0)
  )

  return {
    pageSize: "A4",
    pageOrientation: landscape ? "landscape" : "portrait",
    pageMargins: [56, 48, 56, 56],
    defaultStyle: {
      font: PDF_THEME.font.family,
      color: PDF_THEME.color.foreground,
    },
    background: () => ({
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: landscape ? 842 : 595,
          h: landscape ? 595 : 842,
          color: PDF_THEME.color.background,
        },
      ],
    }),
    content,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "Generated by Stay Distance  ·  Routes © OpenStreetMap contributors",
          fontSize: PDF_THEME.size.footer,
          color: PDF_THEME.color.muted,
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: PDF_THEME.size.footer,
          color: PDF_THEME.color.muted,
          alignment: "right",
        },
      ],
      margin: [56, 16, 56, 0],
    }),
    info: {
      title: "Stay Distance — Saved listings",
      creator: "Stay Distance",
      producer: "Stay Distance",
    },
  }
}

export const reportFileName = (date: Date): string => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `stay-distance-${yyyy}-${mm}-${dd}.pdf`
}

export const TRANSPORT_MODES_ORDER: readonly TransportMode[] = [
  "driving",
  "cycling",
  "walking",
]

export const METRIC_MODES_ORDER: readonly MatrixDisplayMetric[] = ["duration", "distance"]

export const buildAllPagesOrdered = (current: PageConfig): PageConfig[] => {
  const all: PageConfig[] = []
  for (const transportMode of TRANSPORT_MODES_ORDER) {
    for (const metric of METRIC_MODES_ORDER) {
      all.push({ transportMode, metric })
    }
  }
  const isCurrent = (p: PageConfig) =>
    p.transportMode === current.transportMode && p.metric === current.metric
  const currentPage = all.find(isCurrent) ?? current
  const rest = all.filter((p) => !isCurrent(p))
  return [currentPage, ...rest]
}
