/* ========================================================================== */
/* ============================== MAP UI MODULE ============================= */
/* ========================================================================== */

console.log("%cmap-ui.js loaded", "color:#00e5ff;font-weight:bold;");

/* ========================================================================== */
/* UTILITIES                                                                   */
/* ========================================================================== */

if (typeof window.escapeHTML !== "function") {
  window.escapeHTML = function (str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
}

const escapeHTML = window.escapeHTML;

/* ========================================================================== */
/* GLOBALS                                                                     */
/* ========================================================================== */

const MARKERS = {};
const POPUPS = {};
const MINOR_MARKERS = [];

/* ========================================================================== */
/* MODE HELPERS                                                                */
/* ========================================================================== */

function getModeIcon(mode) {
  if (typeof MODE_ICONS === "undefined" || !MODE_ICONS) return "";
  return MODE_ICONS[mode] || MODE_ICONS["Car"] || Object.values(MODE_ICONS)[0];
}

if (!window.getLegMode) {
  window.getLegMode = function (id) {
    const idx = TRIP_ORDER.indexOf(id);
    if (idx < 0) return "Car";

    const next = TRIP_ORDER[idx + 1];

    if (window.isFlight && next) {
      if (isFlight(id, next)) return "Plane";
    } else {
      if ((id === "sydney" && next === "la") ||
          (id === "la" && next === "toronto"))
        return "Plane";
    }

    return getWP(id)?.mode || "Car";
  };
}

if (!window.getZoom) {
  window.getZoom = function (id) {
    if (["sydney", "la", "toronto"].includes(id)) return 6.7;
    return 9.4;
  };
}

/* ========================================================================== */
/* POPUP HTML BUILDER                                                          */
/* ========================================================================== */

window.buildPopupHTML = function (w) {
  const idx = TRIP_ORDER.indexOf(w.id);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  const tMi = TRAVELLED_MI[w.id];
  const tKm = TRAVELLED_KM[w.id];
  const totalMi = TRAVELLED_MI[TRIP_ORDER.at(-1)];
  const totalKm = TRAVELLED_KM[TRIP_ORDER.at(-1)];

  const distLabel = LEG_DIST[w.id]
    ? ` – ${LEG_DIST[w.id].mi}mi <span style="color:#A3A3A3">(${LEG_DIST[w.id].km}km)</span>`
    : "";

  let navHTML = "";

  if (prev) {
    navHTML += `
      <span class="trip-popup-nav-link" data-dir="prev" data-target="${prev}">
        Go Back
      </span>`;
  }

  if (next) {
    const mode = getLegMode(w.id);
    navHTML += `
      <span class="trip-popup-nav-link" data-dir="next" data-target="${next}">
        <img src="${getModeIcon(mode)}" class="trip-popup-mode-icon">
        Next Stop${distLabel}
      </span>`;
  }

  navHTML += `
    <span class="trip-popup-nav-link details-btn" data-details="${w.id}">
      <img src="https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/exp.svg"
           class="trip-popup-mode-icon">
      Details
    </span>
  `;

  if (w.id === "tomsriver") {
    navHTML += `<span class="trip-popup-nav-link" data-reset="1">Reset Map</span>`;
  }

  return `
    <div class="trip-popup">
      <div class="trip-popup-title">
        <img src="${w.icon}" class="trip-popup-title-icon">
        <span>${escapeHTML(w.names?.display || w.id)}</span>
      </div>

      <div class="trip-popup-location">
        <span>${escapeHTML(w.location || "")}</span>
        <span class="trip-popup-flag" style="background-image:url('${w.meta?.flag || ""}')"></span>
      </div>

      <div class="trip-popup-body">${escapeHTML(w.description || "")}</div>

      <div class="trip-popup-travelled">
        Travelled: ${tMi} / ${totalMi}mi
        <span style="color:#A3A3A3">(${tKm} / ${totalKm}km)</span>
      </div>

      <div class="trip-popup-divider"></div>

      <div class="trip-popup-nav">${navHTML}</div>
    </div>
  `;
};

/* ========================================================================== */
/* POPUP CONTROL                                                               */
/* ========================================================================== */

window.closeAllPopups = () => {
  document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
};

window.openPopupFor = function (id) {
  closeAllPopups();
  const p = POPUPS[id];
  if (p) {
    p.addTo(__MAP);

    const wp = getWP(id);
    if (wp && MAP_READY && __MAP.getLayer("sky")) {
      updateSunForWaypoint(wp);
    }
  }
};

/* ========================================================================== */
/* MARKERS (SUNLIGHT HOOKS ADDED)                                              */
/* ========================================================================== */

window.buildMarkers = function () {
  if (!window.__MAP) return console.error("buildMarkers(): map missing");

  WAYPOINTS.forEach(w => {
    const el = document.createElement("div");
    el.className = "trip-marker " + w.role;
    el.innerHTML = `<img src="${w.icon}" class="marker-icon">`;

    setTimeout(() => el.classList.add("bounce"), 80);

    const popup = new mapboxgl.Popup({ offset: 26, closeOnClick: true })
      .setHTML(buildPopupHTML(w))
      .setLngLat(w.coords);

    POPUPS[w.id] = popup;

    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(w.coords)
      .addTo(__MAP);

    MARKERS[w.id] = marker;
    if (w.role === "minor") MINOR_MARKERS.push(marker);

    /* CLICK — OPEN POPUP, MOVE CAMERA, UPDATE SUN */
    el.addEventListener("click", ev => {
      ev.stopPropagation();
      stopOrbit();
      window.currentID = w.id;

      openPopupFor(w.id);

      __MAP.easeTo({
        center: w.coords,
        zoom: getZoom(w.id) + 1.3,
        pitch: 0,
        bearing: 0,
        duration: 900
      });

      if (MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(w);

      window.spinning = false;
      window.userInterrupted = true;

      const btn = document.getElementById("resetStaticMap");
      if (btn && !window.journeyMode) btn.style.display = "block";
    });

    /* DOUBLE CLICK — ORBIT + SUN UPDATE */
    el.addEventListener("dblclick", ev => {
      ev.stopPropagation();
      window.currentID = w.id;
      openPopupFor(w.id);

      if (MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(w);

      focusWaypointOrbit(w.id);
    });
  });

  function updateMinorMarkers() {
    const z = __MAP.getZoom();
    const show = z >= 5.25;
    MINOR_MARKERS.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = show ? "block" : "none";
    });
  }

  updateMinorMarkers();
  __MAP.on("zoom", updateMinorMarkers);

  __MAP.on("click", () => {
    closeAllPopups();
    stopOrbit();
  });
};

/* ========================================================================== */
/* POPUP NAVIGATION (SUNLIGHT HOOKS ADDED)                                     */
/* ========================================================================== */

document.addEventListener("click", ev => {
  const link = ev.target.closest(".trip-popup-nav-link");
  if (!link) return;

  ev.stopPropagation();

  if (link.dataset.reset) {
    resetJourney();
    return;
  }

  const dir = link.dataset.dir;
  const tgt = link.dataset.target;

  if (!dir || !tgt) return;
  if (window.__ANIMATING__) return;

  if (!window.journeyMode) {
    stopOrbit();
    window.currentID = tgt;

    const wp = getWP(tgt);
    openPopupFor(tgt);

    if (wp) {
      __MAP.easeTo({
        center: wp.coords,
        zoom: getZoom(tgt) + 1.3,
        pitch: 0,
        bearing: __MAP.getBearing(),
        duration: 900
      });

      if (MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(wp);
    }

    startOrbit(tgt);
    return;
  }

  if (dir === "next") animateLeg(window.currentID, tgt);
  else if (dir === "prev") undoTo(tgt);
});

/* ========================================================================== */
/* LEGEND                                                                      */
/* ========================================================================== */

(function () {
  if (window.__LEGEND_UI_INITIALIZED) return;

  const toggle = document.getElementById("legendToggle");
  const icon = document.getElementById("legendToggleIcon");
  const label = document.getElementById("legendToggleLabel");
  const container = document.getElementById("legendContainer");

  if (!toggle || !icon || !label || !container) return;

  const EXPAND =
    "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/expand.svg";
  const COLLAPSE =
    "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/collapse.svg";

  let collapsed = false;

  function update() {
    if (collapsed) {
      container.classList.add("legend-collapsed");
      icon.src = EXPAND;
      label.textContent = "EXPAND";
    } else {
      container.classList.remove("legend-collapsed");
      icon.src = COLLAPSE;
      label.textContent = "COLLAPSE";
    }
  }

  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    update();
  });

  update();
  window.__LEGEND_UI_INITIALIZED = true;
})();

