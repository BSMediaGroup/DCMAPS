/* ==========================================================================
   MAP SEARCH MODULE — Mapbox POI Category Search
   ==========================================================================
   Uses the new dedicated Search API token provided by the user.
   Automatically queried for each waypoint when the details sidebar opens.
   ==========================================================================
*/

console.log("%cmap-search.js loaded", "color:#8cfffb;font-weight:bold;");

/* ------------------------------------------------------------
   CONFIG — Your NEW restricted public token
------------------------------------------------------------ */
const MAPBOX_SEARCH_TOKEN =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaXd1Ym9kNjJrZzkzaW9iZTVhZXZremcifQ.ZOdxBxJsibcD1MPVkn7z1g";

/* ------------------------------------------------------------
   API Helper: Fetch POIs for a category near a lat/lon
   Categories supported:
      - tourism
      - public_restroom
      - lodging
------------------------------------------------------------ */

async function fetchPOIs(lat, lon, category, limit = 10) {
  const url =
    `https://api.mapbox.com/search/searchbox/v1/category/${category}` +
    `?proximity=${lon},${lat}` +
    `&limit=${limit}` +
    `&language=en&access_token=${MAPBOX_SEARCH_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.features) return [];

    // Normalize POI data to a simple universal format
    return data.features.map(f => ({
      id: f.id,
      name: f.name || "Unnamed",
      address: f.full_address || "",
      distance: f.distance || null,
      coords: f.coordinates || null
    }));
  } catch (err) {
    console.error("POI fetch failed:", err);
    return [];
  }
}

/* ------------------------------------------------------------
   Renderer: Populate a POI list container
------------------------------------------------------------ */

function renderPOIList(container, items) {
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="poi-empty">No results found.</div>`;
    return;
  }

  container.innerHTML = items
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

/* ------------------------------------------------------------
   PUBLIC INTERFACE
   Called by map-ui.js when a waypoint sidebar opens
------------------------------------------------------------ */

window.loadPOIsForWaypoint = async function (wp, outTourism, outRestrooms, outHotels) {
  if (!wp || !wp.coords) return;

  const [lon, lat] = wp.coords;

  // Reset containers immediately to avoid stale content
  if (outTourism) outTourism.innerHTML = `<div class="poi-empty">Loading…</div>`;
  if (outRestrooms) outRestrooms.innerHTML = `<div class="poi-empty">Loading…</div>`;
  if (outHotels) outHotels.innerHTML = `<div class="poi-empty">Loading…</div>`;

  // Fetch all three categories in parallel
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
