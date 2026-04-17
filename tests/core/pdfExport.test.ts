import { describe, expect, it } from "vitest"
import {
  buildAllPagesOrdered,
  buildListingsReport,
  reportFileName,
  type PageConfig,
  type RouteLookup,
} from "../../src/core/services/pdfExport/buildReport"
import { PDF_THEME } from "../../src/core/services/pdfExport/theme"
import { DEFAULT_MATRIX_SORT, type MatrixSort } from "../../src/core/storage/schema"
import type {
  Origin,
  RouteResult,
  SavedListing,
  TransportMode,
} from "../../src/core/types"

const origin = (id: string, label: string): Origin => ({
  id,
  label,
  address: `${label} address`,
  coords: { lat: 0, lon: 0 },
  createdAt: 0,
})

const listing = (n: number, address?: string, title?: string): SavedListing => ({
  platformId: "booking",
  externalId: `id-${n}`,
  title: title ?? `Listing ${n}`,
  url: `https://www.booking.com/hotel/${n}.html`,
  address,
  savedAt: 0,
})

const route = (min: number, km: number): RouteResult => ({
  durationMinutes: min,
  distanceKm: km,
})

const generatedAt = new Date("2026-04-18T12:00:00Z")

const SINGLE_PAGE: PageConfig[] = [{ transportMode: "driving", metric: "duration" }]

const constantRoute =
  (r: RouteResult | null): RouteLookup =>
  () =>
    r

const findTable = (def: ReturnType<typeof buildListingsReport>) => {
  const tables = (def.content as ReadonlyArray<unknown>).filter(
    (c): c is { table: { body: unknown[][] } } =>
      typeof c === "object" && c !== null && "table" in c
  )
  return tables
}

const tableBody = (def: ReturnType<typeof buildListingsReport>, pageIndex = 0) => {
  const tables = findTable(def)
  if (!tables[pageIndex]) throw new Error(`no table at page ${pageIndex}`)
  return tables[pageIndex].table.body
}

