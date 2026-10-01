// ============================================
// server.js - รันบน Render/VPS
// มี: รหัสลับ + หน้าเว็บมือถือ + launch (เปิด Chrome) + close (ปิด Chrome) + นับออนไลน์
// ============================================
const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 8787;
const SECRET = process.env.SECRET || "CHANGE_ME_1234";

let current = { url: "", message: "", refreshVersion: 0, launchVersion: 0, closeVersion: 0 };

// นับ extension ที่ออนไลน์: เก็บ id -> เวลาที่เช็คอินล่าสุด
let clients = {};
const ONLINE_WINDOW_MS = 6000; // ถือว่ายังออนไลน์ถ้าเช็คอินภายใน 6 วินาที

function countOnline() {
  const now = Date.now();
  let n = 0;
  for (const id in clients) {
    if (now - clients[id] <= ONLINE_WINDOW_MS) n++;
    else delete clients[id];
  }
  return n;
}

function checkAuth(query, headers) {
  const key = (query && query.key) || (headers && headers["x-secret"]) || "";
  return key === SECRET;
}
function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-secret");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;
  const query = parsed.query;

  if (path === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(CONTROL_PAGE);
    return;
  }
  if (path === "/ping") { sendJson(res, 200, { ok: true }); return; }

  if (path === "/get" && req.method === "GET") {
    if (!checkAuth(query, req.headers)) { sendJson(res, 401, { error: "unauthorized" }); return; }
    // ถ้ามี id แนบมา = เป็น extension มาเช็คอิน -> นับว่าออนไลน์
    if (query.id) clients[query.id] = Date.now();
    sendJson(res, 200, current);
    return;
  }

  // ---------- สถานะ: จำนวน Chrome ที่ออนไลน์ ----------
  if (path === "/status" && req.method === "GET") {
    if (!checkAuth(query, req.headers)) { sendJson(res, 401, { error: "unauthorized" }); return; }
    sendJson(res, 200, { online: countOnline() });
    return;
  }

  if (path === "/set" && req.method === "POST") {
    if (!checkAuth(query, req.headers)) { sendJson(res, 401, { error: "unauthorized" }); return; }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        current.url = data.url || "";
        current.message = data.message || "";
        sendJson(res, 200, { ok: true });
      } catch (e) { sendJson(res, 400, { ok: false, error: "invalid json" }); }
    });
    return;
  }
  if (path === "/refresh" && req.method === "POST") {
    if (!checkAuth(query, req.headers)) { sendJson(res, 401, { error: "unauthorized" }); return; }
    current.refreshVersion = (current.refreshVersion || 0) + 1;
    sendJson(res, 200, { ok: true });
    return;
  }
  if (path === "/launch" && req.method === "POST") {
    if (!checkAuth(query, req.headers)) { sendJson(res, 401, { error: "unauthorized" }); return; }
    current.launchVersion = (current.launchVersion || 0) + 1;
    sendJson(res, 200, { ok: true });
    return;
  }
  // ---------- สั่งปิด Chrome ทุก profile (ให้ Agent บนคอมทำ) ----------
  if (path === "/close" && req.method === "POST") {
    if (!checkAuth(query, req.headers)) { sendJson(res, 401, { error: "unauthorized" }); return; }
    current.closeVersion = (current.closeVersion || 0) + 1;
    sendJson(res, 200, { ok: true });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => { console.log("Server ทำงานแล้วที่พอร์ต " + PORT); });

