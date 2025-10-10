const fs = require('fs');
const https = require('https');

const points = [
  { name: 'Webb Street Art', lat: -41.2963, lng: 174.7707 },
  // ... add all others
];

const markers = points.map(p => `markers=${p.lat},${p.lng}`).join('&');
const url = `https://maps.googleapis.com/maps/api/staticmap?center=-41.2924,174.7787&zoom=14&size=1200x1200&maptype=roadmap&${markers}&key=YOUR_API_KEY`;

https.get(url, res => {
  const file = fs.createWriteStream('wellington_art_map.png');
  res.pipe(file);
});