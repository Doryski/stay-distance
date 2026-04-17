import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { resolveAdapter } from "../platforms/registry"
import { observeDom } from "./observer"
import { mountInShadow, unmount, type MountedRoot } from "./mount"
import { ListingOverlay } from "./ListingOverlay"

const ATTR_MOUNTED = "data-stay-distance-mounted"
const queryClient = new QueryClient()

const adapter = resolveAdapter(new URL(window.location.href))
if (!adapter) {
  console.debug("[stay-distance] no adapter for", window.location.href)
} else {
  const mounts = new WeakMap<HTMLElement, MountedRoot>()

  const scan = () => {
    const elements = adapter.detectListings(document.body)
    for (const el of elements) {
      if (el.hasAttribute(ATTR_MOUNTED)) continue
      const listing = adapter.extractListing(el)
      if (!listing) continue

      el.setAttribute(ATTR_MOUNTED, "1")
      const anchor = adapter.getInjectionPoint(el)
      const mounted = mountInShadow(
        anchor,
        <QueryClientProvider client={queryClient}>
          <ListingOverlay listing={listing} />
        </QueryClientProvider>,
        "beforeend"
      )
      mounts.set(el, mounted)
    }
  }

  const stop = observeDom({ onMutations: scan })
  scan()

  window.addEventListener("beforeunload", () => {
    stop()
    // Best-effort cleanup; Chrome will GC the shadow roots anyway.
    for (const el of document.querySelectorAll<HTMLElement>(`[${ATTR_MOUNTED}]`)) {
      const m = mounts.get(el)
      if (m) unmount(m)
    }
  })
}
