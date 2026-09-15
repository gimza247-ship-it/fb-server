// ============================================
// server.js - รันบน VPS แทน CommandServer.ps1
// ทำหน้าที่เดียวกัน: เก็บลิงก์/ข้อความล่าสุด แล้วให้ Extension มาเช็คได้
// ============================================
const http = require("http");

const PORT = process.env.PORT || 8787;
let current = { url: "", message: "", refreshVersion: 0 };

const server = http.createServer((req, res) => {
  // อนุญาตให้ extension จากทุกเครื่องคุยด้วยได้
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === "/get" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(current));
    return;
  }

  if (req.url === "/set" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        current.url = data.url || "";
        current.message = data.message || "";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "invalid json" }));
      }
    });
    return;
  }

  if (req.url === "/refresh" && req.method === "POST") {
    current.refreshVersion = (current.refreshVersion || 0) + 1;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, refreshVersion: current.refreshVersion }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Server ทำงานแล้วที่พอร์ต ${PORT}`);
});
