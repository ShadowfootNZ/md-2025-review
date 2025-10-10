// build-map.js
// Node.js script: read points.json (missions.*.portals[*].location) and produce map.html
//
// HOW TO USE:
// 1. Place your mission data in a file named `points.json` in the same directory.
//    - The script supports several formats, including a GeoJSON FeatureCollection,
//      an array of {lat, lng, title} objects, or the specific mission data structure
//      it was originally designed for.
// 2. Run this script from your terminal: `node build-map.js`
// 3. Open the generated `map.html` file in your web browser to see the map.
//
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// IN: The name of the input JSON file containing the points data.
//     You can rename your data file to points.json or change this constant.
const IN = 'points.json';      // rename your JSON to points.json or change IN
// OUT: The name of the output HTML file that will be generated.
const OUT = 'map.html';
// --- END CONFIGURATION ---

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('Failed to read/parse', file, e.message);
    process.exit(1);
  }
}

function extractFeatures(json) {
  const features = [];
  if (!json) return features;

  // If it's a FeatureCollection already, return those features
  if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
    return json.features;
  }

  // If it's array of {lat,lng,title}
  if (Array.isArray(json) && json.length && typeof json[0].lat === 'number') {
    json.forEach(p => {
      features.push({
        type: 'Feature',
        properties: { title: p.title || p.name || '' },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
      });
    });
    return features;
  }

  // Otherwise look for missions[*].portals[*].location
  if (Array.isArray(json.missions)) {
    json.missions.forEach((mission, mi) => {
      (mission.portals || []).forEach((portal, pi) => {
        const loc = portal.location || portal.lat || portal.geometry;
        let lat, lng;
        if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          lat = loc.latitude; lng = loc.longitude;
        } else if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          lat = loc.lat; lng = loc.lng;
        } else if (portal.geometry && portal.geometry.type === 'Point' && Array.isArray(portal.geometry.coordinates)) {
          lng = portal.geometry.coordinates[0];
          lat = portal.geometry.coordinates[1];
        }
        if (typeof lat === 'number' && typeof lng === 'number') {
          features.push({
            type: 'Feature',
            properties: { title: portal.title || `Portal ${mi+1}-${pi+1}` },
            geometry: { type: 'Point', coordinates: [lng, lat] }
          });
        }
      });
    });
  }
  return features;
}

const json = loadJSON(path.join(__dirname, IN));
const features = extractFeatures(json);

if (features.length === 0) {
  console.error('No points found in', IN);
  process.exit(1);
}

const geojson = { type: 'FeatureCollection', features };

// --- MIMOSA POINTS ---
// This is a hardcoded list of special points to be displayed on the map with
// custom colors and sizes. You can modify, add, or remove points from this array.
// - `name`: The name of the point, shown in the popup.
// - `lat`, `lng`: The coordinates of the point.
// - `color`: The color of the marker.
// - `isPrimary`: A boolean to determine the marker size (true for larger, false for smaller).
//
// 12 Mimosa points with rainbow colours repeated, with isPrimary property
const rainbowColors = ["#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787"];
const mimosaPoints = [
  { name: "Joe's Garage", lat: -41.292189690157905, lng: 174.78185449670508, color: rainbowColors[0], isPrimary: true },
  { name: "Loretta", lat: -41.294044148279774, lng: 174.77530972689672, color: rainbowColors[0], isPrimary: false },
  { name: "Nolita", lat: -41.29488254887213, lng: 174.77490203596696, color: rainbowColors[1], isPrimary: true },
  { name: "Southern Cross Garden Bar", lat: -41.296317501677066, lng: 174.77447289274116, color: rainbowColors[1], isPrimary: false },
  { name: "The Arborist", lat: -41.290497143373244, lng: 174.77372169915301, color: rainbowColors[2], isPrimary: true },
  { name: "Floriditas", lat: -41.29357657759339, lng: 174.7755886722603, color: rainbowColors[2], isPrimary: false },
  { name: "Bin 44", lat: -41.284354147668736, lng: 174.77891393424025, color: rainbowColors[3], isPrimary: true },
  { name: "Thunderbird", lat: -41.28345136146265, lng: 174.77676828569977, color: rainbowColors[3], isPrimary: false },
  { name: "Chouchou5", lat: -41.289868093231775, lng: 174.7804594031484, color: rainbowColors[4], isPrimary: true },
  // { name: "Mimosa 11", lat: -41.3011, lng: 174.8011, color: rainbowColors[4], isPrimary: false },
  { name: "Dockside", lat: -41.28428962288169, lng: 174.779450328553, color: rainbowColors[5], isPrimary: true },
  { name: "St John's Bar & Restaurant", lat: -41.28949734603456, lng: 174.77919335626228, color: rainbowColors[5], isPrimary: false }
];

// HTML template with inline geojson
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>MD 2025 — Wellington points</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body {
    height:100%;
    margin:0;
    background:#111; /* dark background */
  }
  header, footer {
    background:#111;
    color:#eee;
    font-family:system-ui;
  }
  #map {
    height:calc(100% - 70px);
    width:100%;
    background:#000; /* plain dark background for map area */
  }
  .leaflet-popup-content-wrapper{background:#222;color:#fff}
</style>
</head>
<body>
<header><strong>Mission Day 2025 — Wellington</strong></header>
<div id="map" role="region" aria-label="Map of portals"></div>
<footer id="status">Loaded ${features.length} points</footer>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  // Inline GeoJSON data
  const data = ${JSON.stringify(geojson)};

  const map = L.map('map').setView([-41.2924,174.7787], 14);

  // CartoDB Dark Matter tiles (dark basemap)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  // style for markers
  function pointToLayer(feature, latlng) {
    return L.circleMarker(latlng, { radius: 5, weight:1, color:'#fff', fillColor:'#fff', fillOpacity:0.9 });
  }

  function onEachFeature(feature, layer) {
    const title = (feature.properties && feature.properties.title) || 'Portal';
    layer.bindPopup('<strong>' + escapeHtml(title) + '</strong>');
  }

  const gj = L.geoJSON(data, { pointToLayer, onEachFeature }).addTo(map);

  // Add Mimosa points as a colored overlay
  const mimosa = ${JSON.stringify({
    type: "FeatureCollection",
    features: mimosaPoints.map(p => ({
      type: "Feature",
      properties: { title: p.name, color: p.color, isPrimary: p.isPrimary },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] }
    }))
  })};

  L.geoJSON(mimosa, {
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: feature.properties.isPrimary ? 8 : 5,
        weight: 2,
        color: feature.properties.color,
        fillColor: feature.properties.color,
        fillOpacity: 1
      }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup('<strong>' + feature.properties.title + '</strong>');
    }
  }).addTo(map);

  // fit to bounds
  try {
    map.fitBounds(gj.getBounds().pad(0.1));
  } catch (e) {
    // ignore
  }

  // simple escape for popup
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, OUT), html, 'utf8');
console.log(`Wrote ${OUT} with ${features.length} points.`);