/* ========================================================================== */
/* HUD                                                                         */
/* ========================================================================== */

const hud = document.getElementById("journeyHud");
const hudPrev = document.getElementById("hudPrev");
const hudNext = document.getElementById("hudNext");
const hudLabel = document.getElementById("hudLabel");

window.updateHUD = function () {
  if (!hud) return;

  if (!window.journeyMode) {
    hud.style.display = "none";
    return;
  }

  hud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(window.currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  hudPrev.disabled = !prev;

  if (next) {
    const d = LEG_DIST[window.currentID];
    const lbl = d ? ` – ${d.mi}mi (${d.km}km)` : "";
    hudNext.textContent = "Next Stop" + lbl;
    hudNext.disabled = false;
  } else {
    hudNext.textContent = "Next Stop";
    hudNext.disabled = true;
  }

  if (next) {
    const mode = getLegMode(window.currentID);
    const icon = getModeIcon(mode);
    const wp = getWP(next);

    hudLabel.innerHTML =
      `Next Stop: <img src="${icon}" class="hud-mode-icon"> ${escapeHTML(wp.location)}
       <span class="hud-flag" style="background-image:url('${wp.meta.flag}')"></span>`;

    if (MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(wp);

  } else {
    hudLabel.textContent = "";
  }
};

hudPrev?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx > 0) undoTo(TRIP_ORDER[idx - 1]);
});

