/* ========================================================================== */
/* =============================== MAP DATA ================================= */
/* ========================================================================== */

console.log("%cmap-data.js loaded", "color:#00aaff;font-weight:bold;");

/* ==========================================================================
   FLAG ICON SOURCES — stable SVGs (monolith-equivalent)
   ========================================================================== */
const FLAG_AU = "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/au.svg";
const FLAG_CA = "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/ca.svg";
const FLAG_US = "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/us.svg";

/* ==========================================================================
   MARKER ICON SOURCES — EXACT from monolith v1
   ========================================================================== */
const ICON_DEPARTURE = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/PNG/dcpin.png";
const ICON_MAJOR     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/PNG/MajorWP2.png";
const ICON_MINOR     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/PNG/waypoint.png";
const ICON_CANPIN    = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/PNG/CANpin.png";
const ICON_FINAL     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/PNG/STARBARX.png";

/* ==========================================================================
   WAYPOINT IMAGES — 1:1 with monolith
   ========================================================================== */
const IMG_SYDNEY     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/sydney1.webp";
const IMG_LOSANGELES = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/losangeles1.webp";
const IMG_TORONTO    = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/toronto.webp";
const IMG_HAMILTON   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/hamilton.webp";
const IMG_NIAGARA    = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/niagara.webp";
const IMG_BOSTON     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/dce5946f2d2d347ed5f2af26c8a5e7be80eab943/IMG/boston.webp";
const IMG_ROCHESTER  = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/rochester.webp";
const IMG_GENEVA     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/geneva.webp";
const IMG_SYRACUSE   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/syracuse.webp";
const IMG_UTICA      = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/utica.webp";
const IMG_ALBANY     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/albany.webp";
const IMG_PROVIDENCE = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/providence.jpg";
const IMG_NEWHAVEN   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/newhaven.jpg";
const IMG_NYC        = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/newyork2.webp";
const IMG_HOBOKEN    = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/hoboken.webp";
const IMG_NEWARK     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/newark.webp";
const IMG_TOMSRIVER  = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/tomsriver.webp";

/* ==========================================================================
   FULL WAYPOINT LIST — EXACT 1:1 FROM MONOLITH (links fields nullified)
   ========================================================================== */
