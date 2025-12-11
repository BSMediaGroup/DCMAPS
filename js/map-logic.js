/* ==========================================================================
   MAP LOGIC MODULE — FINAL PATH-A VERSION (PATCHED + RESTORED LOGIC)
   ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/* ————————————————————————————————————————————————
   GLOBAL STATE
——————————————————————————————————————————————————— */
window.currentID    = null;
window.journeyMode  = false;

window.LEG_DIST     = {};
window.TRAVELLED_KM = {};
window.TRAVELLED_MI = {};
window.DRIVING_GEOM = [];
window.DRIVE_INDEX  = {};

window.spinning        = true;
window.userInterrupted = false;

let orbitTargetId   = null;
let orbitAnimFrame  = null;
let orbitEnterTimer = null;

/* Map accessor */
function MAP() { return window.__MAP; }

/* Fetch waypoint object */
function getWP(id) {
  return WAYPOINTS.find(w => w.id === id);
}

/* Shared smooth easing for camera + polylines */
const easeInOutCubic = t =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* =======================================================================
   DISTANCE CALCULATIONS (1:1 FROM MONOLITH)
======================================================================= */

function toRad(d) { return d * Math.PI / 180; }

function haversine(a, b) {
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

window.computeAllLegDistances = function () {
  let kmSum = 0;
  let miSum = 0;

  TRIP_ORDER.forEach((id, i) => {
    if (i === 0) {
      TRAVELLED_KM[id] = 0;
      TRAVELLED_MI[id] = 0;
      return;
    }

    const prev = getWP(TRIP_ORDER[i - 1]);
    const cur  = getWP(id);

    const km = haversine(prev.coords, cur.coords);
    const mi = km * 0.621371;

    LEG_DIST[prev.id] = {
      km: +km.toFixed(1),
      mi: +mi.toFixed(1)
    };

    kmSum += km;
    miSum += mi;

    TRAVELLED_KM[id] = +kmSum.toFixed(1);
    TRAVELLED_MI[id] = +miSum.toFixed(1);
  });

  // ★ FIX — update HTML legend automatically
  const el = document.getElementById("legendTotalDistance");
  if (el) el.textContent = `Total Distance: ${kmSum.toFixed(1)} km (${miSum.toFixed(1)} mi)`;
};

/* Required by map-core.js */
window.initDistances = function () {
  if (typeof window.computeAllLegDistances === "function") {
    computeAllLegDistances();
  } else {
    console.error("computeAllLegDistances MISSING!");
  }
};

/* =======================================================================
   GREAT CIRCLE BUILDER — TURF-POWERED TO AVOID WRAP ARTIFACTS
======================================================================= */

window.buildGreatCircle = function (fromId, toId, steps = 220) {
  const A = getWP(fromId);
  const B = getWP(toId);
  if (!A || !B) return [];

  try {
    const gc = turf.greatCircle(A.coords, B.coords, { npoints: steps });
    if (gc?.geometry?.coordinates?.length) return gc.geometry.coordinates;
  } catch (err) {
    console.warn("greatCircle fallback (turf failed)", err);
  }

  // Fallback: straight interpolation to avoid gaps if turf fails
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lon = A.coords[0] + (B.coords[0] - A.coords[0]) * t;
    const lat = A.coords[1] + (B.coords[1] - A.coords[1]) * t;
    coords.push([lon, lat]);
  }
  return coords;
};

/* =======================================================================
   STATIC ROUTES — PATH A VERSION
======================================================================= */

window.addStaticRoutes = function () {
  const map = MAP();
  if (!map) {
    console.error("addStaticRoutes(): map not ready");
    return;
  }

  // Continuous great circle SYD→LA→TOR
  const flightCoords = [];

  function append(seg) {
    if (!seg || !seg.length) return;
    if (!flightCoords.length) flightCoords.push(...seg);
    else flightCoords.push(...seg.slice(1));
  }

  append(buildGreatCircle("sydney", "la"));
  append(buildGreatCircle("la", "toronto"));

  const flightSource = map.getSource("flight-route");
  if (flightSource && flightCoords.length) {
    flightSource.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: flightCoords }
    });
  }
};

/* =======================================================================
   DRIVING ROUTE (MAPBOX DIRECTIONS API)
======================================================================= */