hudNext?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx < TRIP_ORDER.length - 1) animateLeg(window.currentID, TRIP_ORDER[idx + 1]);
});

/* ========================================================================== */
/* SIDEBAR                                                                     */
/* ========================================================================== */

const detailsOverlay = document.getElementById("detailsOverlay");
const detailsSidebar = document.getElementById("detailsSidebar");
const detailsImage = document.getElementById("detailsSidebarImage");
const detailsTitle = document.getElementById("detailsSidebarTitle");
const detailsIcon = document.getElementById("detailsSidebarIcon");
const detailsLocation = document.getElementById("detailsSidebarLocation");
const detailsDescription = document.getElementById("detailsSidebarDescription");

const detailsLocationInfoBody = document.getElementById("detailsLocationInfoBody");
const detailsWeatherContent = document.getElementById("detailsWeatherContent");
const detailsDistanceContent = document.getElementById("detailsDistanceContent");

/* NEW: POI DOM CONTAINERS */
const detailsPOI_Tourism = document.getElementById("detailsSidebarTouristList");
const detailsPOI_Restrooms = document.getElementById("detailsSidebarToiletsList");
const detailsPOI_Hotels = document.getElementById("detailsSidebarHotelsList");

/* HUD elements inside sidebar */
const detailsSidebarHud = document.getElementById("detailsSidebarHud");
const detailsHudPrev = document.getElementById("detailsHudPrev");
const detailsHudNext = document.getElementById("detailsHudNext");
const detailsHudLabel = document.getElementById("detailsHudLabel");
const detailsStart = document.getElementById("detailsSidebarStartJourney");

/* NEW: missing element binding */
const detailsClose = document.getElementById("detailsClose");

/* ========================================================================== */
/* SIDEBAR STATE MGMT                                                          */
/* ========================================================================== */