const WAYPOINTS = [
  /* ————————————————— SYDNEY ————————————————— */
  {
    id: "sydney",
    role: "departure",
    mode: "Plane",
    coords: [151.177222, -33.946111],

    location: "Sydney Kingsford Smith Airport (SYD)",
    names: {
      display: "Departure – Sydney",
      basic: "Sydney, NSW",
      city: "Sydney",
      state: "NSW",
      country: "Australia"
    },

    description: "Starting point of the North America trip, departing from Sydney.",

    icon: ICON_DEPARTURE,
    image: IMG_SYDNEY,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_AU,
      timezone: "Australia/Sydney",
      locale: "en-AU",
      countryCode: "AU"
    }
  },

  /* ————————————————— LOS ANGELES ————————————————— */
  {
    id: "la",
    role: "major",
    mode: "Plane",
    coords: [-118.403616889565, 33.94247880317191],

    location: "Los Angeles International Airport (LAX)",
    names: {
      display: "Major Waypoint – Los Angeles",
      basic: "Los Angeles, CA",
      city: "Los Angeles",
      state: "CA",
      country: "United States"
    },

    description: "Stopover at LAX before continuing to Toronto.",

    icon: ICON_MAJOR,
    image: IMG_LOSANGELES,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_US,
      timezone:"America/Los_Angeles",
      locale: "en-US",
      countryCode:"US"
    }
  },

  /* ————————————————— TORONTO ————————————————— */
  {
    id: "toronto",
    role: "toronto",
    mode: "Car",
    coords: [-79.62726381614229, 43.680452176904645],

    location: "Toronto Pearson International Airport (YYZ)",
    names: {
      display: "Arrival – Toronto",
      basic: "Toronto, ON",
      city: "Toronto",
      state: "ON",
      country: "Canada"
    },

    description: "Meeting Shawn and starting road trip.",

    icon: ICON_CANPIN,
    image: IMG_TORONTO,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_CA,
      timezone:"America/Toronto",
      locale:"en-CA",
      countryCode:"CA"
    }
  },

  /* ————————————————— HAMILTON ————————————————— */
  {
    id: "hamilton",
    role: "minor",
    mode: "Car",
    coords: [-79.8711, 43.2557],

    location: "Hamilton, Ontario",
    names: {
      display: "Waypoint – Hamilton",
      basic: "Hamilton, ON",
      city: "Hamilton",
      state: "ON",
      country: "Canada"
    },

    description: "Passing Hamilton on the way to Niagara.",

    icon: ICON_MINOR,
    image: IMG_HAMILTON,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_CA,
      timezone:"America/Toronto",
      locale:"en-CA",
      countryCode:"CA"
    }
  },

  /* ————————————————— NIAGARA FALLS ————————————————— */
  {
    id: "niagarafalls",
    role: "minor",
    mode: "Car",
    coords: [-79.0849, 43.0896],

    location: "Niagara Falls, Ontario",
    names: {
      display:"Waypoint – Niagara Falls",
      basic:"Niagara Falls, ON",
      city:"Niagara Falls",
      state:"ON",
      country:"Canada"
    },

    description:"Crossing the border after Niagara.",

    icon: ICON_MINOR,
    image: IMG_NIAGARA,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_CA,
      timezone:"America/Toronto",
      locale:"en-CA",
      countryCode:"CA"
    }
  },

  /* ————————————————— REMAINING WAYPOINTS ————————————————— */
  {
    id:"rochester",
    role:"minor",
    mode:"Car",
    coords:[-77.6088,43.1566],
    location:"Rochester NY",

    names:{
      display:"Waypoint – Rochester",
      basic:"Rochester, NY",
      city:"Rochester",
      state:"NY",
      country:"United States"
    },

    description:"Passing Rochester heading east.",
    icon: ICON_MINOR,
    image: IMG_ROCHESTER,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"geneva",
    role:"minor",
    mode:"Car",
    coords:[-76.9856,42.8684],
    location:"Geneva NY",

    names:{
      display:"Waypoint – Geneva",
      basic:"Geneva, NY",
      city:"Geneva",
      state:"NY",
      country:"United States"
    },

    description:"Finger Lakes waypoint.",
    icon: ICON_MINOR,
    image: IMG_GENEVA,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"syracuse",
    role:"minor",
    mode:"Car",
    coords:[-76.1474,43.0481],
    location:"Syracuse NY",

    names:{
      display:"Waypoint – Syracuse",
      basic:"Syracuse, NY",
      city:"Syracuse",
      state:"NY",
      country:"United States"
    },

    description:"Another major eastbound point.",
    icon: ICON_MINOR,
    image: IMG_SYRACUSE,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"utica",
    role:"minor",
    mode:"Car",
    coords:[-75.2327,43.1009],
    location:"Utica NY",

    names:{
      display:"Waypoint – Utica",
      basic:"Utica, NY",
      city:"Utica",
      state:"NY",
      country:"United States"
    },

    description:"Passing Utica on I-90.",
    icon: ICON_MINOR,
    image: IMG_UTICA,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"albany",
    role:"minor",
    mode:"Car",
    coords:[-73.7562,42.6526],
    location:"Albany NY",

    names:{
      display:"Waypoint – Albany",
      basic:"Albany, NY",
      city:"Albany",
      state:"NY",
      country:"United States"
    },

    description:"New York’s state capital.",
    icon: ICON_MINOR,
    image: IMG_ALBANY,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  /* ————————————————— BOSTON ————————————————— */
  {
    id: "boston",
    role: "major",
    mode: "Car",
    coords: [-71.0589, 42.3601],

    location: "Boston, Massachusetts",

    names: {
      display: "Major Waypoint – Boston",
      basic: "Boston, MA",
      city: "Boston",
      state: "MA",
      country: "United States"
    },

    description: "Arriving in Boston to pick up dear GeenaR the hard aRling ❤️",

    icon: ICON_MAJOR,
    image: IMG_BOSTON,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "providence",
    role: "minor",
    mode: "Car",
    coords: [-71.4128, 41.824],

    location: "Providence RI",
    names: {
      display: "Waypoint – Providence",
      basic: "Providence, RI",
      city: "Providence",
      state: "RI",
      country: "United States"
    },

    description: "Quick Rhode Island stop leaving Boston.",
    icon: ICON_MINOR,
    image: IMG_PROVIDENCE,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "newhaven",
    role: "minor",
    mode: "Car",
    coords: [-72.9279, 41.3083],

    location: "New Haven CT",
    names: {
      display: "Waypoint – New Haven",
      basic: "New Haven, CT",
      city: "New Haven",
      state: "CT",
      country: "United States"
    },

    description: "Cruising coastal Connecticut en route to NYC.",
    icon: ICON_MINOR,
    image: IMG_NEWHAVEN,

    links: {
      search: null,
      toilets: null,
      hotels: null
    },

    meta: {
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id:"nyc",
    role:"major",
    mode:"Car",
    coords:[-73.98518854058835,40.758137170862625],
    location:"Times Square",

    names:{
      display:"Major Waypoint – New York City",
      basic:"New York, NY",
      city:"New York",
      state:"NY",
      country:"United States"
    },

    description:"NYC before heading south.",
    icon: ICON_MAJOR,
    image: IMG_NYC,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"hoboken",
    role:"minor",
    mode:"Car",
    coords:[-74.0324,40.7433],
    location:"Hoboken NJ",

    names:{
      display:"Waypoint – Hoboken",
      basic:"Hoboken, NJ",
      city:"Hoboken",
      state:"NJ",
      country:"United States"
    },

    description:"Passing through Hoboken waterfront.",
    icon: ICON_MINOR,
    image: IMG_HOBOKEN,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"newark",
    role:"major",
    mode:"Car",
    coords:[-74.1706,40.7336],
    location:"Prudential Center",

    names:{
      display:"Major Waypoint – Newark",
      basic:"Newark, NJ",
      city:"Newark",
      state:"NJ",
      country:"United States"
    },

    description:"Meet-up with Amanda & Davey from Missouri.",
    icon: ICON_MAJOR,
    image: IMG_NEWARK,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  },

  {
    id:"tomsriver",
    role:"destination",
    mode:"Car",
    coords:[-74.18603,39.962545],
    location:"179 NJ-37 East, Toms River NJ",

    names:{
      display:"Final Destination – Toms River",
      basic:"Toms River, NJ",
      city:"Toms River",
      state:"NJ",
      country:"United States"
    },

    description:"Final stop of the road trip campaign.",
    icon: ICON_FINAL,
    image: IMG_TOMSRIVER,

    links:{
      search: null,
      toilets: null,
      hotels: null
    },

    meta:{
      flag: FLAG_US,
      timezone:"America/New_York",
      locale:"en-US",
      countryCode:"US"
    }
  }
];

/* ==========================================================================
   TRIP ORDER — FULL SEQUENCE (MONOLITH)
   IMPORTANT FIX:
   Do NOT override TRIP_ORDER defined earlier in map-config.js.
   ========================================================================== */
const TRIP_ORDER = window.TRIP_ORDER || WAYPOINTS.map(w => w.id);

/* ==========================================================================
   DRIVE ORDER — all waypoints after Toronto (unless map-config.js overrides)
   ========================================================================== */
const DRIVE_ORDER =
  window.DRIVE_ORDER || TRIP_ORDER.slice(TRIP_ORDER.indexOf("toronto"));

/* ==========================================================================
   EXPORT GLOBALS
   ========================================================================== */
window.WAYPOINTS   = WAYPOINTS;
window.TRIP_ORDER  = TRIP_ORDER;
window.DRIVE_ORDER = DRIVE_ORDER;

console.log("%cmap-data.js fully loaded", "color:#00ff88;font-weight:bold;");

