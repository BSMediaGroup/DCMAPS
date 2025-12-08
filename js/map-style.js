/* ============================================================================
   MAP STYLE BOOTSTRAP — v8 (UNCRASHABLE STANDARD EDITION)
   Full Terrain • 3D Buildings • Sky • Fog • Sunlight
   + HARD GPU FAILSAFE → Automatic fallback to dark-v11
   ============================================================================ */

console.log("map-style.js loaded");

/* ------------------------------------------------------------
   BASE MAPBOX STYLE (PRIMARY + FALLBACK)
------------------------------------------------------------ */
const STYLE_STANDARD = "mapbox://styles/mapbox/standard";
const STYLE_FALLBACK = "mapbox://styles/mapbox/dark-v11";

/* BASE TOKEN — ONLY FOR MAPBOX-GL */
mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

/* Detect Weak / Blocked / Broken WebGL */
function gpuIsWeak() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl") ||
      null;

    if (!gl) return true;

    const dbgInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbgInfo) return false;

    const renderer = gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) || "";

    // BAD GPUS / AD-BLOCKED SHADERS / SOFTWARE RENDERERS
    const badPatterns = [
      "swiftshader",
      "llvmpipe",
      "angle",
      "microsoft basic",
      "soft",
      "mesa"
    ];

    return badPatterns.some(p => renderer.toLowerCase().includes(p));
  } catch (e) {
    return true;
  }
}

/* ------------------------------------------------------------
   CHOOSE SAFE STYLE
------------------------------------------------------------ */
const USING_STANDARD = !gpuIsWeak();
const STYLE_TO_USE = USING_STANDARD ? STYLE_STANDARD : STYLE_FALLBACK;

if (!USING_STANDARD) {
  console.warn("⚠ GPU too weak → Using fallback style (dark-v11).");
}

/* ------------------------------------------------------------
   CREATE MAP INSTANCE WITH SAFE VALUES
------------------------------------------------------------ */
const map = new mapboxgl.Map({
  container: "map",
  style: STYLE_TO_USE,
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: DEFAULT_PITCH,
  projection: "globe",
  renderWorldCopies: false,
  maxTileCacheSize: 2048,
  failIfMajorPerformanceCaveat: false
});

window.__MAP = map;
console.log("map-style.js: __MAP created");

/* ------------------------------------------------------------
   NAVIGATION CONTROL
------------------------------------------------------------ */
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

/* ------------------------------------------------------------
   INTERRUPT SPIN (STATIC MODE)
------------------------------------------------------------ */
function interruptSpin() {
  window.spinning = false;
  window.userInterrupted = true;
  const btn = document.getElementById("resetStaticMap");
  if (btn && !window.journeyMode) btn.style.display = "block";
}
["mousedown","dragstart","wheel","touchstart"].forEach(evt =>
  map.on(evt, interruptSpin)
);

/* ------------------------------------------------------------
   FOG / SKY PARAMETERS (SAFE FOR STANDARD & DARK-V11)
------------------------------------------------------------ */
const FOG = {
  color: "rgba(5, 10, 20, 0.70)",
  "high-color": "rgba(60,150,255,0.40)",
  "horizon-blend": 0.45,
  "space-color": "#02040A",
  "star-intensity": 0.65
};

/* ------------------------------------------------------------
   SAFE HELPERS
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
      { id, type: "line", source, layout:{visibility:"visible"}, paint },
      before
    );
  }
}

/* ============================================================
   MAIN STYLE LOAD HANDLER
============================================================ */
map.on("style.load", async () => {
  console.log("map-style.js: style.load fired");

  try {
    /* --------------------------------------------------------
       APPLY FOG (works in both Standard & Fallback)
    -------------------------------------------------------- */
    map.setFog(FOG);

    /* --------------------------------------------------------
       ONLY ENABLE HEAVY FEATURES IF USING STANDARD
    -------------------------------------------------------- */
    if (USING_STANDARD) {
      /* --------------------------------------------
         TERRAIN (Standard uses mapbox-terrain-v2)
      -------------------------------------------- */
      if (!map.getSource("terrain-dem")) {
        map.addSource("terrain-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-v2",
          tileSize: 512
        });
      }
      map.setTerrain({ source: "terrain-dem", exaggeration: 1.2 });

      /* --------------------------------------------
         SKY (Needed for sun model)
      -------------------------------------------- */
      if (!map.getLayer("sky")) {
        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0, 75],
            "sky-atmosphere-sun-intensity": 5.0
          }
        });
      }

      /* --------------------------------------------
         3D BUILDINGS (Safe Standard loading)
      -------------------------------------------- */
      const firstSymbol = map.getStyle().layers.find(l => l.type === "symbol")?.id;

      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            type: "fill-extrusion",
            source: "composite",
            "source-layer": "building",
            filter: ["has", "height"],
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#AAAAAA",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["coalesce", ["get","min_height"], 0],
              "fill-extrusion-opacity": 0.60
            }
          },
          firstSymbol
        );
      }
    } else {
      console.warn("Fallback mode: 3D terrain / sky / buildings skipped.");
    }

    /* --------------------------------------------
       ROUTE PLACEHOLDERS
    -------------------------------------------- */
    safeEnsureSource("flight-route");
    safeEnsureSource("drive-route");

    safeEnsureLineLayer("flight-route", "flight-route", {
      "line-color": "#478ED3", "line-width": 3,
      "line-dasharray": [3, 2], "line-opacity": 0.9
    });

    safeEnsureLineLayer("drive-route", "drive-route", {
      "line-color": "#FF9C57", "line-width": 4,
      "line-opacity": 0.95
    });

    console.log("map-style.js: style layers ready");

  } catch (err) {
    console.error("❌ CRASH PROTECTED: Standard failed → Switching to fallback", err);
    map.setStyle(STYLE_FALLBACK);
  }
});

/* ============================================================
   STYLE RELOAD SAFETY (Survives switches)
============================================================ */
map.on("styledata", () => {
  safeEnsureSource("flight-route");
  safeEnsureSource("drive-route");

  safeEnsureLineLayer("flight-route","flight-route",{
    "line-color":"#478ED3","line-width":3,
    "line-dasharray":[3,2],"line-opacity":0.9
  });

  safeEnsureLineLayer("drive-route","drive-route",{
    "line-color":"#FF9C57","line-width":4,"line-opacity":0.95
  });
});

/* ============================================================
   NATION SHADING (unchanged)
============================================================ */
async function addNation(id, url,color,opacity) {
  if (map.getSource(id)) return;
  try {
    const geo = await (await fetch(url)).json();
    map.addSource(id,{type:"geojson",data:geo});
    map.addLayer({id:id+"-fill",type:"fill",source:id,
      paint:{"fill-color":color,"fill-opacity":opacity}});
    map.addLayer({id:id+"-outline",type:"line",source:id,
      paint:{"line-color":color,"line-width":1.1}});
  } catch (e) { console.error("Nation load failed:", e); }
}

window.initializeStyleLayers = async function () {
  await addNation("aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF",0.12);
  await addNation("can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424",0.12);
  await addNation("usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF",0.12);
};

console.log("%cmap-style.js fully loaded","color:#00e5ff;font-weight:bold;");
