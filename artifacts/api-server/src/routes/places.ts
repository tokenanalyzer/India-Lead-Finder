import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/search", async (req: Request, res: Response) => {
  const { city, category } = req.query as { city?: string; category?: string };
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    res.status(503).json({
      error: "Google Maps API key is not configured. Please add GOOGLE_MAPS_API_KEY secret.",
    });
    return;
  }

  if (!city || !category) {
    res.status(400).json({ error: "city and category are required query params" });
    return;
  }

  try {
    const query = encodeURIComponent(`${category} in ${city}, India`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}&language=en`;

    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        place_id: string;
        name: string;
        formatted_address?: string;
        rating?: number;
        user_ratings_total?: number;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };

    if (data.status === "REQUEST_DENIED") {
      res.status(503).json({ error: `API key error: ${data.error_message ?? "unknown"}` });
      return;
    }

    const results = (data.results ?? []).slice(0, 20).map((p) => ({
      placeId: p.place_id,
      name: p.name,
      address: p.formatted_address ?? "",
      phone: "",
      website: "",
      rating: p.rating ?? 0,
      totalRatings: p.user_ratings_total ?? 0,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
    }));

    res.json({ results, total: results.length, status: data.status });
  } catch (err) {
    req.log.error({ err }, "Places search failed");
    res.status(500).json({ error: "Failed to fetch places from Google Maps" });
  }
});

router.get("/details/:placeId", async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    res.status(503).json({ error: "Google Maps API key is not configured" });
    return;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_phone_number,website,international_phone_number&key=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      result?: { formatted_phone_number?: string; international_phone_number?: string; website?: string };
    };

    res.json({
      phone: data.result?.formatted_phone_number ?? data.result?.international_phone_number ?? "",
      website: data.result?.website ?? "",
    });
  } catch (err) {
    req.log.error({ err }, "Place details fetch failed");
    res.status(500).json({ error: "Failed to fetch place details" });
  }
});

export default router;
