import express from "express";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDist = path.join(__dirname, "dist");
app.use(express.static(clientDist));

// helper: find LAN ip
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

// endpoint used by admin.js to build join link
app.get("/api/ip", (req, res) => {
  res.json({ ip: getLanIp(), port: PORT });
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  const ip = getLanIp();
  console.log("✅ Server running:");
  console.log(`Teacher URL (LAN):  http://${ip}:${PORT}/`);
  console.log(`Join URL (LAN):     http://${ip}:${PORT}/join`);
  console.log("⚠️ Do NOT use localhost if students are on other devices.");
});
