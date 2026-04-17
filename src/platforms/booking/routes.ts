export const matchBookingUrl = (url: URL): boolean =>
  /(^|\.)booking\.com$/i.test(url.hostname)

export const isListPage = (url: URL): boolean => url.pathname.startsWith("/searchresults")

export const isDetailPage = (url: URL): boolean => url.pathname.startsWith("/hotel/")
