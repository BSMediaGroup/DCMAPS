/* ==========================================================================
   MAP SEARCH MODULE — FINAL INTEGRATED EDITION (Searchbox Text + POI)
   ==========================================================================
   • GLOBAL SEARCH (Option-C UI)
   • Sidebar auto-POI categories (tourism, toilet, hotels)
   • Uses the RESTRICTED Searchbox token (NOT the base map token)
   • Fully normalized consistent result structure
   • Safe under Pattern-C + K-2 constraints
   ========================================================================== */

console.log("%cmap-search.js loaded", "color:#8cfffb;font-weight:bold;");

/* --------------------------------------------------------------------------
   CONFIG — RESTRICTED SEARCHBOX TOKEN
   -------------------------------------------------------------------------- */
const MAPBOX_SEARCH_TOKEN =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaXd1Ym9kNjJrZzkzaW9iZTVhZXZremcifQ.ZOdxBxJsibcD1MPVkn7z1g";

/* ==========================================================================
   INTERNAL NORMALIZER — used for BOTH Global Search + Sidebar POIs
   ========================================================================== */

function normalizePOI(feature) {
  if (!feature || typeof feature !== "object") {
    return {
      id: "no-id",
      name: "Unnamed",
      address: "",
      distance: null,
      coords: null
    };
  }

  const id =
    feature.id ||
    feature.mapbox_id ||
    feature.properties?.id ||
    "no-id";

  const name =
    feature.name ||
    feature.text ||
    feature.properties?.name ||
    "Unnamed";

  const addr =
    feature.full_address ||
    feature.place_name ||
    feature.properties?.full_address ||
    feature.properties?.address ||
    "";

  const distance =
    typeof feature.distance === "number" ? feature.distance : null;

  let coords = null;

  // Searchbox always stores coordinates in feature.coordinates
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
   POI CATEGORY FETCHER — Sidebar Only
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
   SIDEBAR RENDERER — Category POIs
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
   PUBLIC — Auto-POI Loader for Sidebar
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

  const [tourism, restrooms, hotels] = await Promise.all([
    fetchPOIs(lat, lon, "tourism"),
    fetchPOIs(lat, lon, "public_restroom"),
    fetchPOIs(lat, lon, "lodging")
  ]);

  renderPOIList(outTourism, tourism);
  renderPOIList(outRestrooms, restrooms);
  renderPOIList(outHotels, hotels);
};

/* ==========================================================================
   GLOBAL TEXT SEARCH (Option-C UI)
   Searchbox API: /v1/text/{query}
   ========================================================================== */

/* DOM elements must already exist (Option-C UI installed in HTML) */
const searchInput = document.getElementById("mapSearchInput");
const searchResults = document.getElementById("mapSearchResults");
const floatingSearch = document.getElementById("floatingSearch");
const floatingToggle = document.getElementById("floatingSearchToggle");

const sidebarSearchInput = document.getElementById("detailsPoiSearchInput");
const sidebarSearchResults = document.getElementById("detailsPoiSearchResults");

let searchAbort = null;
let searchMarkers = [];
let searchPopup = null;
let sidebarSearchAbort = null;
let sidebarMarkers = [];
let sidebarSearchOrigin = null;

/* ----- UTIL: clear all search markers ----- */
function clearSearchMarkers() {
  searchMarkers.forEach(m => m.remove());
  searchMarkers = [];
  if (searchPopup) searchPopup.remove();
  searchPopup = null;
}

function clearSidebarMarkers() {
  sidebarMarkers.forEach(m => m.remove());
  sidebarMarkers = [];
}

/* ----- UTIL: render global results list ----- */
function renderSearchResults(list) {
  if (!searchResults) return;

  if (!list.length) {
    searchResults.innerHTML = `<div class="search-empty">No results found</div>`;
    return;
  }

  searchResults.innerHTML = list
    .map(
      r => `
      <div class="search-item" data-id="${r.id}">
        <div class="search-item-title">${escapeHTML(r.name)}</div>
        <div class="search-item-address">${escapeHTML(r.address)}</div>
      </div>
    `
    )
    .join("");
}

function renderSidebarResults(list) {
  if (!sidebarSearchResults) return;

  if (!list.length) {
    sidebarSearchResults.innerHTML = `<div class="poi-empty">No results found.</div>`;
    return;
  }

  sidebarSearchResults.innerHTML = list
    .map(r => {
      const dist =
        typeof r.distance === "number" ? `${(r.distance / 1000).toFixed(1)} km away` : "";

      return `
        <div class="sidebar-search-item" data-id="${r.id}">
          <div class="sidebar-search-title">${escapeHTML(r.name)}</div>
          <div class="sidebar-search-address">${escapeHTML(r.address)}</div>
          <div class="sidebar-search-distance">${dist}</div>
        </div>`;
    })
    .join("");
}

