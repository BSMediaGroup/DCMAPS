/* ============================================================
   MAP STYLE BOOTSTRAP — v5 (FINAL SYSTEM-LOCKED EDITION)
   Pattern-C Atmosphere • K-2 Sky Safe Mode • Terrain • Buildings
   ============================================================ */

console.log("map-style.js loaded");

/* ------------------------------------------------------------
   BASE MAPBOX STYLE
------------------------------------------------------------ */

const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/* IMPORTANT:
   This token is ONLY for the base map. It must NOT use the
   restricted Search token. Search module handles its own key.
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
  renderWorldCopies: false,
  projection: "globe"
});

window.__MAP = map;
console.log("map-style.js: __MAP created");

/* ------------------------------------------------------------
   NAVIGATION CONTROL
------------------------------------------------------------ */
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

/* ------------------------------------------------------------
   USER INTERRUPTION (STOP SPIN, SHOW RESET BTN)
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

/* ------------------------------------------------------------
   FOG + SPACEFIELD (IDENTICAL TO MONOLITH)
------------------------------------------------------------ */

const FOG_COLOR = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR = "rgba(60,150,255,0.45)";
const FOG_HORIZON_BLEND = 0.45;
const FOG_SPACE_COLOR = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

/* ------------------------------------------------------------
   SAFE STYLE LOAD HANDLER
   Required because Mapbox v3 resets layers on style reload.
------------------------------------------------------------ */

function safeEnsureSource(id) {
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } }
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
   TERRAIN + SKY + 3D BUILDINGS + ROUTE SHELLS
============================================================ */

map.on("style.load", () => {
  console.log("map-style.js: style.load fired");

  /* ---------------------------------------------------------
     Atmosphere (Pattern-C)
     K-2 safety: sky intensity capped, horizon blending safe value
  --------------------------------------------------------- */
  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });

  /* ---------------------------------------------------------
     TERRAIN SOURCE
  --------------------------------------------------------- */
  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-rgb",
      tileSize: 512,
      maxzoom: 14
    });
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });
  }

  /* ---------------------------------------------------------
     SKY LAYER (Pattern-C + K-2 clamped angles)
  --------------------------------------------------------- */
  if (!map.getLayer("sky")) {
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0, 85],         // safe default (K-2 clamp)
        "sky-atmosphere-sun-intensity": 4.2    // safe reduced bloom
      }
    });
  }

  /* ---------------------------------------------------------
     3D BUILDINGS
     Must insert BEFORE the label layer for proper depth sorting
  --------------------------------------------------------- */
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
          "fill-extrusion-color": "#aaaaaa",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.60
        }
      },
      firstSymbol
    );
  }

  /* ---------------------------------------------------------
     STATIC ROUTE PLACEHOLDERS
  --------------------------------------------------------- */
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

  console.log("map-style.js: terrain, sky, buildings + placeholder routes ready");
});

/* ============================================================
   STYLE RELOAD HANDLER (Mapbox v3 resets EVERYTHING)
============================================================ */

map.on("styledata", () => {
  if (!map._restoring) {
    map._restoring = true;
    setTimeout(() => (map._restoring = false), 120);
  }

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
   NATION SHADING (Monolith behaviour)
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
      paint: {
        "fill-color": color,
        "fill-opacity": opacity
      }
    });

    map.addLayer({
      id: id + "-outline",
      type: "line",
      source: id,
      paint: {
        "line-color": color,
        "line-width": 1.1
      }
    });
  } catch (err) {
    console.error("Nation load failed:", err);
  }
}

/* ============================================================
   SUN UPDATE (Pattern-C + K-2 safe clamps)
============================================================ */

window.updateSunForWaypoint = function (wp) {
  if (!wp) return;

  const tStr = formatLocalTime(wp);
  let [time, ampm] = tStr.split(" ");
  let [hour, minute] = time.split(":").map(Number);

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const minutes = hour * 60 + minute;
  const dayProgress = minutes / 1440;

  const azimuth = dayProgress * 360;
  let altitude = Math.sin(dayProgress * Math.PI * 2) * 75;

  // K-2 SKY SAFETY: clamp altitude
  altitude = Math.max(-12, Math.min(altitude, 85));

  if (map.getLayer("sky")) {
    map.setPaintProperty("sky", "sky-atmosphere-sun", [azimuth, altitude]);
  }
};

/* ============================================================
   INITIALIZER (Called from map-core.js)
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

console.log("%cmap-style.js fully loaded", "color:#00e5ff;font-weight:bold;");
