# Data AI

Single-user Android/Expo app for Indian freelance developers to find business leads via Google Maps, save them offline to SQLite, manage in a CRM pipeline, and export to CSV/JSON.

## Run & Operate

- `pnpm --filter @workspace/data-ai run dev` — run the Expo app (port 20068)
- `pnpm run typecheck` — full typecheck across all packages
- No server-side env vars required — each user supplies their own Google Maps API key from the app's Settings tab.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router v6, React Native 0.81.5
- State: Zustand + expo-sqlite (native) / AsyncStorage (web)
- Places API: called directly from the client with the user's own key — no backend
- Export: papaparse + expo-file-system + expo-sharing
- Icons: lucide-react-native
- DB: expo-sqlite v16 (native), @react-native-async-storage (web fallback)

## Where things live

- `artifacts/data-ai/` — Expo mobile app (the entire product; no backend service)
- `artifacts/data-ai/types/lead.ts` — Lead types, Indian cities list, business categories
- `artifacts/data-ai/db/database.native.ts` — expo-sqlite implementation (Android/iOS)
- `artifacts/data-ai/db/database.ts` — AsyncStorage fallback (web)
- `artifacts/data-ai/store/leadsStore.ts` — Zustand store (wraps DB layer)
- `artifacts/data-ai/store/settingsStore.ts` — holds the user's own Google Maps API key
- `artifacts/data-ai/services/googleMaps.ts` — calls `places.googleapis.com` directly with the stored key
- `artifacts/data-ai/services/exportService.ts` — CSV/JSON export

## Architecture decisions

- **Bring-your-own-key, no backend**: every user supplies their own Google Maps API key in Settings; `services/googleMaps.ts` calls `https://places.googleapis.com/v1/...` directly from the device. There used to be an Express proxy (`artifacts/api-server/`) that held a shared server-side key — removed once the app moved to a per-user-key model, since a shared key made no sense to keep hosting and the proxy added no security benefit once the key was never shared. Users must restrict their own key in Google Cloud Console (Android: package name + SHA-1; iOS: bundle ID; web: HTTP referrer) since it now ships inside the client.
- **Platform-specific DB**: `db/database.native.ts` uses expo-sqlite (better perf on device), `db/database.ts` uses AsyncStorage as web fallback. Metro picks the right one automatically via `.native.ts` extension.
- **30-day Places data refresh**: Google's Places API terms cap how long name/address/rating/phone may be cached. Every `Lead` carries `dataFetchedAt`; `isLeadDataStale()` (types/lead.ts) flags anything older than 30 days. Opening a stale lead (`app/lead/[id].tsx`) silently re-fetches those fields from the Places Details endpoint and re-persists them, so saved leads never drift past the cache window. `placeId` itself has no such limit and is kept indefinitely. `LeadCard` shows a small refresh icon on stale leads, and CSV/JSON exports include a "Last Refreshed" column for transparency.
- **Zustand over Context**: Simple, no boilerplate, works great with async SQLite init pattern.

## Product

- **Dashboard**: Stats (total/new/won/conversion%), recent leads, quick navigate to search
- **Search**: City picker (50 Indian cities) + category picker (40 types) → calls Google Places directly → shows up to 20 results → tap Save to add to pipeline
- **Leads**: View all saved leads, filter by CRM status, search by name/city/category, export CSV or JSON
- **Analytics**: CRM pipeline funnel, top cities bar chart, top categories bar chart
- **Lead Detail**: Edit phone/website, change CRM status, add notes, manage tags, fetch contact details via Places API
- **Settings**: Add/test/clear your own Google Maps API key — required, there is no shared fallback key

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **expo-sqlite wasm on web**: expo-sqlite fails to bundle on web (missing .wasm file). Solved via `.native.ts` extension — Metro uses SQLite on native, AsyncStorage on web.
- **Package versions for SDK 54**: expo-sqlite@~16.0.10, expo-file-system@~19.0.23, expo-sharing@~14.0.8 — the pnpm default installs SDK 55+ versions which cause warnings.
- **Places API on web**: browsers enforce CORS; native (Android/iOS) requests are unaffected since CORS is a browser-only concept. If the web build hits CORS errors, the user's key needs an HTTP referrer restriction matching the deployed domain (or no restriction, not recommended).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
