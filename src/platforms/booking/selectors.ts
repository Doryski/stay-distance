export const BOOKING_SELECTORS = {
  listCard: '[data-testid="property-card"]',
  detailRoot: "#basiclayout, #hp_hotel_name",
  titleInCard: '[data-testid="title"]',
  linkInCard: 'a[data-testid="title-link"]',
  thumbnailInCard: 'img[data-testid="image"]',
  addressInCard: '[data-testid="address"], [data-testid="address-link"]',
  injectionAnchor: '[data-testid="property-card"]',
  detailLatLng: "[data-atlas-latlng]",
  detailTitle: '[data-testid="property-header"], #hp_hotel_name, h2.pp-header__title',
  apolloStore: 'script[data-capla-store-data="apollo"]',
  jsonLd: 'script[type="application/ld+json"]',
} as const

export const DETAIL_LAT_LNG_ATTR = "data-atlas-latlng"

// slug extraction: /hotel/<country>/<slug>.<lang>.html  →  <slug>
export const HOTEL_SLUG_REGEX = /\/hotel\/[^/]+\/([^./]+)/i
