import { describe, it, expect, beforeEach } from "vitest"
import { bookingAdapter, PLATFORM_ID } from "../../src/platforms/booking/adapter"
import {
  matchBookingUrl,
  isListPage,
  isDetailPage,
} from "../../src/platforms/booking/routes"
import { resolveAdapter, listAdapters } from "../../src/platforms/registry"
import { BOOKING_SELECTORS } from "../../src/platforms/booking/selectors"

describe("booking routes", () => {
  it("matches booking.com hostnames", () => {
    expect(matchBookingUrl(new URL("https://www.booking.com/"))).toBe(true)
    expect(matchBookingUrl(new URL("https://secure.booking.com/"))).toBe(true)
    expect(matchBookingUrl(new URL("https://booking.com/"))).toBe(true)
  })

  it("rejects lookalike hostnames", () => {
    expect(matchBookingUrl(new URL("https://not-booking.com/"))).toBe(false)
    expect(matchBookingUrl(new URL("https://booking.com.evil.io/"))).toBe(false)
    expect(matchBookingUrl(new URL("https://airbnb.com/"))).toBe(false)
  })

  it("detects list vs detail page", () => {
    expect(isListPage(new URL("https://www.booking.com/searchresults.html?x=1"))).toBe(
      true
    )
    expect(isListPage(new URL("https://www.booking.com/hotel/pl/foo.html"))).toBe(false)
    expect(isDetailPage(new URL("https://www.booking.com/hotel/pl/foo.html"))).toBe(true)
    expect(isDetailPage(new URL("https://www.booking.com/searchresults.html"))).toBe(
      false
    )
  })
})

describe("platform registry", () => {
  it("resolves booking adapter for booking URLs", () => {
    const adapter = resolveAdapter(new URL("https://www.booking.com/searchresults.html"))
    expect(adapter).toBe(bookingAdapter)
    expect(adapter?.id).toBe(PLATFORM_ID)
  })

  it("returns null for unsupported platforms", () => {
    expect(resolveAdapter(new URL("https://www.example.com/"))).toBeNull()
  })

  it("exposes the adapter list", () => {
    expect(listAdapters()).toContain(bookingAdapter)
  })
})

type CardInit = {
  slug: string
  titleText?: string
  addressText?: string
  thumbnailUrl?: string
  latlngAttr?: string
  includeAnchor?: boolean
}

const createCard = ({
  slug,
  titleText,
  addressText,
  thumbnailUrl,
  latlngAttr,
  includeAnchor = true,
}: CardInit): HTMLElement => {
  const card = document.createElement("div")
  card.setAttribute("data-testid", "property-card")

  const link = document.createElement("a")
  link.setAttribute("data-testid", "title-link")
  link.href = `https://www.booking.com/hotel/nl/${slug}.html?checkin=2026-05-10`

  const title = document.createElement("div")
  title.setAttribute("data-testid", "title")
  title.textContent = titleText ?? `Hotel ${slug}`
  link.appendChild(title)

  card.appendChild(link)

  if (addressText) {
    const addr = document.createElement("span")
    addr.setAttribute("data-testid", "address-link")
    addr.textContent = addressText
    card.appendChild(addr)
  }

  if (thumbnailUrl) {
    const img = document.createElement("img")
    img.setAttribute("data-testid", "image")
    img.src = thumbnailUrl
    card.appendChild(img)
  }

  if (latlngAttr) {
    const marker = document.createElement("div")
    marker.setAttribute("data-atlas-latlng", latlngAttr)
    card.appendChild(marker)
  }

  if (includeAnchor) {
    const anchor = document.createElement("div")
    anchor.setAttribute("data-testid", "price-and-discounted-price")
    card.appendChild(anchor)
  }
  return card
}

const installApolloBlob = (
  entries: Array<{ slug: string; lat: number; lon: number }>
) => {
  const store = {
    ROOT_QUERY: {
      searchResults: entries.map((e, i) => ({ __ref: `Property:${i}` })),
    },
    ...Object.fromEntries(
      entries.map((e, i) => [
        `Property:${i}`,
        {
          basicPropertyData: {
            pageName: e.slug,
            location: { latitude: e.lat, longitude: e.lon },
          },
        },
      ])
    ),
  }
  const script = document.createElement("script")
  script.setAttribute("type", "application/json")
  script.setAttribute("data-capla-store-data", "apollo")
  script.textContent = JSON.stringify(store)
  document.head.appendChild(script)
}

