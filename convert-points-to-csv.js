// save as convert-points-to-csv.js
const fs = require("fs");

const data = JSON.parse(fs.readFileSync("points.json", "utf8"));
const rows = [
  ["Mission", "Index", "Title", "Description", "Latitude", "Longitude", "Image"],
];

(data.missions || []).forEach((m, mi) => {
  (m.portals || []).forEach((p, pi) => {
    rows.push([
      mi + 1,
      pi + 1,
      p.title || "",
      (p.description || "").replace(/\s+/g, " ").trim(),
      p.location?.latitude ?? "",
      p.location?.longitude ?? "",
      p.imageUrl || "",
    ]);
  });
});

const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
fs.writeFileSync("mission-portals.csv", csv);
console.log("Created mission-portals.csv");