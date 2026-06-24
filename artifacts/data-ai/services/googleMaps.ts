import type { SearchResult } from '@/types/lead';
import { useSettingsStore } from '@/store/settingsStore';

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return '';
  return `https://${domain}`;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const userKey = useSettingsStore.getState().googleApiKey;
  if (userKey) headers['x-google-api-key'] = userKey;
  return headers;
}

export async function searchPlaces(city: string, category: string): Promise<SearchResult[]> {
  const base = getBaseUrl();
  const url = `${base}/api/places/search?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`;

  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json() as { results?: SearchResult[]; error?: string };

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data.results || [];
}

export async function getPlaceDetails(placeId: string): Promise<{ phone: string; website: string }> {
  const base = getBaseUrl();
  const url = `${base}/api/places/details/${encodeURIComponent(placeId)}`;

  try {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return { phone: '', website: '' };
    const data = await res.json() as { phone?: string; website?: string };
    return { phone: data.phone || '', website: data.website || '' };
  } catch {
    return { phone: '', website: '' };
  }
}

export async function testApiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const base = getBaseUrl();
  const url = `${base}/api/places/search?city=Mumbai&category=Restaurant`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'x-google-api-key': apiKey },
    });
    const data = await res.json() as { results?: unknown[]; error?: string };
    if (!res.ok) return { ok: false, message: data.error || 'API key invalid' };
    return { ok: true, message: `Connected! Found ${data.results?.length ?? 0} results` };
  } catch {
    return { ok: false, message: 'Network error — check your connection' };
  }
}