function updateDetailsHud() {
  if (!detailsSidebarHud || !detailsStart) return;

  if (!window.journeyMode || !window.currentID) {
    detailsSidebarHud.style.display = "none";
    detailsStart.style.display = "block";

    detailsStart.onclick = () => {
      startJourney();
      updateHUD();
      if (detailsSidebar.dataset.currentId)
        openDetailsSidebar(detailsSidebar.dataset.currentId);
    };
    return;
  }

  detailsStart.style.display = "none";
  detailsSidebarHud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(window.currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  detailsHudPrev.disabled = !prev;
  detailsHudNext.disabled = !next;

  if (next) {
    const wpNext = getWP(next);
    const icon = getModeIcon(getLegMode(window.currentID));
    detailsHudLabel.innerHTML =
      `Next Stop: <img src="${icon}" class="details-sidebar-hud-mode-icon"> ${escapeHTML(wpNext.location)}
       <span class="details-sidebar-hud-flag" style="background-image:url('${wpNext.meta.flag}')"></span>`;

    if (MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(wpNext);

  } else {
    detailsHudLabel.textContent = "";
  }
}

/* ========================================================================== */
/* RENDERERS (SUNLIGHT HOOK APPLIED IN openDetailsSidebar BELOW)              */
/* ========================================================================== */

function renderLocationInfo(wp) {
  if (!detailsLocationInfoBody || !wp) return;

  const city = escapeHTML(wp.names.city);
  const state = escapeHTML(wp.names.state);
  const country = escapeHTML(wp.names.country);
  const flagUrl = wp.meta.flag;

  const currency = getCurrencyInfo(wp.meta.countryCode);
  const localTime = escapeHTML(formatLocalTime(wp));
  const tzDisplay = escapeHTML(formatTimeZoneWithOffset(wp));

  detailsLocationInfoBody.innerHTML = `
    <div class="details-location-row">
      <div class="details-kv-label">City</div>
      <div class="details-kv-value">${city}</div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">State / Province</div>
      <div class="details-kv-value">${state}</div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Country</div>
      <div class="details-kv-value" style="display:flex; justify-content:flex-end; align-items:center; gap:6px;">
        <img src="${flagUrl}" class="country-flag"> ${country}
      </div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Timezone</div>
      <div class="details-kv-value">
        <span class="details-pill">${tzDisplay}</span>
      </div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Local Time</div>
      <div class="details-kv-value">${localTime}</div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Currency</div>
      <div class="details-kv-value">
        ${currency.code} – ${currency.name}
        <span class="details-pill">${currency.symbol}</span>
      </div>
    </div>`;
}

/* Flag dimension enforcement */
const styleFix = document.createElement("style");
styleFix.textContent = `
  .country-flag,
  .details-location-flag-inline,
  .hud-flag,
  .details-sidebar-hud-flag {
    width: 18px !important;
    height: 12px !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    display: inline-block !important;
  }
`;
document.head.appendChild(styleFix);

function renderDistance(wp) {
  if (!detailsDistanceContent) return;

  const idx = TRIP_ORDER.indexOf(wp.id);
  const lastIdx = TRIP_ORDER.length - 1;

  let html = "";

  if (idx === 0) {
    html += `<div>Starting point of the journey.</div>`;
  } else {
    const legPrev = LEG_DIST[TRIP_ORDER[idx - 1]];
    if (legPrev) {
      html += `<div>Distance from previous stop:<br>
                <strong style="color:#FFA50D">${legPrev.mi} mi</strong>
                <span style="color:#A3A3A3">(${legPrev.km} km)</span>
               </div>`;
    }
  }

  html += `<br><strong>Distance to Next</strong><br>`;

  if (idx === lastIdx) {
    html += `<div>End of route.</div>`;
  } else {
    const legNext = LEG_DIST[wp.id];
    if (legNext) {
      html += `<div><strong style="color:#FFA50D">${legNext.mi} mi</strong>
               <span style="color:#A3A3A3">(${legNext.km} km)</span></div>`;
    }
  }

  detailsDistanceContent.innerHTML = html;
}

function renderWeather(wp) {
  if (!detailsWeatherContent) return;

  detailsWeatherContent.innerHTML = `<div>Loading current weather…</div>`;

  const [lon, lat] = wp.coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    detailsWeatherContent.innerHTML = `<div>Weather unavailable.</div>`;
    return;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const requestId = wp.id;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (detailsSidebar.dataset.currentId !== requestId) return;

      const cw = data?.current_weather;
      if (!cw) throw Error();

      const info = mapWeatherCodeToInfo(cw.weathercode);

      const tempC = cw.temperature;
      const tempF = (tempC * 9) / 5 + 32;
      const windM = cw.windspeed * 0.621371;

      detailsWeatherContent.innerHTML = `
        <div class="details-weather-main">
          <div class="details-weather-icon">${info.icon}</div>
          <div class="details-weather-temp" style="color:#FFA50D;">
            ${tempF.toFixed(1)}°F 
            <span style="color:#A3A3A3">(${tempC.toFixed(1)}°C)</span>
          </div>
        </div>
        <div class="details-weather-meta">
          <div>${info.label}</div>
          <div>Wind: ${windM.toFixed(1)} mi/h 
            <span style="color:#A3A3A3">(${cw.windspeed} km/h)</span>
          </div>
        </div>`;
    })
    .catch(() => {
      if (detailsSidebar.dataset.currentId === requestId)
        detailsWeatherContent.innerHTML = `<div>Weather unavailable.</div>`;
    });
}