/* ----- EVENT: Clicking search result ----- */
if (searchResults) {
  searchResults.addEventListener("click", e => {
    const item = e.target.closest(".search-item");
    if (!item) return;

    const id = item.dataset.id;
    const r = latestSearchResults.find(x => x.id === id);
    if (!r || !r.coords) return;

    const [lon, lat] = r.coords;

    clearSearchMarkers();

    const marker = new mapboxgl.Marker({ color: "#00c8ff" })
      .setLngLat([lon, lat])
      .addTo(__MAP);

    searchMarkers.push(marker);

    if (typeof stopOrbit === "function") stopOrbit();

    const zoom = (window.ORBIT_ZOOM_TARGET || 14.5) - 0.8;
    const pitch = window.ORBIT_PITCH_TARGET || 60;

    __MAP.easeTo({
      center: [lon, lat],
      zoom,
      pitch,
      bearing: __MAP.getBearing(),
      duration: 1400,
      easing: t => t * t * (3 - 2 * t)
    });

    if (searchPopup) searchPopup.remove();
    searchPopup = new mapboxgl.Popup({ offset: 22, closeOnClick: true })
      .setLngLat([lon, lat])
      .setHTML(`
        <div class="trip-popup">
          <div class="trip-popup-title">
            <span>${escapeHTML(r.name)}</span>
          </div>
          <div class="trip-popup-location">${escapeHTML(r.address || "")}</div>
          <div class="trip-popup-body">${escapeHTML(r.address || "")}</div>
        </div>
      `)
      .addTo(__MAP);

    // Update sun for this location
    const fakeWP = { coords: [lon, lat], meta: { timezone: "UTC" } };
    if (typeof updateSunForWaypoint === "function") {
      updateSunForWaypoint(fakeWP);
    }
  });
}

if (sidebarSearchResults) {
  sidebarSearchResults.addEventListener("click", e => {
    const item = e.target.closest(".sidebar-search-item");
    if (!item) return;

    const id = item.dataset.id;
    const r = latestSidebarResults.find(x => x.id === id);
    if (!r || !r.coords) return;

    const [lon, lat] = r.coords;

    clearSidebarMarkers();

    const marker = new mapboxgl.Marker({ color: "#FFA50D" })
      .setLngLat([lon, lat])
      .addTo(__MAP);

    sidebarMarkers.push(marker);

    __MAP.easeTo({
      center: [lon, lat],
      zoom: 13.2,
      pitch: 50,
      duration: 1100
    });

    const fakeWP = { coords: [lon, lat], meta: { timezone: "UTC" } };
    if (typeof updateSunForWaypoint === "function") {
      updateSunForWaypoint(fakeWP);
    }
  });
}

/* ===== GLOBAL SEARCH REQUEST ===== */

let latestSearchResults = [];
let latestSidebarResults = [];

window.setSidebarSearchContext = function (coords, label = "") {
  sidebarSearchOrigin = Array.isArray(coords) ? coords : null;
  clearSidebarMarkers();
  latestSidebarResults = [];

  if (sidebarSearchInput) sidebarSearchInput.value = "";
  if (sidebarSearchResults) {
    const msg = label ? `Search near ${escapeHTML(label)}` : "Search for nearby places";
    sidebarSearchResults.innerHTML = `<div class="poi-empty">${msg}</div>`;
  }
};

async function performGlobalSearch(query) {
  if (!query || query.length < 2) {
    searchResults.innerHTML = "";
    clearSearchMarkers();
    return;
  }

  // Cancel old request
  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  const url =
    `https://api.mapbox.com/search/searchbox/v1/forward?` +
    `q=${encodeURIComponent(query)}&language=en&limit=8&access_token=${MAPBOX_SEARCH_TOKEN}`;

  try {
    const res = await fetch(url, { signal: searchAbort.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      renderSearchResults([]);
      return;
    }

    latestSearchResults = data.features.map(normalizePOI);
    renderSearchResults(latestSearchResults);

  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Global search failed:", err);
    }
  }
}

async function performSidebarSearch(query) {
  if (!sidebarSearchResults) return;

  if (!query || query.length < 2) {
    renderSidebarResults([]);
    clearSidebarMarkers();
    return;
  }

  if (sidebarSearchAbort) sidebarSearchAbort.abort();
  sidebarSearchAbort = new AbortController();

  const [lon, lat] =
    Array.isArray(sidebarSearchOrigin) && sidebarSearchOrigin.length === 2
      ? sidebarSearchOrigin
      : (__MAP ? [__MAP.getCenter().lng, __MAP.getCenter().lat] : [0, 0]);

  const url =
    `https://api.mapbox.com/search/searchbox/v1/forward?` +
    `q=${encodeURIComponent(query)}` +
    `&language=en&limit=6&proximity=${lon},${lat}&types=poi&access_token=${MAPBOX_SEARCH_TOKEN}`;

  try {
    const res = await fetch(url, { signal: sidebarSearchAbort.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      renderSidebarResults([]);
      return;
    }

    latestSidebarResults = data.features.map(normalizePOI);
    renderSidebarResults(latestSidebarResults);

  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Sidebar search failed:", err);
      renderSidebarResults([]);
    }
  }
}

/* ----- THROTTLE INPUT ----- */
let searchTimer = null;

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => performGlobalSearch(q), 250);
  });

  searchInput.addEventListener("focus", () => setSearchCollapsed(false));
}

if (sidebarSearchInput) {
  sidebarSearchInput.addEventListener("input", () => {
    const q = sidebarSearchInput.value.trim();

    clearTimeout(searchTimer);
  searchTimer = setTimeout(() => performSidebarSearch(q), 250);
  });
}

/* ----- Floating toggle handling ----- */
function setSearchCollapsed(collapsed) {
  if (!floatingSearch) return;
  floatingSearch.classList.toggle("collapsed", collapsed);
  if (floatingToggle) floatingToggle.setAttribute("aria-expanded", (!collapsed).toString());
}

if (floatingToggle) {
  floatingToggle.addEventListener("click", () => {
    const nextState = !floatingSearch || floatingSearch.classList.contains("collapsed");
    setSearchCollapsed(!nextState);
    if (!nextState) searchInput?.focus();
  });
}

/* ==========================================================================
   FINAL READY
   ========================================================================== */

console.log("%cmap-search.js fully ready", "color:#74ffb8;font-weight:bold;");