window.buildDrivingRoute = async function () {
  const map = MAP();
  const coords = DRIVE_ORDER.map(id => getWP(id).coords);
  if (coords.length < 2) return;

  const url =
    "https://api.mapbox.com/directions/v5/mapbox/driving/" +
    coords.map(c => c.join(",")).join(";") +
    `?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

  const res = await fetch(url);
  const json = await res.json();
  if (!json.routes?.length) return;

  window.DRIVING_GEOM = json.routes[0].geometry.coordinates;

  const driveSrc = map.getSource("drive-route");
  if (driveSrc) driveSrc.setData(json.routes[0].geometry);

  coords.forEach((wp, i) => {
    let best = 0, bestDist = Infinity;

    window.DRIVING_GEOM.forEach((c, n) => {
      const d = haversine(wp, c);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    });

    window.DRIVE_INDEX[DRIVE_ORDER[i]] = best;
  });
};

function roadLeg(a, b) {
  const geom = window.DRIVING_GEOM;
  if (!geom.length) return [];

  let s = window.DRIVE_INDEX[a];
  let e = window.DRIVE_INDEX[b];

  if (s > e) [s, e] = [e, s];
  return geom.slice(s, e + 1);
}

/* ==========================================================================
   JOURNEY LAYER SOURCES — ENSURE VISIBILITY CORRECT
======================================================================= */

window.addJourneySources = function () {
  const map = MAP();

  function ensureSource(id) {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }}
      });
    }
  }

  ensureSource("journey-flight");
  ensureSource("journey-drive");
  ensureSource("journey-current");

  function ensureLayer(id, paint) {
    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { visibility: "none" },
        paint
      });
    }
  }

  ensureLayer("journey-flight", {
    "line-color": "#478ED3",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.9
  });

  ensureLayer("journey-drive", {
    "line-color": "#FF9C57",
    "line-width": 4,
    "line-opacity": 0.95
  });

  // ★ FIX — current leg should always be white solid
  ensureLayer("journey-current", {
    "line-color": "#FFFFFF",
    "line-width": 4,
    "line-opacity": 1
  });

  console.log("✓ addJourneySources(): journey layers ready");
};

/* =======================================================================
   ORBIT ENGINE — FIXED TO USE DEFAULT_PITCH
======================================================================= */

window.stopOrbit = function () {
  if (orbitEnterTimer) clearTimeout(orbitEnterTimer);
  if (orbitAnimFrame) cancelAnimationFrame(orbitAnimFrame);
  orbitEnterTimer = null;
  orbitAnimFrame  = null;
  orbitTargetId   = null;
};

window.startOrbit = function (id) {
  orbitTargetId = id;
  orbitAnimFrame = requestAnimationFrame(orbitLoop);
};

function orbitLoop() {
  if (!MAP_READY) return;
  if (!orbitTargetId) return;

  const map = MAP();
  map.setBearing(map.getBearing() + ORBIT_ROTATION_SPEED);

  orbitAnimFrame = requestAnimationFrame(orbitLoop);
}

/* =======================================================================
   SPIN ENGINE — FIX: USE DEFAULT_PITCH
======================================================================= */

window.spinGlobe = function () {
  if (!MAP_READY) return;
  if (!spinning) return;

  const map = MAP();
  const targetCenter = DEFAULT_CENTER || [0, 0];
  const targetPitch  = DEFAULT_PITCH ?? 0;
  const targetZoom   = DEFAULT_ZOOM ?? map.getZoom();

  // Keep the auto-spin aligned to the north–south axis with a level camera.
  const nextBearing = (map.getBearing() - ORBIT_ROTATION_SPEED + 360) % 360;
  map.easeTo({
    center: targetCenter,
    zoom: targetZoom,
    pitch: targetPitch,
    bearing: nextBearing,
    duration: 0,
    easing: t => t
  });

  requestAnimationFrame(window.spinGlobe);
};

/* =======================================================================
   WAYPOINT ORBIT FOCUS
======================================================================= */

window.focusWaypointOrbit = function (id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  MAP().easeTo({
    center: wp.coords,
    zoom: ORBIT_ZOOM_TARGET,
    pitch: ORBIT_PITCH_TARGET,
    bearing: MAP().getBearing(),
    duration: ORBIT_ENTRY_DURATION
  });

  orbitEnterTimer = setTimeout(() => startOrbit(id), ORBIT_ENTRY_DURATION);
};

window.focusJourneyOrbit = function (id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  const isLATor = (id === "la" || id === "toronto");
  const zoom = isLATor ? JOURNEY_ZOOM_LA : JOURNEY_ZOOM_DEFAULT;

  MAP().easeTo({
    center: wp.coords,
    zoom,
    pitch: JOURNEY_PITCH_TARGET,
    bearing: MAP().getBearing(),
    duration: ORBIT_ENTRY_DURATION + 250,
    easing: easeInOutCubic
  });

  orbitEnterTimer = setTimeout(() => startOrbit(id), ORBIT_ENTRY_DURATION);
};

/* =======================================================================
   COMPLETED ROUTE BUILDER
======================================================================= */

window.buildCompleteUntil = function (id) {
  const out = { flight: [], drive: [] };

  const append = (arr, seg) => {
    if (seg.length) {
      if (!arr.length) arr.push(...seg);
      else arr.push(...seg.slice(1));
    }
  };

  const idx = TRIP_ORDER.indexOf(id);
  for (let i = 0; i < idx; i++) {
    const a = TRIP_ORDER[i];
    const b = TRIP_ORDER[i + 1];

    const isF = (a === "sydney" && b === "la") || (a === "la" && b === "toronto");

    if (isF) append(out.flight, buildGreatCircle(a, b));
    else append(out.drive, roadLeg(a, b));
  }

  return out;
};

/* =======================================================================
   JOURNEY ANIMATION — FIXED LINESTYLE + STATIC ROUTES
======================================================================= */

window.animateLeg = async function (a, b) {
  if (a === b) return;
  if (!MAP_READY) return;

  const map = MAP();
  stopOrbit();
  window.__ANIMATING__ = true;
  document.body.classList.add("journey-animating");

  const isF = (a === "sydney" && b === "la") || (a === "la" && b === "toronto");
  const seg = isF ? buildGreatCircle(a, b) : roadLeg(a, b);
  if (!seg.length) {
    document.body.classList.remove("journey-animating");
    window.__ANIMATING__ = false;
    return;
  }

  const zoomOutTarget = isF ? 3.2 : 7.4;
  if (map.getZoom() > zoomOutTarget * 0.8) {
    await new Promise(resolve => {
      map.easeTo({
        center: map.getCenter(),
        zoom: zoomOutTarget,
        pitch: 0,
        bearing: map.getBearing(),
        duration: 900,
        easing: easeInOutCubic
      });
      map.once("moveend", resolve);
    });
  }

  const comp = buildCompleteUntil(a);

  map.getSource("journey-flight").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: comp.flight }
  });

  map.getSource("journey-drive").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: comp.drive }
  });

  // Reset the animated pipe
  map.getSource("journey-current").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: [] }
  });

  /* ---------------------------------------------------------------
     ★ FIX — apply correct animated line style BEFORE animation starts
     --------------------------------------------------------------- */
  if (isF) {
    map.setPaintProperty("journey-current", "line-color", "#478ED3");
    map.setPaintProperty("journey-current", "line-width", 3);
    map.setPaintProperty("journey-current", "line-dasharray", [3, 2]);
  } else {
    map.setPaintProperty("journey-current", "line-color", "#FF9C57");
    map.setPaintProperty("journey-current", "line-width", 4);
    map.setPaintProperty("journey-current", "line-dasharray", [1, 0]); // solid
  }

  const duration = isF ? 6800 : 3600;
  const total = seg.length;
  const start = performance.now();

  function animatePolyline(t) {
    if (!MAP_READY) return;

    const p = Math.min((t - start) / duration, 1);
    const eased = easeInOutCubic(p);
    const count = Math.max(2, Math.floor(eased * total));
    const partial = seg.slice(0, count);

    map.getSource("journey-current").setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: partial }
    });

    if (p < 1) {
      requestAnimationFrame(animatePolyline);
    } else {
      const after = buildCompleteUntil(b);

      // ★ restore completed static geometry after animation
      map.getSource("journey-flight").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: after.flight }
      });

      map.getSource("journey-drive").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: after.drive }
      });

      map.getSource("journey-current").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] }
      });

      currentID = b;
      openPopupFor(b);
      focusJourneyOrbit(b);
      updateHUD();

      setTimeout(() => document.body.classList.remove("journey-animating"), 120);
      window.__ANIMATING__ = false;
    }
  }

  /* ————————————————————————————————
     CINEMATIC SYD → LA
  ———————————————————————————————— */
  if (a === "sydney" && b === "la") {
    const Syd = getWP(a);
    const LA  = getWP(b);

    const P1 = 2400;
    const P2 = 2700;
    const P3 = 3000;

    map.easeTo({
      center: Syd.coords,
      zoom: 3.5,
      pitch: 0,
      bearing: map.getBearing(),
      duration: P1,
      easing: easeInOutCubic
    });

    setTimeout(() => {
      map.easeTo({
        center: LA.coords,
        zoom: 3.5,
        pitch: 0,
        bearing: map.getBearing(),
        duration: P2,
        easing: easeInOutCubic
      });
    }, P1);

    setTimeout(() => {
      map.easeTo({
        center: LA.coords,
        zoom: JOURNEY_ZOOM_LA,
        pitch: JOURNEY_PITCH_TARGET,
        bearing: map.getBearing(),
        duration: P3,
        easing: easeInOutCubic
      });
    }, P1 + P2);

    setTimeout(() => {
      currentID = b;
      openPopupFor(b);
      startOrbit(b);
      updateHUD();
      setTimeout(() => document.body.classList.remove("journey-animating"), 120);
      window.__ANIMATING__ = false;
    }, P1 + P2 + P3);

    requestAnimationFrame(animatePolyline);
    return;
  }

  /* NORMAL JOURNEY BEHAVIOUR */
  const wp = getWP(b);

  map.easeTo({
    center: wp.coords,
    zoom: isF ? 3.2 : 9.0,
    pitch: 0,
    bearing: 0,
    duration: duration + 1100,
    easing: easeInOutCubic
  });

  requestAnimationFrame(animatePolyline);
};

/* =======================================================================
   UNDO LEG (unchanged except static layer fix)
======================================================================= */

window.undoTo = function (id) {
  if (!MAP_READY) return;

  stopOrbit();

  const comp = buildCompleteUntil(id);

  MAP().getSource("journey-flight").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: comp.flight }
  });

  MAP().getSource("journey-drive").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: comp.drive }
  });

  MAP().getSource("journey-current").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: [] }
  });

  currentID = id;
  openPopupFor(id);
  focusJourneyOrbit(id);
  updateHUD();
};

/* =======================================================================
   RESET JOURNEY — FIXED PITCH + STATIC RESTORATION
======================================================================= */

window.resetJourney = function () {
  if (!MAP_READY) return;

  const map = MAP();

  document.body.classList.remove("journey-animating");
  window.__ANIMATING__ = false;
  journeyMode = false;
  spinning = true;
  userInterrupted = false;
  currentID = null;

  closeAllPopups();
  stopOrbit();

  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    const src = map.getSource(id);
    if (src) {
      src.setData({
        type:"Feature",
        geometry:{ type:"LineString", coordinates: [] }
      });
    }
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  });

  // Restore static routes
  if (map.getLayer("flight-route"))
    map.setLayoutProperty("flight-route","visibility","visible");

  if (map.getLayer("drive-route"))
    map.setLayoutProperty("drive-route","visibility","visible");

  map.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: DEFAULT_PITCH,
    bearing: 0
  });

  spinGlobe();
  updateHUD();
};

/* =======================================================================
   START JOURNEY — FIX BUTTON SWAP + STATIC ROUTE HIDE
======================================================================= */

window.startJourney = function () {
  if (!MAP_READY) return;

  const map = MAP();

  journeyMode = true;
  spinning = false;
  userInterrupted = true;

  currentID = TRIP_ORDER[0];
  stopOrbit();

  // Hide static routes
  if (map.getLayer("flight-route"))
    map.setLayoutProperty("flight-route","visibility","none");

  if (map.getLayer("drive-route"))
    map.setLayoutProperty("drive-route","visibility","none");

  // Show dynamic layers
  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    if (map.getLayer(id))
      map.setLayoutProperty(id, "visibility", "visible");

    const src = map.getSource(id);
    if (src) {
      src.setData({ type:"Feature", geometry:{ type:"LineString", coordinates: [] } });
    }
  });

  // ★ FIX — replace Start Journey button with Reset Map button
  const btn = document.getElementById("journeyToggle");
  if (btn) {
    btn.textContent = "Reset Map";
    btn.onclick = resetJourney;
  }

  openPopupFor(currentID);

  const wp = getWP(currentID);

  const START1 = 2200;
  const START2 = 2600;

  map.easeTo({
    center: wp.coords,
    zoom: 3.5,
    pitch: 0,
    bearing: map.getBearing(),
    duration: START1,
    easing: easeInOutCubic
  });

  setTimeout(() => {
    map.easeTo({
      center: wp.coords,
      zoom: ORBIT_ZOOM_TARGET,
      pitch: JOURNEY_PITCH_TARGET,
      bearing: map.getBearing(),
      duration: START2,
      easing: easeInOutCubic
    });
  }, START1);

  orbitEnterTimer = setTimeout(() => startOrbit(currentID), START1 + START2);

  updateHUD();
};

console.log("%cmap-logic.js fully loaded", "color:#00ff88;font-weight:bold;");