describe("buildListingsReport", () => {
  it("uses A4 portrait when origins <= 2", () => {
    const def = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home")],
      getRoute: constantRoute(null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    expect(def.pageOrientation).toBe("portrait")
    expect(def.pageSize).toBe("A4")
  })

  it("switches to landscape when origins > 2", () => {
    const def = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home"), origin("b", "Office"), origin("c", "Parents")],
      getRoute: constantRoute(null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    expect(def.pageOrientation).toBe("landscape")
  })

  it("includes Listing + Address + per-origin + Total columns when origins exist", () => {
    const def = buildListingsReport({
      listings: [listing(1, "Main St 1")],
      origins: [origin("a", "Home"), origin("b", "Office")],
      getRoute: constantRoute(route(30, 12)),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const body = tableBody(def)
    expect(body[0]).toHaveLength(2 + 2 + 1)
    expect(body[1]).toHaveLength(2 + 2 + 1)
  })

  it("omits Total column when no origins are selected", () => {
    const def = buildListingsReport({
      listings: [listing(1, "Main St 1")],
      origins: [],
      getRoute: constantRoute(null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const body = tableBody(def)
    expect(body[0]).toHaveLength(2)
  })

  it("renders the listing title cell as a clickable link with brand color", () => {
    const def = buildListingsReport({
      listings: [listing(7)],
      origins: [],
      getRoute: constantRoute(null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const titleCell = tableBody(def)[1]?.[0] as {
      text: string
      link: string
      color: string
    }
    expect(titleCell.text).toBe("Listing 7")
    expect(titleCell.link).toBe("https://www.booking.com/hotel/7.html")
    expect(titleCell.color).toBe(PDF_THEME.color.primary)
  })

  it("computes the Total only when every origin has a resolved route", () => {
    const partial = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home"), origin("b", "Office")],
      getRoute: (_li, oid) => (oid === "a" ? route(10, 4) : null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const partialTotal = tableBody(partial)[1]?.[4] as { text: string }
    expect(partialTotal.text).toBe("—")

    const full = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home"), origin("b", "Office")],
      getRoute: (_li, oid) => (oid === "a" ? route(10, 4) : route(20, 8)),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const fullTotal = tableBody(full)[1]?.[4] as { text: string }
    expect(fullTotal.text).toBe("30min")
  })

  it("formats cells with the chosen metric", () => {
    const def = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home")],
      getRoute: constantRoute(route(75, 42)),
      pages: [{ transportMode: "driving", metric: "distance" }],
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const cell = tableBody(def)[1]?.[2] as { text: string }
    expect(cell.text).toBe("42 km")
  })

  it("renders an empty-state message when there are no listings", () => {
    const def = buildListingsReport({
      listings: [],
      origins: [origin("a", "Home")],
      getRoute: constantRoute(null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const empty = (def.content as ReadonlyArray<unknown>).find(
      (c): c is { text: string } =>
        typeof c === "object" &&
        c !== null &&
        "text" in c &&
        typeof (c as { text: unknown }).text === "string" &&
        (c as { text: string }).text.toLowerCase().includes("no saved listings")
    )
    expect(empty).toBeDefined()
  })

  it("emits one table per page config", () => {
    const def = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home")],
      getRoute: constantRoute(route(10, 4)),
      pages: [
        { transportMode: "driving", metric: "duration" },
        { transportMode: "cycling", metric: "duration" },
        { transportMode: "walking", metric: "distance" },
      ],
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    expect(findTable(def)).toHaveLength(3)
  })

  it("looks up routes per page's transport mode", () => {
    const lookups: TransportMode[] = []
    const def = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home")],
      getRoute: (_li, _oid, mode) => {
        lookups.push(mode)
        return route(mode === "driving" ? 10 : mode === "cycling" ? 30 : 60, 5)
      },
      pages: [
        { transportMode: "driving", metric: "duration" },
        { transportMode: "cycling", metric: "duration" },
        { transportMode: "walking", metric: "duration" },
      ],
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    expect(new Set(lookups)).toEqual(new Set(["driving", "cycling", "walking"]))
    const drivingCell = tableBody(def, 0)[1]?.[2] as { text: string }
    const cyclingCell = tableBody(def, 1)[1]?.[2] as { text: string }
    const walkingCell = tableBody(def, 2)[1]?.[2] as { text: string }
    expect(drivingCell.text).toBe("10min")
    expect(cyclingCell.text).toBe("30min")
    expect(walkingCell.text).toBe("1h 0min")
  })

  it("applies the supplied matrix sort across every page", () => {
    const listings = [
      listing(1, undefined, "Charlie"),
      listing(2, undefined, "Alpha"),
      listing(3, undefined, "Bravo"),
    ]
    const sortDesc: MatrixSort = { key: { kind: "title" }, dir: "desc" }
    const def = buildListingsReport({
      listings,
      origins: [],
      getRoute: constantRoute(null),
      pages: [
        { transportMode: "driving", metric: "duration" },
        { transportMode: "cycling", metric: "duration" },
      ],
      sort: sortDesc,
      generatedAt,
    })
    const titlesAt = (pageIndex: number) =>
      tableBody(def, pageIndex)
        .slice(1)
        .map((row) => (row[0] as { text: string }).text)
    expect(titlesAt(0)).toEqual(["Charlie", "Bravo", "Alpha"])
    expect(titlesAt(1)).toEqual(["Charlie", "Bravo", "Alpha"])
  })

  it("sorts by an origin column using that page's metric", () => {
    const listings = [listing(1, undefined, "Slow"), listing(2, undefined, "Fast")]
    const routes: Record<string, RouteResult> = {
      "0:driving": route(60, 30),
      "1:driving": route(20, 10),
      "0:cycling": route(120, 30),
      "1:cycling": route(40, 10),
    }
    const def = buildListingsReport({
      listings,
      origins: [origin("a", "Home")],
      getRoute: (li, _oid, mode) => routes[`${li}:${mode}`] ?? null,
      pages: [
        { transportMode: "driving", metric: "duration" },
        { transportMode: "cycling", metric: "duration" },
      ],
      sort: { key: { kind: "origin", id: "a" }, dir: "asc" },
      generatedAt,
    })
    const titlesAt = (pageIndex: number) =>
      tableBody(def, pageIndex)
        .slice(1)
        .map((row) => (row[0] as { text: string }).text)
    expect(titlesAt(0)).toEqual(["Fast", "Slow"])
    expect(titlesAt(1)).toEqual(["Fast", "Slow"])
  })
})

describe("origins meta block", () => {
  it("lists each origin's label and address", () => {
    const def = buildListingsReport({
      listings: [listing(1)],
      origins: [origin("a", "Home"), origin("b", "Office")],
      getRoute: constantRoute(null),
      pages: SINGLE_PAGE,
      sort: DEFAULT_MATRIX_SORT,
      generatedAt,
    })
    const flat = JSON.stringify(def.content)
    expect(flat).toContain("Home")
    expect(flat).toContain("Home address")
    expect(flat).toContain("Office")
    expect(flat).toContain("Office address")
  })
})

describe("buildAllPagesOrdered", () => {
  it("returns six combinations with the current selection first", () => {
    const pages = buildAllPagesOrdered({ transportMode: "cycling", metric: "distance" })
    expect(pages).toHaveLength(6)
    expect(pages[0]).toEqual({ transportMode: "cycling", metric: "distance" })
    const rest = pages.slice(1)
    const isCurrent = (p: PageConfig) =>
      p.transportMode === "cycling" && p.metric === "distance"
    expect(rest.some(isCurrent)).toBe(false)
    const set = new Set(pages.map((p) => `${p.transportMode}:${p.metric}`))
    expect(set.size).toBe(6)
  })

  it("places the default selection first when current is driving+duration", () => {
    const pages = buildAllPagesOrdered({ transportMode: "driving", metric: "duration" })
    expect(pages[0]).toEqual({ transportMode: "driving", metric: "duration" })
  })
})

describe("reportFileName", () => {
  it("formats the date as YYYY-MM-DD", () => {
    const name = reportFileName(new Date(2026, 3, 18))
    expect(name).toBe("stay-distance-2026-04-18.pdf")
  })
})
