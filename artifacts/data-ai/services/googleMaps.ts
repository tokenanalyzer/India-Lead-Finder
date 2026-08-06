import type { SearchResult } from '@/types/lead';
import { useSettingsStore } from '@/store/settingsStore';

// ─── Direct Google Places API (New) calls ────────────────────────────────────
// No backend proxy: every user brings their own Google Maps API key (set in
// Settings), so there's no shared server secret to protect and nothing for a
// backend to guard. Restrict your key in Google Cloud Console — Android apps
// by package name + SHA-1, iOS apps by bundle ID, web by HTTP referrer — so
// it can't be reused by anyone else even though it ships inside the app.
const PLACES_BASE = 'https://places.googleapis.com/v1';

const SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.internationalPhoneNumber,places.websiteUri';

const DETAILS_FIELD_MASK =
  'displayName,formattedAddress,rating,userRatingCount,internationalPhoneNumber,nationalPhoneNumber,websiteUri';

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  internationalPhoneNumber?: string;
  websiteUri?: string;
}

interface GoogleApiError {
  error?: { message?: string; status?: string };
}

function getStoredApiKey(): string {
  return useSettingsStore.getState().googleApiKey.trim();
}

export interface SearchLocation {
  latitude: number;
  longitude: number;
  /** Search radius in meters. Google caps this at 50000. */
  radiusMeters?: number;
}

export interface SearchParams {
  category: string;
  /** Provide either a city name (existing flow) or GPS coordinates (near-me flow). */
  city?: string;
  location?: SearchLocation;
}

export async function searchPlaces(params: SearchParams): Promise<SearchResult[]> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Add your Google Maps API key in the Settings tab.');
  }

  const body: Record<string, unknown> = {
    textQuery: params.city ? `${params.category} in ${params.city}, India` : params.category,
    languageCode: 'en',
    maxResultCount: 20,
  };

  if (params.location) {
    body.locationBias = {
      circle: {
        center: { latitude: params.location.latitude, longitude: params.location.longitude },
        radius: Math.min(params.location.radiusMeters ?? 15000, 50000),
      },
    };
  }

  let res: Response;
  try {
    res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error — check your connection');
  }

  const data = await res.json() as GoogleApiError & { places?: GooglePlace[] };

  if (!res.ok || data.error) {
    throw new Error(`API key error: ${data.error?.message ?? 'unknown'}`);
  }

  return (data.places ?? []).map(p => ({
    placeId: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    phone: p.internationalPhoneNumber ?? '',
    website: p.websiteUri ?? '',
    rating: p.rating ?? 0,
    totalRatings: p.userRatingCount ?? 0,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  }));
}

export interface PlaceDetailsRefresh {
  name: string;
  address: string;
  rating: number;
  totalRatings: number;
  phone: string;
  website: string;
}

const EMPTY_DETAILS: PlaceDetailsRefresh = { name: '', address: '', rating: 0, totalRatings: 0, phone: '', website: '' };

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsRefresh> {
  const apiKey = getStoredApiKey();
  if (!apiKey) return EMPTY_DETAILS;

  try {
    const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    });
    if (!res.ok) return EMPTY_DETAILS;

    const data = await res.json() as GoogleApiError & {
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      internationalPhoneNumber?: string;
      nationalPhoneNumber?: string;
      websiteUri?: string;
    };
    if (data.error) return EMPTY_DETAILS;

    return {
      name: data.displayName?.text ?? '',
      address: data.formattedAddress ?? '',
      rating: data.rating ?? 0,
      totalRatings: data.userRatingCount ?? 0,
      phone: data.internationalPhoneNumber ?? data.nationalPhoneNumber ?? '',
      website: data.websiteUri ?? '',
    };
  } catch {
    return EMPTY_DETAILS;
  }
}

export async function testApiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, message: 'Enter an API key first' };

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({ textQuery: 'Restaurant in Mumbai, India', languageCode: 'en', maxResultCount: 5 }),
    });
    const data = await res.json() as GoogleApiError & { places?: unknown[] };
    if (!res.ok || data.error) {
      return { ok: false, message: data.error?.message || 'API key invalid' };
    }
    return { ok: true, message: `Connected! Found ${data.places?.length ?? 0} results` };
  } catch {
    return { ok: false, message: 'Network error — check your connection' };
  }
}
