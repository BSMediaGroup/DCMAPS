/* ==========================================================================
   MAP SEARCH MODULE — Mapbox POI Category Search (Final Stable Edition)
   ==========================================================================
   • Uses the dedicated RESTRICTED Search API token (NOT the base map token)
   • Called automatically when the Details Sidebar opens
   • Fully safe under Pattern-C and K-2 runtime constraints
   • Normalizes all API results into a strict, UI-safe structure
   • Absolutely no single-line edits — complete file output
   ========================================================================== */

console.log("%cmap-search.js loaded", "color:#8cfffb;font-weight:bold;");

/* --------------------------------------------------------------------------
   CONFIG — RESTRICTED PUBLIC SEARCH TOKEN (NOT USED BY MAPBOX-GL)
   -------------------------------------------------------------------------- */
const MAPBOX_SEARCH_TOKEN =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaXd1Ym9kNjJrZzkzaW9iZTVhZXZremcifQ.ZOdxBxJsibcD1MPVkn7z1g";

/* ==========================================================================
   INTERNAL NORMALIZER
   Ensures all returned POIs have:
      - id
      - name (string)
      - address (string)
      - distance (meters)
      - coords: [lon, lat]  OR null
   ========================================================================== */

function normalizePOI(feature) {
  if (!feature || typeof feature !== "object") {
    return {
      id: "unknown",
      name: "Unnamed",
      address: "",
      distance: null,
      coords: null
    };
  }

  const id = feature.id || "no-id";

  const name =
    feature.name ||
    feature.properties?.name ||
    "Unnamed";

  const addr =
    feature.full_address ||
    feature.properties?.full_address ||
    feature.properties?.address ||
    "";

  const distance =
    typeof feature.distance === "number"
      ? feature.distance
      : null;

  // Searchbox stores coordinates in `feature.coordinates` NOT geometry.coordinates
  let coords = null;
  if (Array.isArray(feature.coordinates) && feature.coordinates.length === 2) {
    coords = feature.coordinates;
  } else if (Array.isArray(feature.geometry?.coordinates)) {
    coords = feature.geometry.coordinates;
  }

  return {
    id,
    name,
    address: addr,
    distance,
    coords
  };
}

/* ==========================================================================
   API Helper: Fetch POIs for a category near a lat/lon
   Categories:
      • "tourism"
      • "public_restroom"
      • "lodging"
   ========================================================================== */

async function fetchPOIs(lat, lon, category, limit = 10) {
  const url =
    `https://api.mapbox.com/search/searchbox/v1/category/${category}` +
    `?proximity=${lon},${lat}` +
    `&limit=${limit}` +
    `&language=en` +
    `&access_token=${MAPBOX_SEARCH_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data || !Array.isArray(data.features)) return [];

    return data.features.map(normalizePOI);

  } catch (err) {
    console.error(`POI fetch failed for category "${category}":`, err);
    return [];
  }
}

/* ==========================================================================
   Renderer: Populate a POI list container
   ========================================================================== */

function renderPOIList(container, list) {
  if (!container) return;

  if (!list || !list.length) {
    container.innerHTML = `<div class="poi-empty">No results found.</div>`;
    return;
  }

  container.innerHTML = list
    .map(poi => {
      const dist =
        poi.distance != null
          ? `${(poi.distance / 1000).toFixed(1)} km`
          : "";

      return `
        <div class="poi-item">
          <div class="poi-name">${escapeHTML(poi.name)}</div>
          <div class="poi-distance">${dist}</div>
          <div class="poi-address">${escapeHTML(poi.address)}</div>
        </div>
      `;
    })
    .join("");
}

/* ==========================================================================
   PUBLIC INTERFACE — CALLED BY map-ui.js WHEN SIDEBAR OPENS
   ========================================================================== */

window.loadPOIsForWaypoint = async function (
  wp,
  outTourism,
  outRestrooms,
  outHotels
) {
  if (!wp || !wp.coords) return;

  const [lon, lat] = wp.coords;

  // Prevent stale content during fetch
  if (outTourism) outTourism.innerHTML = `<div class="poi-empty">Loading…</div>`;
  if (outRestrooms) outRestrooms.innerHTML = `<div class="poi-empty">Loading…</div>`;
  if (outHotels) outHotels.innerHTML = `<div class="poi-empty">Loading…</div>`;

  // Fetch in parallel
  const [tourism, restrooms, hotels] = await Promise.all([
    fetchPOIs(lat, lon, "tourism"),
    fetchPOIs(lat, lon, "public_restroom"),
    fetchPOIs(lat, lon, "lodging")
  ]);

  // Render
  renderPOIList(outTourism, tourism);
  renderPOIList(outRestrooms, restrooms);
  renderPOIList(outHotels, hotels);
};

console.log("%cmap-search.js fully ready", "color:#74ffb8;font-weight:bold;");