/* ========================================================================== */
/* OPEN / CLOSE SIDEBAR (SUNLIGHT HOOK ADDED HERE)                             */
/* ========================================================================== */

window.openDetailsSidebar = function (id) {
  if (!detailsSidebar) return;

  const w = getWP(id);
  if (!w) return;

  detailsSidebar.dataset.currentId = w.id;

  detailsTitle.textContent = w.names.display;
  detailsIcon.src = w.icon;
  detailsIcon.alt = w.names.display;

  const flag = w.meta.flag
    ? `<span class="details-location-flag-inline" style="background-image:url('${w.meta.flag}')"></span>`
    : "";

  detailsLocation.innerHTML =
    `<span class="details-location-header-line">${escapeHTML(w.location)} ${flag}</span>`;

  detailsDescription.textContent = w.description;
  detailsImage.src = w.image;

  renderLocationInfo(w);
  renderWeather(w);
  renderDistance(w);

  updateDetailsHud();

  /* ---- AUTO-LOAD MAPBOX POIs ---- */
  loadPOIsForWaypoint(w, detailsPOI_Tourism, detailsPOI_Restrooms, detailsPOI_Hotels);

  /* ---- PRIME SIDEBAR SEARCH CONTEXT ---- */
  if (typeof window.setSidebarSearchContext === "function") {
    const label = `${w.names.city}, ${w.names.country}`;
    window.setSidebarSearchContext(w.coords, label);
  }

  /* ---- NEW: UPDATE SUNLIGHT SAFE MODE (K2) ---- */
  if (MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(w);

  detailsSidebar.classList.add("open");
  detailsOverlay?.classList.add("open");
};

function closeDetailsSidebar() {
  if (!detailsSidebar) return;
  detailsSidebar.classList.remove("open");
  detailsOverlay?.classList.remove("open");
  delete detailsSidebar.dataset.currentId;
}

/* NEW FIXED BINDING */
detailsClose?.addEventListener("click", closeDetailsSidebar);

detailsOverlay?.addEventListener("click", () => {
  if (detailsSidebar.classList.contains("open")) closeDetailsSidebar();
});

document.addEventListener("click", e => {
  if (!detailsSidebar.classList.contains("open")) return;
  if (e.target.closest(".details-btn")) return;
  if (detailsSidebar.contains(e.target)) return;
  closeDetailsSidebar();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && detailsSidebar.classList.contains("open"))
    closeDetailsSidebar();
});

/* clicking "Details" inside popup opens sidebar */
document.addEventListener("click", e => {
  const btn = e.target.closest(".details-btn");
  if (!btn) return;
  const id = btn.dataset.details;
  if (id) openDetailsSidebar(id);
});

