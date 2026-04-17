# Privacy

## What stays on your device

All user data lives in `chrome.storage.local`:

- your **origins** (labels + addresses + coords),
- your **saved listings** (title, URL, coords),
- the **geocode cache** (address → coords),
- the **route cache** (origin+destination+mode → minutes/km),
- **settings** (active origin, transport mode, toggles).

Nothing is sent to any server owned by this project. There is no telemetry, no analytics, no crash reporting.

## What leaves your device

Exactly two third-party endpoints, and only when needed (cache miss):

| Service                       | Purpose                              | What we send                                                                             |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `nominatim.openstreetmap.org` | Geocoding (address → coords)         | The address string you entered, or the address text we scraped from the current listing. |
| `routing.openstreetmap.de`    | Routing (coords → duration/distance) | Your origin coords, the listing coords, and the transport mode.                          |

Both are run by OpenStreetMap and have public usage policies. We identify ourselves via `User-Agent` and respect Nominatim's 1 req/s limit.

## How to reduce outbound traffic

- **Cache aggressively.** Every successful response is cached forever locally. Clear via the "Clear cache" button in the side panel.
- **Offline mode.** Toggle in settings to disable outbound calls entirely — the extension will only show cached times.
- **Self-host OSRM.** Point `customOsrmUrl` in settings to your own OSRM instance for full control.

## What listing data is collected

For listings you _view_ on booking.com, the content script reads from the DOM to show times inline — it does not persist anything until you click **Save**. Saved listings store only: title, URL, (optionally) a thumbnail URL, and either coords or address text.

## Removing all data

In `chrome://extensions` → stay-distance → Details → **Site data** → Remove. Or uninstall the extension; Chrome clears the storage automatically.
