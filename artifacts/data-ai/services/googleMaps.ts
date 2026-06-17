import type { SearchResult } from '@/types/lead';

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return '';
  return `https://${domain}`;
}

export async function searchPlaces(city: string, category: string): Promise<SearchResult[]> {
  const base = getBaseUrl();
  const url = `${base}/api/places/search?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`;

  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
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
    const res = await fetch(url);
    if (!res.ok) return { phone: '', website: '' };
    const data = await res.json() as { phone?: string; website?: string };
    return { phone: data.phone || '', website: data.website || '' };
  } catch {
    return { phone: '', website: '' };
  }
}