// ============================================
const CONTROL_PAGE = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ตัวควบคุม</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; max-width: 480px; margin: 0 auto; padding: 16px; background: #f0f2f5; color: #050505; }
  @media (prefers-color-scheme: dark) {
    body { background: #18191a; color: #e4e6eb; }
    input, textarea, .lib { background: #242526 !important; color: #e4e6eb !important; border-color: #3a3b3c !important; }
    .card { background: #242526 !important; }
  }
  h2 { font-size: 18px; margin: 8px 0 16px; }
  .card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  label { font-size: 13px; color: #65676b; display: block; margin-bottom: 4px; }
  input, textarea { width: 100%; padding: 10px; font-size: 15px; border: 1px solid #ccd0d5; border-radius: 8px; margin-bottom: 12px; background: #fff; }
  textarea { min-height: 70px; resize: vertical; }
  button { width: 100%; padding: 13px; font-size: 15px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 8px; }
  .primary { background: #1877f2; color: #fff; }
  .refresh { background: #42b72a; color: #fff; }
  .launch { background: #f7b928; color: #050505; }
  .close { background: #fa383e; color: #fff; }
  .ghost { background: #e4e6eb; color: #050505; }
  #status { text-align: center; font-size: 14px; font-weight: 600; min-height: 20px; margin: 6px 0; }
  .ok { color: #42b72a; } .bad { color: #fa383e; }
  #online { text-align: center; font-size: 15px; font-weight: 700; margin: 4px 0; }
  .lib { background: #fff; border: 1px solid #ccd0d5; border-radius: 8px; max-height: 220px; overflow-y: auto; }
  .lib-item { padding: 11px 12px; border-bottom: 1px solid #eee; font-size: 14px; cursor: pointer; word-break: break-all; }
  .lib-item:last-child { border-bottom: none; }
  .lib-item:active { background: #e7f3ff; }
</style>
</head>
<body>
  <h2>🎮 ตัวควบคุม (Remote)</h2>

  <div class="card">
    <label>รหัสลับ (Secret)</label>
    <input type="password" id="secret" placeholder="ใส่รหัสลับ" />
    <div id="online">🟢 Chrome ออนไลน์: -</div>
    <div id="status">ใส่รหัสแล้วกดเช็ค</div>
    <button class="ghost" onclick="checkConn()">เช็คการเชื่อมต่อ</button>
  </div>

  <div class="card">
    <button class="launch" onclick="cmd('/launch','สั่งเปิด Chrome แล้ว')">💻 เปิด Chrome ทุก profile</button>
    <button class="close" onclick="confirmClose()">⛔ ปิด Chrome ทุก profile</button>
  </div>

  <div class="card">
    <label>ชื่อเพจ (ไว้จำง่ายๆ)</label>
    <input type="text" id="name" placeholder="ชื่อเพจ" />
    <label>ลิงก์ที่ต้องการส่ง</label>
    <input type="text" id="link" placeholder="https://facebook.com/..." />
    <label>ข้อความที่จะเติมในกล่องแชท (เว้นว่างได้)</label>
    <textarea id="msg" placeholder="ต้องกดส่งเองเสมอ"></textarea>
    <button class="primary" onclick="sendAll()">📤 Send to All</button>
    <button class="refresh" onclick="cmd('/refresh','สั่งรีเฟรชแล้ว')">🔄 Refresh All</button>
    <button class="ghost" onclick="saveLib()">💾 บันทึกลงคลัง</button>
  </div>

  <div class="card">
    <label>คลังลิงก์ (แตะเพื่อเลือกใช้)</label>
    <div class="lib" id="lib"></div>
  </div>

<script>
  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");
  try { $("secret").value = localStorage.getItem("secret") || ""; } catch (e) {}
  let library = [];
  try { library = JSON.parse(localStorage.getItem("library") || "[]"); } catch (e) {}

  function saveLibStore() { try { localStorage.setItem("library", JSON.stringify(library)); } catch (e) {} }
  function renderLib() {
    const box = $("lib"); box.innerHTML = "";
    if (library.length === 0) { box.innerHTML = '<div class="lib-item" style="color:#999">ยังไม่มีลิงก์ในคลัง</div>'; return; }
    library.forEach((it) => {
      const div = document.createElement("div");
      div.className = "lib-item";
      div.textContent = it.name ? (it.name + "  —  " + it.url) : it.url;
      div.onclick = () => { $("name").value = it.name || ""; $("link").value = it.url; };
      box.appendChild(div);
    });
  }
  renderLib();

  function getSecret() { const s = $("secret").value.trim(); try { localStorage.setItem("secret", s); } catch (e) {} return s; }

  async function checkConn() {
    const s = getSecret(); statusEl.textContent = "กำลังเช็ค..."; statusEl.className = "";
    try {
      const r = await fetch("/get?key=" + encodeURIComponent(s), { cache: "no-store" });
      if (r.ok) { statusEl.textContent = "✓ เชื่อมต่อ + รหัสถูกต้อง"; statusEl.className = "ok"; }
      else if (r.status === 401) { statusEl.textContent = "✗ รหัสลับไม่ถูกต้อง"; statusEl.className = "bad"; }
      else { statusEl.textContent = "✗ มีปัญหา"; statusEl.className = "bad"; }
    } catch (e) { statusEl.textContent = "✗ ต่อเซิร์ฟเวอร์ไม่ได้"; statusEl.className = "bad"; }
  }

  // อัปเดตจำนวน Chrome ออนไลน์ทุก 2 วินาที
  async function pollOnline() {
    const s = $("secret").value.trim();
    if (!s) { $("online").textContent = "🟢 Chrome ออนไลน์: -"; return; }
    try {
      const r = await fetch("/status?key=" + encodeURIComponent(s), { cache: "no-store" });
      if (r.ok) { const d = await r.json(); $("online").textContent = "🟢 Chrome ออนไลน์: " + d.online + " เครื่อง"; }
      else { $("online").textContent = "🟢 Chrome ออนไลน์: -"; }
    } catch (e) { $("online").textContent = "🟢 Chrome ออนไลน์: -"; }
  }
  setInterval(pollOnline, 2000);
  pollOnline();

  // คำสั่งทั่วไป (launch / refresh)
  async function cmd(pathName, okMsg) {
    const s = getSecret();
    try {
      const r = await fetch(pathName + "?key=" + encodeURIComponent(s), { method: "POST" });
      if (r.ok) { statusEl.textContent = "✓ " + okMsg; statusEl.className = "ok"; }
      else if (r.status === 401) { statusEl.textContent = "✗ รหัสลับไม่ถูกต้อง"; statusEl.className = "bad"; }
      else { statusEl.textContent = "✗ ไม่สำเร็จ"; statusEl.className = "bad"; }
    } catch (e) { statusEl.textContent = "✗ ต่อเซิร์ฟเวอร์ไม่ได้"; statusEl.className = "bad"; }
  }

  function confirmClose() {
    if (confirm("ยืนยันปิด Chrome ทุก profile บนเครื่อง?")) {
      cmd("/close", "สั่งปิด Chrome แล้ว");
    }
  }

  async function sendAll() {
    const s = getSecret(); const link = $("link").value.trim();
    if (!link) { statusEl.textContent = "ยังไม่ได้ใส่ลิงก์"; statusEl.className = "bad"; return; }
    try {
      const r = await fetch("/set?key=" + encodeURIComponent(s), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link, message: $("msg").value }),
      });
      if (r.ok) { statusEl.textContent = "✓ ส่งแล้ว"; statusEl.className = "ok"; }
      else if (r.status === 401) { statusEl.textContent = "✗ รหัสลับไม่ถูกต้อง"; statusEl.className = "bad"; }
      else { statusEl.textContent = "✗ ส่งไม่สำเร็จ"; statusEl.className = "bad"; }
    } catch (e) { statusEl.textContent = "✗ ต่อเซิร์ฟเวอร์ไม่ได้"; statusEl.className = "bad"; }
  }

  function saveLib() {
    const link = $("link").value.trim(); const name = $("name").value.trim();
    if (!link) return;
    const idx = library.findIndex((x) => x.url === link);
    if (idx >= 0) library[idx].name = name; else library.push({ name, url: link });
    saveLibStore(); renderLib();
    statusEl.textContent = "✓ บันทึกลงคลังแล้ว"; statusEl.className = "ok";
  }
</script>
</body>
</html>`;
