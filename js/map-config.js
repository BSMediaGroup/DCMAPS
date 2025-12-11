/* ============================================================
   MAP CONFIG MODULE — v6 (FINAL, CLEAN, CONSISTENT TIMEZONE + SUN-SAFE TIME FORMAT)
   ============================================================ */

console.log("map-config.js loaded");

/* ============================================================
   DEFAULT MAP VIEW SETTINGS (TRUE MONOLITH VALUES)
   ============================================================ */

// Default view keeps the globe level and centered on the equator so auto-spin
// uses a clean north–south axis and the sphere sits visually centered.
window.DEFAULT_CENTER = [0, 0];
window.DEFAULT_ZOOM   = 1.9;
window.DEFAULT_PITCH  = 0;

/* ============================================================
   GLOBAL STATE FLAGS
   ============================================================ */

window.MAP_READY       = false;
window.spinning        = true;
window.userInterrupted = false;
window.journeyMode     = false;
window.currentID       = null;

/* ============================================================
   ORBIT CAMERA CONSTANTS
   ============================================================ */

// Sharper waypoint focus: closer zoom and steeper tilt.
window.ORBIT_ZOOM_TARGET    = 14.5;
window.ORBIT_PITCH_TARGET   = 65;
window.ORBIT_ROTATION_SPEED = 0.015;
window.ORBIT_ENTRY_DURATION = 900;

/* ============================================================
   JOURNEY CAMERA CONSTANTS
   ============================================================ */

window.JOURNEY_PITCH_TARGET = 62;
window.JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;
window.JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET - 1.25;

/* ============================================================
   IMPORTANT NOTE ABOUT TRIP ORDER
   ============================================================ */
/*
   TRIP_ORDER **must ONLY be defined in map-data.js**, because the waypoint
   list is the single source of truth.

   Therefore:
     We DO NOT define TRIP_ORDER or DRIVE_ORDER here.
*/

/* ============================================================
   MODE ICONS
   ============================================================ */

window.MODE_ICONS = {
  "Plane": "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  "Drive": "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car.svg"
};

/* ============================================================
   CURRENCY MAP + HELPERS
   ============================================================ */

window.CURRENCY_INFO = {
  "AU": { code: "AUD", name: "Australian Dollar",    symbol: "A$"  },
  "US": { code: "USD", name: "United States Dollar", symbol: "US$" },
  "CA": { code: "CAD", name: "Canadian Dollar",      symbol: "CA$" }
};

window.getCurrencyInfo = function (code) {
  return CURRENCY_INFO[code] || { code: "—", name: "Unknown", symbol: "?" };
};

/* ============================================================
   TIMEZONE HELPERS — SUN ENGINE SAFE FORMAT
   ============================================================ */
/*
   CRITICAL CHANGE:
   updateSunForWaypoint() requires EXACT format:
       "1:07 AM"
       "11:53 PM"

   Therefore:
     - We NO LONGER include weekday/date inside the string.
     - We output ONLY the time.
*/

/** Local time string (SUN-SAFE): "1:07 AM" */
window.formatLocalTime = function (wp) {
  const tz     = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";
  if (!tz) return "12:00 AM";    // failsafe for sunlight engine

  try {
    const now = new Date();

    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    // Example: "1:07 AM"
    return fmt.format(now);

  } catch (err) {
    console.error("formatLocalTime failed:", err);
    return "12:00 AM";
  }
};

/** Timezone label: "America/Toronto (UTC-05:00)" */
window.formatTimeZoneWithOffset = function (wp) {
  const tz     = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";
  if (!tz) return "N/A";

  try {
    const now = new Date();

    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "shortOffset"
    });

    const parts  = fmt.formatToParts(now);
    let offset   = parts.find(p => p.type === "timeZoneName")?.value || "";

    if (offset.startsWith("GMT")) offset = "UTC" + offset.slice(3);

    return `${tz} (${offset})`;
  } catch (err) {
    console.error("formatTimeZoneWithOffset failed:", err);
    return tz;
  }
};

/* ============================================================
   WEATHER CODE MAP
   ============================================================ */

window.mapWeatherCodeToInfo = function (code) {
  const c = Number(code);
  if (isNaN(c)) return { label: "Unknown", icon: "?" };

  if (c === 0) return { label: "Clear sky", icon: "☀️" };
  if (c === 1 || c === 2) return { label: "Mostly clear", icon: "🌤️" };
  if (c === 3) return { label: "Overcast", icon: "☁️" };
  if (c === 45 || c === 48) return { label: "Fog", icon: "🌫️" };
  if (c >= 51 && c <= 55) return { label: "Drizzle", icon: "🌦️" };
  if (c >= 61 && c <= 65) return { label: "Rain", icon: "🌧️" };
  if (c === 66 || c === 67) return { label: "Freezing rain", icon: "🌧️" };
  if (c >= 71 && c <= 75) return { label: "Snow", icon: "❄️" };
  if (c === 77) return { label: "Snow grains", icon: "❄️" };
  if (c >= 80 && c <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (c === 85 || c === 86) return { label: "Snow showers", icon: "🌨️" };
  if (c === 95) return { label: "Thunderstorm", icon: "⛈️" };
  if (c === 96 || c === 99) return { label: "Storm w/ hail", icon: "⛈️" };

  return { label: "Unknown", icon: "?" };
};

/* ============================================================
   EXPORT
   ============================================================ */

window.CONFIG = {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DEFAULT_PITCH,
  ORBIT_ZOOM_TARGET,
  ORBIT_PITCH_TARGET,
  ORBIT_ROTATION_SPEED,
  ORBIT_ENTRY_DURATION,
  JOURNEY_PITCH_TARGET,
  JOURNEY_ZOOM_DEFAULT,
  JOURNEY_ZOOM_LA,
  MODE_ICONS,
  CURRENCY_INFO
};

console.log("%cmap-config.js fully loaded", "color:#00e5ff;font-weight:bold;");
