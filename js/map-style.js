/* ============================================================
   MAP STYLE BOOTSTRAP — v9 (HYBRID STABILITY EDITION)
   Dark-v11 base • Terrain • Buildings • Sky • Sunlight • Fog
   ZERO GPU crashes • Fully Brave/Firefox/Chrome compatible
   ============================================================ */

console.log("map-style.js loaded");

/* ------------------------------------------------------------
   BASE MAP STYLE — SUPER STABLE
------------------------------------------------------------ */

const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/* IMPORTANT:
   This token is ONLY for the base map. DO NOT use the Search token.
*/
mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

/* ------------------------------------------------------------
   CREATE MAP INSTANCE
------------------------------------------------------------ */

const map = new mapboxgl.Map({
  container: "map",
  style: MAP_STYLE_URL,
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: DEFAULT_PITCH,
  projection: "globe",
  renderWorldCopies: false,
  antialias: true
});

window.__MAP = map;
console.log("map-style.js: __MAP created");

/* ------------------------------------------------------------
   NAVIGATION CONTROL
------------------------------------------------------------ */
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

/* ------------------------------------------------------------
   USER INTERRUPTION
------------------------------------------------------------ */

function interruptSpin() {
  window.spinning = false;
  window.userInterrupted = true;
  const resetBtn = document.getElementById("resetStaticMap");
  if (resetBtn && !window.journeyMode) resetBtn.style.display = "block";
}

["mousedown", "dragstart", "wheel", "touchstart"].forEach(evt =>
  map.on(evt, interruptSpin)
);

/* ============================================================
   FOG + SKY CONFIGURATION (Dark-v11 compatible)
============================================================ */

const FOG_COLOR = "rgba(5, 10, 20, 0.70)";
const FOG_HIGH_COLOR = "rgba(60,150,255,0.40)";
const FOG_HORIZON_BLEND = 0.44;
const FOG_SPACE_COLOR = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

/* ------------------------------------------------------------
   SAFE HELPERS
------------------------------------------------------------ */

function safeEnsureSource(id) {
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] }
      }
    });
  }
}

function safeEnsureLineLayer(id, source, paint, before = undefined) {
  if (!map.getLayer(id)) {
    map.addLayer(
      {
        id,
        type: "line",
        source,
        layout: { visibility: "visible" },
        paint
      },
      before
    );
  }
}

/* ============================================================
   TERRAIN + SKY + BUILDINGS + ROUTE SHELLS
============================================================ */

map.on("style.load", () => {
  console.log("map-style.js: style.load fired");

  /* FOG & ATMOSPHERE */
  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });

  /* ----------------------------------------------------------
     TERRAIN (Dark-v11 supports terrain via terrain-rgb)
  ---------------------------------------------------------- */

  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-rgb",
      tileSize: 512,
      maxzoom: 14
    });
  }

  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });

  /* ----------------------------------------------------------
     SKY
  ---------------------------------------------------------- */
  if (!map.getLayer("sky")) {
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0, 75],
        "sky-atmosphere-sun-intensity": 5
      }
    });
  }

  /* ----------------------------------------------------------
     3D BUILDINGS
  ---------------------------------------------------------- */

  const firstSymbol =
    map.getStyle().layers.find(l => l.type === "symbol")?.id || undefined;

  if (!map.getLayer("3d-buildings")) {
    map.addLayer(
      {
        id: "3d-buildings",
        type: "fill-extrusion",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#AAAAAA",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
          "fill-extrusion-opacity": 0.6
        }
      },
      firstSymbol
    );
  }

  /* ----------------------------------------------------------
     ROUTE PLACEHOLDERS
  ---------------------------------------------------------- */

  safeEnsureSource("flight-route");
  safeEnsureSource("drive-route");

  safeEnsureLineLayer("flight-route", "flight-route", {
    "line-color": "#478ED3",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.9
  });

  safeEnsureLineLayer("drive-route", "drive-route", {
    "line-color": "#FF9C57",
    "line-width": 4,
    "line-opacity": 0.95
  });

  console.log("map-style.js: terrain + sky + buildings + routes ready");
});

/* ============================================================
   STYLE RESTORE HANDLER
============================================================ */

map.on("styledata", () => {
  if (!map._restoring) {
    map._restoring = true;
    setTimeout(() => (map._restoring = false), 120);
  }

  /* Restore placeholders if style reloads */
  safeEnsureSource("flight-route");
  safeEnsureSource("drive-route");

  safeEnsureLineLayer("flight-route", "flight-route", {
    "line-color": "#478ED3",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.9
  });

  safeEnsureLineLayer("drive-route", "drive-route", {
    "line-color": "#FF9C57",
    "line-width": 4,
    "line-opacity": 0.95
  });
});

/* ============================================================
   NATION SHADING (unchanged)
============================================================ */

async function addNation(id, url, color, opacity) {
  if (map.getSource(id)) return;

  try {
    const geo = await (await fetch(url)).json();

    map.addSource(id, { type: "geojson", data: geo });

    map.addLayer({
      id: id + "-fill",
      type: "fill",
      source: id,
      paint: { "fill-color": color, "fill-opacity": opacity }
    });

    map.addLayer({
      id: id + "-outline",
      type: "line",
      source: id,
      paint: { "line-color": color, "line-width": 1.1 }
    });
  } catch (err) {
    console.error("Nation load failed:", err);
  }
}

/* ============================================================
   SUNLIGHT UPDATE — FULLY WORKING
============================================================ */

window.updateSunForWaypoint = function (wp) {
  if (!wp) return;

  const tStr = formatLocalTime(wp);
  if (!tStr) return;

  let raw = tStr.split("-")[1]?.trim();
  if (!raw) return;

  const ampm = raw.slice(-2).toLowerCase();
  const time = raw.slice(0, -2);

  let [hour, minute] = time.split(":").map(Number);
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  const minutesOfDay = hour * 60 + minute;
  const dayProgress = minutesOfDay / 1440;

  const azimuth = dayProgress * 360;
  let altitude = Math.sin(dayProgress * Math.PI * 2) * 70;

  altitude = Math.max(-10, Math.min(altitude, 85));

  if (map.getLayer("sky")) {
    map.setPaintProperty("sky", "sky-atmosphere-sun", [azimuth, altitude]);
  }
};

/* ============================================================
   INITIALIZER (Nation Shading)
============================================================ */

window.initializeStyleLayers = async function () {
  console.log("initializeStyleLayers() running...");

  await addNation(
    "aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF",
    0.12
  );

  await addNation(
    "can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424",
    0.12
  );

  await addNation(
    "usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF",
    0.12
  );

  console.log("initializeStyleLayers() complete.");
};

console.log("%cmap-style.js fully loaded", "color:#00e5ff; font-weight:bold;");
