import { Router } from "express";
import type { Request, Response } from "express";
import { placesRateLimit } from "../middlewares/rateLimit";

const router = Router();

// Every route below calls out to the Google Places API using either the
// caller-supplied key or the server's own secret — rate-limit per IP so a
// single client can't silently burn through the Google Cloud billing quota.
router.use(placesRateLimit);

// ─── New Places API (v1) base URL ────────────────────────────────────────────
const PLACES_BASE = "https://places.googleapis.com/v1";

function resolveApiKey(req: Request): string | undefined {
  // User-supplied key from the app's Settings screen takes priority
  const raw = req.headers["x-google-api-key"];
  const headerKey = Array.isArray(raw) ? raw[0] : raw;
  if (headerKey && headerKey.trim()) return headerKey.trim();
  return process.env.GOOGLE_MAPS_API_KEY;
}

// ─── Text Search (New API) ────────────────────────────────────────────────────
router.get("/search", async (req: Request, res: Response) => {
  const { city, category } = req.query as { city?: string; category?: string };
  const apiKey = resolveApiKey(req);

  if (!apiKey) {
    res.status(503).json({
      error:
        "No API key configured. Add GOOGLE_MAPS_API_KEY as a server secret, or enter your own key in the app's Settings tab.",
    });
    return;
  }

  if (!city || !category) {
    res.status(400).json({ error: "city and category are required query params" });
    return;
  }

  try {
    const response = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Fields we need — only request what we display
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.internationalPhoneNumber,places.websiteUri",
      },
      body: JSON.stringify({
        textQuery: `${category} in ${city}, India`,
        languageCode: "en",
        maxResultCount: 20,
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string; status?: string };
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        location?: { latitude?: number; longitude?: number };
        internationalPhoneNumber?: string;
        websiteUri?: string;
      }>;
    };

    if (data.error) {
      req.log.error({ err: data.error }, "Places API (New) error");
      res.status(503).json({ error: `API key error: ${data.error.message ?? "unknown"}` });
      return;
    }

    const results = (data.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      phone: p.internationalPhoneNumber ?? "",
      website: p.websiteUri ?? "",
      rating: p.rating ?? 0,
      totalRatings: p.userRatingCount ?? 0,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));

    res.json({ results, total: results.length });
  } catch (err) {
    req.log.error({ err }, "Places search failed");
    res.status(500).json({ error: "Failed to fetch places from Google Maps" });
  }
});

// ─── Place Details (New API) ──────────────────────────────────────────────────
router.get("/details/:placeId", async (req: Request, res: Response) => {
  const placeId = req.params["placeId"] as string;
  const apiKey = resolveApiKey(req);

  if (!apiKey) {
    res.status(503).json({ error: "No API key configured" });
    return;
  }

  try {
    const response = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "internationalPhoneNumber,nationalPhoneNumber,websiteUri",
      },
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      internationalPhoneNumber?: string;
      nationalPhoneNumber?: string;
      websiteUri?: string;
    };

    if (data.error) {
      res.status(503).json({ error: `API key error: ${data.error.message ?? "unknown"}` });
      return;
    }

    res.json({
      phone: data.internationalPhoneNumber ?? data.nationalPhoneNumber ?? "",
      website: data.websiteUri ?? "",
    });
  } catch (err) {
    req.log.error({ err }, "Place details fetch failed");
    res.status(500).json({ error: "Failed to fetch place details" });
  }
});

export default router;
