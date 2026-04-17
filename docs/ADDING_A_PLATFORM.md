# Adding a platform

Adding a new site (e.g. airbnb.com) is a four-step drill:

1. Create `src/platforms/<name>/`.
2. Implement `PlatformAdapter` (see `src/platforms/adapter.ts`).
3. Register it in `src/platforms/registry.ts`.
4. Add the host to `content_scripts.matches` and `host_permissions` in `public/manifest.json`.

## The adapter contract

```ts
type PlatformAdapter = {
  id: string // "booking" | "airbnb" | ...
  matchUrl: (url: URL) => boolean // activate on these URLs
  detectListings: (root: ParentNode) => HTMLElement[]
  extractListing: (el: HTMLElement) => ExtractedListing | null
  getInjectionPoint: (el: HTMLElement) => HTMLElement
  getDetailPageListing?: () => ExtractedListing | null
}
```

Where `ExtractedListing` is:

```ts
type ExtractedListing = {
  platformId: string
  externalId: string // stable per-platform ID (URL slug, data-id, etc.)
  title: string
  url: string
  thumbnailUrl?: string
  coords?: { lat: number; lon: number } // preferred — found in DOM/JSON
  address?: string // fallback — geocoded via Nominatim
}
```

## Suggested folder layout

```
src/platforms/<name>/
├── adapter.ts       — implements PlatformAdapter (this file is the public entry)
├── selectors.ts     — CSS selectors; keep them in one file for quick patching
├── extractors.ts    — coord/address/id extraction (DOM → JSON-LD → data-* → text)
└── routes.ts        — matchUrl + list-vs-detail helpers
```

## Tips

- **Prefer coords over address.** Hitting Nominatim for every listing is slow (1 req/s) and antisocial. Most sites embed coords in JSON-LD, `data-*`, or a bootstrap object on `window`.
- **Stable `externalId`** is critical for deduplication across sessions. Use the URL slug or a data attribute that survives A/B tests.
- **`getInjectionPoint` should be inside the card**, not the card itself, so our React tree doesn't accidentally become a click target the site overrides.
- **HTML fixtures in tests.** Save a real search-results page as `tests/platforms/<name>/fixtures/search.html` and assert `detectListings` + `extractListing` against it. This is how we catch DOM regressions.
- **Shadow DOM styling is isolated**, but CSS custom properties defined on the host page _do_ pierce the boundary. Don't rely on inherited variables.

## Review checklist before merging a new platform

- [ ] `matchUrl` is restrictive (no false positives on unrelated sites on the same domain).
- [ ] `detectListings` tested against a fixture.
- [ ] `extractListing` returns `null` (not a partial object) when mandatory fields are missing.
- [ ] `externalId` is stable (verified on two different sessions).
- [ ] Selector file contains _only_ selectors — no logic.
- [ ] `host_permissions` updated; `content_scripts.matches` added.