describe("booking adapter DOM integration", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""
  })

  it("detects property cards in the DOM", () => {
    for (let i = 0; i < 3; i++) {
      document.body.appendChild(createCard({ slug: `hotel-${i}` }))
    }
    expect(bookingAdapter.detectListings(document).length).toBe(3)
  })

  it("returns no cards when the page has none", () => {
    document.body.innerHTML = "<div>no cards here</div>"
    expect(bookingAdapter.detectListings(document)).toEqual([])
  })

  it("extractListing returns a full listing with slug id, title, address, thumbnail", () => {
    document.body.appendChild(
      createCard({
        slug: "zeedijk",
        titleText: "Hotel Zeedijk City Centre",
        addressText: "Centrum Amsterdamu, Amsterdam",
        thumbnailUrl: "https://cf.bstatic.com/x.jpg",
      })
    )
    const [card] = bookingAdapter.detectListings(document)
    const listing = bookingAdapter.extractListing(card!)
    expect(listing).toEqual({
      platformId: "booking",
      externalId: "zeedijk",
      title: "Hotel Zeedijk City Centre",
      url: expect.stringContaining("/hotel/nl/zeedijk.html"),
      thumbnailUrl: "https://cf.bstatic.com/x.jpg",
      address: "Centrum Amsterdamu, Amsterdam",
    })
  })

  it("resolves coords from the Apollo cache by page slug", () => {
    installApolloBlob([{ slug: "zeedijk", lat: 52.3759964, lon: 4.9002052 }])
    document.body.appendChild(createCard({ slug: "zeedijk" }))
    const [card] = bookingAdapter.detectListings(document)
    const listing = bookingAdapter.extractListing(card!)
    expect(listing?.coords).toEqual({ lat: 52.3759964, lon: 4.9002052 })
  })

  it("prefers inline data-atlas-latlng over Apollo lookup", () => {
    installApolloBlob([{ slug: "zeedijk", lat: 1, lon: 2 }])
    document.body.appendChild(createCard({ slug: "zeedijk", latlngAttr: "10.5,20.25" }))
    const [card] = bookingAdapter.detectListings(document)
    expect(bookingAdapter.extractListing(card!)?.coords).toEqual({
      lat: 10.5,
      lon: 20.25,
    })
  })

  it("returns null when the slug is missing", () => {
    const card = document.createElement("div")
    card.setAttribute("data-testid", "property-card")
    const title = document.createElement("div")
    title.setAttribute("data-testid", "title")
    title.textContent = "Some hotel"
    card.appendChild(title)
    document.body.appendChild(card)
    const [detected] = bookingAdapter.detectListings(document)
    expect(bookingAdapter.extractListing(detected!)).toBeNull()
  })

  it("tolerates malformed Apollo JSON", () => {
    const script = document.createElement("script")
    script.setAttribute("type", "application/json")
    script.setAttribute("data-capla-store-data", "apollo")
    script.textContent = "{not json"
    document.head.appendChild(script)

    document.body.appendChild(createCard({ slug: "zeedijk" }))
    const [card] = bookingAdapter.detectListings(document)
    expect(bookingAdapter.extractListing(card!)?.coords).toBeUndefined()
  })

  it("getInjectionPoint returns the property card itself so the overlay renders below the image", () => {
    document.body.appendChild(createCard({ slug: "x" }))
    const [card] = bookingAdapter.detectListings(document)
    expect(bookingAdapter.getInjectionPoint(card!)).toBe(card)
  })

  it("getInjectionPoint falls back to the card when the anchor is missing", () => {
    document.body.appendChild(createCard({ slug: "x", includeAnchor: false }))
    const [card] = bookingAdapter.detectListings(document)
    expect(bookingAdapter.getInjectionPoint(card!)).toBe(card)
  })

  it("exposes a stable selector contract", () => {
    expect(BOOKING_SELECTORS.listCard).toMatch(/property-card/)
    expect(BOOKING_SELECTORS.titleInCard).toMatch(/title/)
    expect(BOOKING_SELECTORS.apolloStore).toMatch(/apollo/)
  })
})

