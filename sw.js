// sw.js - 離線快取：安裝時預存整座神殿，之後同源檔案「網路優先、離線用快取」，字型「快取優先」
// 修改 APP_SHELL 清單或想強制所有人更新時，把 CACHE_VERSION 加一
const CACHE_VERSION = "v7";
const CACHE_NAME = `temple-${CACHE_VERSION}`;
const FONT_CACHE = "temple-fonts";
const NETWORK_TIMEOUT_MS = 3000;

const APP_SHELL = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "libs/three.min.js",
  "libs/OrbitControls.js",
  "audio.js",
  "daily.js",
  "save-data.js",
  "quality.js",
  "chiam-data.js",
  "ai-divination.js",
  "live-wall.js",
  "avatar3d.js",
  "scene/core.js",
  "scene/architecture.js",
  "scene/atmosphere.js",
  "scene/altar.js",
  "scene/courtyard.js",
  "scene/halls.js",
  "scene/festival.js",
  "beads.js",
  "joystick.js",
  "app/core.js",
  "app/controls.js",
  "app/rituals.js",
  "app/chiam.js",
  "app/ema.js",
  "app/passport.js",
  "app/side-halls.js",
  "app/amulet.js",
  "app/shoujing.js",
  "app/relic-shop.js",
  "app/photo.js",
  "app/taisui.js",
  "app/rhythm.js",
  "app/pet.js",
  "app/sky-lantern.js",
  "app/zen.js",
  "app/bwa-competition.js",
  "app/lore.js",
  "app/feast.js",
  "app/sutra.js",
  "app/pwa.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith("temple-") && k !== CACHE_NAME && k !== FONT_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 多人連線 SSE、廣播與 AI 解籤一律直連，不經快取
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetchWithTimeout(req, NETWORK_TIMEOUT_MS);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    // 離線時開任何頁面都回到神殿首頁
    if (req.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  // 跨網域字型可能是 opaque 回應（status 0），一樣存起來供離線使用
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network timeout")), ms);
    fetch(req).then(
      res => { clearTimeout(timer); resolve(res); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}