/* ========================================================================== */
/* SIDEBAR HUD NAVIGATION                                                      */
/* ========================================================================== */

detailsHudPrev?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx > 0) {
    const target = TRIP_ORDER[idx - 1];
    undoTo(target);
    openDetailsSidebar(target);
  }
});

detailsHudNext?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx < TRIP_ORDER.length - 1) {
    const target = TRIP_ORDER[idx + 1];
    animateLeg(window.currentID, target);
    openDetailsSidebar(target);
  }
});

/* Keep sidebar HUD in sync with main HUD */
if (typeof window.updateHUD === "function") {
  const original = window.updateHUD;
  window.updateHUD = function () {
    original();
    updateDetailsHud();
  };
}

/* ========================================================================== */
/* JOURNEY TOGGLE + STATIC RESET (+ SUNLIGHT HOOKS FOR JOURNEY MODE)         */
/* ========================================================================== */

const journeyToggleBtn = document.getElementById("journeyToggle");
const resetStaticMapBtn = document.getElementById("resetStaticMap");

/* Update journey button label */
function updateJourneyButton() {
  if (!journeyToggleBtn) return;
  journeyToggleBtn.textContent = window.journeyMode ? "Reset Journey" : "Start Journey";
}

/* Toggle journey mode */
journeyToggleBtn?.addEventListener("click", () => {
  if (window.journeyMode) {
    resetJourney();
  } else {
    startJourney();
  }
  updateJourneyButton();
});

/* Static reset (non-journey) */
resetStaticMapBtn?.addEventListener("click", () => {
  if (window.journeyMode) return;

  window.userInterrupted = true;
  window.spinning = false;

  closeAllPopups();
  stopOrbit();

  __MAP.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: DEFAULT_PITCH,
    bearing: 0
  });

  setTimeout(() => {
    window.spinning = true;
    spinGlobe();
  }, 200);

  resetStaticMapBtn.style.display = "none";
});

/* Initial label state */
updateJourneyButton();

/* ========================================================================== */
/* ADD SUNLIGHT UPDATE HOOKS TO JOURNEY EVENTS                                */
/* ========================================================================== */

/* Patch animateLeg to update sunlight at completion */
if (typeof window.animateLeg === "function") {
  const originalAnimateLeg = window.animateLeg;
  window.animateLeg = function(a, b) {
    originalAnimateLeg(a, b);

    /* After animation finishes, sunlight should update for waypoint b */
    const wp = getWP(b);
    if (wp && MAP_READY && __MAP.getLayer("sky")) {
      updateSunForWaypoint(wp);
    }
  };
}

/* Patch undoTo to update sunlight */
if (typeof window.undoTo === "function") {
  const originalUndo = window.undoTo;
  window.undoTo = function(id) {
    originalUndo(id);

    const wp = getWP(id);
    if (wp && MAP_READY && __MAP.getLayer("sky")) {
      updateSunForWaypoint(wp);
    }
  };
}

/* Patch startJourney for sunlight on first waypoint */
if (typeof window.startJourney === "function") {
  const originalStartJ = window.startJourney;
  window.startJourney = function() {
    originalStartJ();

    const wp = getWP(window.currentID);
    if (wp && MAP_READY && __MAP.getLayer("sky")) {
      updateSunForWaypoint(wp);
    }
  };
}

/* Patch resetJourney to reset global sky to DEFAULT_CENTER time if desired */
if (typeof window.resetJourney === "function") {
  const originalReset = window.resetJourney;
  window.resetJourney = function() {
    originalReset();

    /* If you want: reset sunlight to Sydney, or disable entirely.  
       Right now we RESET TO NO SUN UPDATE to avoid misleading visuals */
    // const wp = getWP("sydney");
    // if (wp && MAP_READY && __MAP.getLayer("sky")) updateSunForWaypoint(wp);
  };
}

/* ========================================================================== */

console.log("%cmap-ui.js fully loaded", "color:#00e5ff;font-weight:bold;");