describe("booking adapter detail page", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""
  })

  const installDetailPage = () => {
    // jsdom exposes window.location.pathname — navigate via history
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")

    const latEl = document.createElement("div")
    latEl.setAttribute("data-atlas-latlng", "52.3759964,4.9002052")
    document.body.appendChild(latEl)

    const ld = document.createElement("script")
    ld.setAttribute("type", "application/ld+json")
    ld.textContent = JSON.stringify({
      "@type": "Hotel",
      name: "Hotel Zeedijk City Centre",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Zeedijk 6, 1012 AX Amsterdam, Netherlands",
      },
      image: "https://cf.bstatic.com/hotel.jpg",
    })
    document.head.appendChild(ld)
  }

  it("returns null when the URL is not a detail page", () => {
    window.history.replaceState({}, "", "/searchresults.html?ss=Amsterdam")
    expect(bookingAdapter.getDetailPageListing?.()).toBeNull()
  })

  it("extracts title, coords, address and thumbnail from detail page DOM", () => {
    installDetailPage()
    expect(bookingAdapter.getDetailPageListing?.()).toEqual({
      platformId: "booking",
      externalId: "zeedijk",
      title: "Hotel Zeedijk City Centre",
      url: expect.stringContaining("/hotel/nl/zeedijk.html"),
      thumbnailUrl: "https://cf.bstatic.com/hotel.jpg",
      coords: { lat: 52.3759964, lon: 4.9002052 },
      address: "Zeedijk 6, 1012 AX Amsterdam, Netherlands",
    })
  })

  it("falls back to DOM title when JSON-LD is missing", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const h = document.createElement("h2")
    h.className = "pp-header__title"
    h.textContent = "  Hotel Zeedijk City Centre  "
    document.body.appendChild(h)
    expect(bookingAdapter.getDetailPageListing?.()?.title).toBe(
      "Hotel Zeedijk City Centre"
    )
  })

  it("returns null when the detail page has no title at all", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    expect(bookingAdapter.getDetailPageListing?.()).toBeNull()
  })

  it("returns null when the URL has no parseable slug", () => {
    window.history.replaceState({}, "", "/hotel//.html")
    const ld = document.createElement("script")
    ld.setAttribute("type", "application/ld+json")
    ld.textContent = JSON.stringify({ "@type": "Hotel", name: "Ghost" })
    document.head.appendChild(ld)
    expect(bookingAdapter.getDetailPageListing?.()).toBeNull()
  })

  it("reads thumbnail from a JSON-LD image array", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const ld = document.createElement("script")
    ld.setAttribute("type", "application/ld+json")
    ld.textContent = JSON.stringify({
      "@type": "Hotel",
      name: "Z",
      image: ["https://cf.bstatic.com/first.jpg", "https://cf.bstatic.com/second.jpg"],
    })
    document.head.appendChild(ld)
    expect(bookingAdapter.getDetailPageListing?.()?.thumbnailUrl).toBe(
      "https://cf.bstatic.com/first.jpg"
    )
  })

  it("reads address when JSON-LD provides it as a plain string", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const ld = document.createElement("script")
    ld.setAttribute("type", "application/ld+json")
    ld.textContent = JSON.stringify({
      "@type": "Hotel",
      name: "Z",
      address: "Zeedijk 6, Amsterdam",
    })
    document.head.appendChild(ld)
    expect(bookingAdapter.getDetailPageListing?.()?.address).toBe("Zeedijk 6, Amsterdam")
  })

  it("picks the Hotel entry from a JSON-LD @graph array", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const ld = document.createElement("script")
    ld.setAttribute("type", "application/ld+json")
    ld.textContent = JSON.stringify([
      { "@type": "BreadcrumbList", itemListElement: [] },
      { "@type": "LodgingBusiness", name: "Lodge Zeedijk" },
    ])
    document.head.appendChild(ld)
    expect(bookingAdapter.getDetailPageListing?.()?.title).toBe("Lodge Zeedijk")
  })

  it("skips empty JSON-LD scripts and continues to the next", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const empty = document.createElement("script")
    empty.setAttribute("type", "application/ld+json")
    empty.textContent = ""
    document.head.appendChild(empty)
    const good = document.createElement("script")
    good.setAttribute("type", "application/ld+json")
    good.textContent = JSON.stringify({ "@type": "Hotel", name: "Zeedijk" })
    document.head.appendChild(good)
    expect(bookingAdapter.getDetailPageListing?.()?.title).toBe("Zeedijk")
  })

  it("skips malformed JSON-LD blocks without crashing", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const bad = document.createElement("script")
    bad.setAttribute("type", "application/ld+json")
    bad.textContent = "{ not json"
    document.head.appendChild(bad)
    const h = document.createElement("h2")
    h.className = "pp-header__title"
    h.textContent = "Zeedijk"
    document.body.appendChild(h)
    expect(bookingAdapter.getDetailPageListing?.()?.title).toBe("Zeedijk")
  })

  it("returns null coords when detail latlng attribute is malformed", () => {
    window.history.replaceState({}, "", "/hotel/nl/zeedijk.html")
    const broken = document.createElement("div")
    broken.setAttribute("data-atlas-latlng", "abc,def")
    document.body.appendChild(broken)
    const ld = document.createElement("script")
    ld.setAttribute("type", "application/ld+json")
    ld.textContent = JSON.stringify({ "@type": "Hotel", name: "Z" })
    document.head.appendChild(ld)
    expect(bookingAdapter.getDetailPageListing?.()?.coords).toBeUndefined()
  })
})

