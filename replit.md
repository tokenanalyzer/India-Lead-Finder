# Data AI

Single-user Android/Expo app for Indian freelance developers to find business leads via Google Maps, save them offline to SQLite, manage in a CRM pipeline, and export to CSV/JSON.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/data-ai run dev` — run the Expo app (port 20068)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `GOOGLE_MAPS_API_KEY` — set as Replit secret for Places API search

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router v6, React Native 0.81.5
- State: Zustand + expo-sqlite (native) / AsyncStorage (web)
- API: Express 5 (proxies Google Maps so API key stays server-side)
- Export: papaparse + expo-file-system + expo-sharing
- Icons: lucide-react-native
- DB: expo-sqlite v16 (native), @react-native-async-storage (web fallback)

## Where things live

- `artifacts/data-ai/` — Expo mobile app
- `artifacts/api-server/` — Express backend (proxies Google Maps API)
- `artifacts/data-ai/types/lead.ts` — Lead types, Indian cities list, business categories
- `artifacts/data-ai/db/database.native.ts` — expo-sqlite implementation (Android/iOS)
- `artifacts/data-ai/db/database.ts` — AsyncStorage fallback (web)
- `artifacts/data-ai/store/leadsStore.ts` — Zustand store (wraps DB layer)
- `artifacts/data-ai/services/googleMaps.ts` — Calls backend /api/places/search
- `artifacts/data-ai/services/exportService.ts` — CSV/JSON export
- `artifacts/api-server/src/routes/places.ts` — Google Places API proxy route

## Architecture decisions

- **API key server-side only**: Google Maps key stays in Express backend (`GOOGLE_MAPS_API_KEY` secret), mobile calls `/api/places/search` — never exposes key in mobile bundle.
- **Platform-specific DB**: `db/database.native.ts` uses expo-sqlite (better perf on device), `db/database.ts` uses AsyncStorage as web fallback. Metro picks the right one automatically via `.native.ts` extension.
- **30-day Places data refresh**: Google's Places API terms cap how long name/address/rating/phone may be cached. Every `Lead` carries `dataFetchedAt`; `isLeadDataStale()` (types/lead.ts) flags anything older than 30 days. Opening a stale lead (`app/lead/[id].tsx`) silently re-fetches those fields from `/api/places/details/:placeId` and re-persists them, so saved leads never drift past the cache window. `placeId` itself has no such limit and is kept indefinitely. `LeadCard` shows a small refresh icon on stale leads, and CSV/JSON exports include a "Last Refreshed" column for transparency.
- **Zustand over Context**: Simple, no boilerplate, works great with async SQLite init pattern.
- **No OpenAPI codegen for Places routes**: Direct fetch calls used since Places is backend-only functionality, not a shared API contract.

## Product

- **Dashboard**: Stats (total/new/won/conversion%), recent leads, quick navigate to search
- **Search**: City picker (50 Indian cities) + category picker (40 types) → calls backend → shows 20 results → tap Save to add to pipeline
- **Leads**: View all saved leads, filter by CRM status, search by name/city/category, export CSV or JSON
- **Analytics**: CRM pipeline funnel, top cities bar chart, top categories bar chart
- **Lead Detail**: Edit phone/website, change CRM status, add notes, manage tags, fetch contact details via Places API

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **expo-sqlite wasm on web**: expo-sqlite fails to bundle on web (missing .wasm file). Solved via `.native.ts` extension — Metro uses SQLite on native, AsyncStorage on web.
- **Package versions for SDK 54**: expo-sqlite@~16.0.10, expo-file-system@~19.0.23, expo-sharing@~14.0.8 — the pnpm default installs SDK 55+ versions which cause warnings.
- **EXPO_PUBLIC_ prefix**: Any env var the Expo client needs at runtime must be prefixed `EXPO_PUBLIC_`. The Google Maps key is NOT exposed — stays on the backend.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
