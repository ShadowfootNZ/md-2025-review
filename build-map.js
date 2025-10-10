// build-map.js
// Node.js script: read points.json (missions.*.portals[*].location) and produce map.html
const fs = require('fs');
const path = require('path');

const IN = 'points.json';      // rename your JSON to points.json or change IN
const OUT = 'map.html';

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
    return L.circleMarker(latlng, { radius: 5, weight:1, color:'rgba(255, 255, 0, 1)', fillColor:'rgba(255, 255, 0, 1)', fillOpacity:0.9 });
  }

  function onEachFeature(feature, layer) {
    const title = (feature.properties && feature.properties.title) || 'Portal';
    layer.bindPopup('<strong>' + escapeHtml(title) + '</strong>');
  }

  const gj = L.geoJSON(data, { pointToLayer, onEachFeature }).addTo(map);

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