describe("booking adapter extractListing edge cases", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""
  })

  it("returns null when the card has a slug but no title", () => {
    const card = document.createElement("div")
    card.setAttribute("data-testid", "property-card")
    const link = document.createElement("a")
    link.setAttribute("data-testid", "title-link")
    link.href = "https://www.booking.com/hotel/nl/no-title.html"
    card.appendChild(link)
    document.body.appendChild(card)
    expect(bookingAdapter.extractListing(card)).toBeNull()
  })

  it("returns null when the card has no link", () => {
    const card = document.createElement("div")
    card.setAttribute("data-testid", "property-card")
    const t = document.createElement("div")
    t.setAttribute("data-testid", "title")
    t.textContent = "Orphan"
    card.appendChild(t)
    document.body.appendChild(card)
    expect(bookingAdapter.extractListing(card)).toBeNull()
  })

  it("treats whitespace-only address as missing", () => {
    const card = createCard({
      slug: "whitespace",
      addressText: "   \n  ",
    })
    document.body.appendChild(card)
    const listing = bookingAdapter.extractListing(card)
    expect(listing?.address).toBeUndefined()
  })

  it("falls back to Apollo coords when inline data-atlas-latlng is malformed", () => {
    installApolloBlob([{ slug: "zeedijk", lat: 1.1, lon: 2.2 }])
    const card = createCard({ slug: "zeedijk", latlngAttr: "not,numbers" })
    document.body.appendChild(card)
    expect(bookingAdapter.extractListing(card)?.coords).toEqual({ lat: 1.1, lon: 2.2 })
  })

  it("skips Apollo entries where coords are not numeric", () => {
    const store = {
      "Entry:1": {
        basicPropertyData: {
          pageName: "bad-coords",
          location: { latitude: "52.3" as unknown as number, longitude: 4.9 },
        },
      },
    }
    const script = document.createElement("script")
    script.setAttribute("type", "application/json")
    script.setAttribute("data-capla-store-data", "apollo")
    script.textContent = JSON.stringify(store)
    document.head.appendChild(script)

    const card = createCard({ slug: "bad-coords" })
    document.body.appendChild(card)
    expect(bookingAdapter.extractListing(card)?.coords).toBeUndefined()
  })

  it("walks nested arrays and nulls in the Apollo tree without crashing", () => {
    const store = {
      ROOT_QUERY: {
        list: [
          null,
          [
            null,
            {
              basicPropertyData: {
                pageName: "deep-hotel",
                location: { latitude: 10, longitude: 20 },
              },
            },
          ],
        ],
      },
    }
    const script = document.createElement("script")
    script.setAttribute("type", "application/json")
    script.setAttribute("data-capla-store-data", "apollo")
    script.textContent = JSON.stringify(store)
    document.head.appendChild(script)

    const card = createCard({ slug: "deep-hotel" })
    document.body.appendChild(card)
    expect(bookingAdapter.extractListing(card)?.coords).toEqual({ lat: 10, lon: 20 })
  })

  it("treats an empty Apollo script as no coords", () => {
    const script = document.createElement("script")
    script.setAttribute("type", "application/json")
    script.setAttribute("data-capla-store-data", "apollo")
    script.textContent = ""
    document.head.appendChild(script)

    const card = createCard({ slug: "no-data" })
    document.body.appendChild(card)
    expect(bookingAdapter.extractListing(card)?.coords).toBeUndefined()
  })
})
