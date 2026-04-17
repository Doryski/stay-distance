import { MESSAGE_KIND, type Envelope, type Request } from "../core/messaging/protocol"
import { resolveGeocode, resolveListingCoords, resolveRoute } from "./api-proxy"
import { clearCaches } from "../core/storage/cache"
import { runInstallMigrations } from "./install"
import { initSidePanelScope } from "./sidepanel-scope"

const handle = async (req: Request): Promise<unknown> => {
  switch (req.kind) {
    case MESSAGE_KIND.geocode:
      return { coords: await resolveGeocode(req.address) }
    case MESSAGE_KIND.route:
      return { result: await resolveRoute(req.from, req.to, req.mode) }
    case MESSAGE_KIND.resolveListingCoords:
      return {
        coords: await resolveListingCoords({
          ...(req.coords ? { coords: req.coords } : {}),
          ...(req.address ? { address: req.address } : {}),
        }),
      }
    case MESSAGE_KIND.clearCaches:
      await clearCaches()
      return { ok: true }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  runInstallMigrations().catch((err) => console.error("[stay-distance] install", err))
})

chrome.runtime.onMessage.addListener((req: Request, sender, sendResponse) => {
  // Only accept messages originating from this extension's own pages and
  // content scripts. Prevents external webpages (which can address the
  // extension via its public ID) from triggering Nominatim/OSRM calls or
  // poisoning the geocode cache with attacker-chosen coordinates.
  if (sender.id !== chrome.runtime.id) return false
  handle(req).then(
    (data) => sendResponse({ ok: true, data } satisfies Envelope<unknown>),
    (err: unknown) =>
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      } satisfies Envelope<unknown>)
  )
  return true // async response
})

// Allow opening the side panel by clicking the action icon.
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => undefined)

// Restrict the side panel to platforms we support (booking.com, etc.).
initSidePanelScope()
