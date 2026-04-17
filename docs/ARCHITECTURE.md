# Architecture

## Goals

- **Platform-agnostic core**, thin **platform adapters** — adding Airbnb = one folder, zero changes in core.
- **Privacy-first**: local-only data (`chrome.storage.local`), no telemetry, free public APIs.
- **Resilient injection**: DOM injection via Shadow DOM (booking.com can't leak styles into our UI); selectors isolated so DOM churn is cheap to patch.

## Layers

```
src/
├── core/        — platform-agnostic (services, storage, messaging, UI, hooks, utils, types)
├── platforms/   — one folder per site (adapter + selectors + extractors + routes)
├── content/     — content script: picks adapter, scans DOM, mounts React in Shadow DOM
├── background/  — MV3 service worker: API proxy, install/migrations
├── popup/       — toolbar popup (active origin, transport, toggle inline badge)
└── sidepanel/   — Chrome Side Panel: origins, saved listings, settings
```

## Data flow

1. Content script loads on `matches` URLs, asks `platforms/registry` for the right adapter.
2. Adapter walks the DOM, extracts `ExtractedListing` objects (prefers coords from DOM/JSON, falls back to address text).
3. `MutationObserver` + `history.pushState` hook catch SPA navigation and lazy-loaded listings.
4. For each listing: React component is mounted in Shadow DOM next to the adapter-defined anchor.
5. UI calls hooks (`useListingCoords`, `useRoute`) which `sendMessage` to the background.
6. Background service worker resolves via `core/services` (Nominatim/OSRM), writing results to `chrome.storage.local` caches.

## Storage layout

Keys are under the `sd:` prefix.

| Key                | Shape                         | Notes                             |
| ------------------ | ----------------------------- | --------------------------------- |
| `sd:version`       | `number`                      | migration version                 |
| `sd:origins`       | `Origin[]`                    | user places                       |
| `sd:savedListings` | `SavedListing[]`              | explicitly saved listings         |
| `sd:settings`      | `Settings`                    | active origin, transport, toggles |
| `sd:cache:geocode` | `Record<string, Coords>`      | Nominatim cache                   |
| `sd:cache:route`   | `Record<string, RouteResult>` | OSRM cache (keyed by mode+coords) |

All reads/writes go through zod schemas (`core/storage/schema.ts`) — corrupted data falls back to defaults rather than crashing the extension.

## Rate limiting

Nominatim fair-use policy requires ≤1 req/s per app. `core/services/rate-limiter.ts` enforces this as a serial queue inside the service worker (single point of truth). OSRM public instance has looser fair-use; no hard limit enforced, but cache-first.

## Extensibility

`PlatformAdapter` (see `src/platforms/adapter.ts`) is the only contract a new platform must fulfil. See [`ADDING_A_PLATFORM.md`](./ADDING_A_PLATFORM.md).
