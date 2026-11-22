// Static server for the exported site. Serves ./out on the LAN so a phone on the same Wi-Fi can open it.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const root = path.resolve("out");
const port = Number(process.env.PORT || 3008);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".glb": "model/gltf-binary", ".hdr": "application/octet-stream", ".woff2": "font/woff2", ".txt": "text/plain",
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file)) { file = path.join(root, "404.html"); res.statusCode = 404; }
  const ext = path.extname(file);
  res.setHeader("Content-Type", types[ext] || "application/octet-stream");
  if (/\.(glb|webp|hdr|js|css|woff2)$/.test(ext)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(file).pipe(res);
}).listen(port, "0.0.0.0", () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log(`Handyman 3D running on http://localhost:${port}`);
  for (const ip of ips) console.log(`On your phone (same Wi-Fi): http://${ip}:${port}`);
});
