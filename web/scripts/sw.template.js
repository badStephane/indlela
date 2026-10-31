// Service worker du carnet : l'application s'ouvre sans réseau pendant les réunions.
// Généré à chaque build par scripts/build-sw.mjs (__BUILD_VERSION__ change à chaque version) :
// une nouvelle version s'installe d'elle-même et remplace l'ancien cache.

const CACHE = "indlela-__BUILD_VERSION__";
const OFFLINE = "/hors-connexion";
// Toutes les pages de l'application. Les écrans d'un jeune sont des pages fixes (/jeune?id=…) :
// une seule copie en cache sert pour tous les jeunes, y compris ceux ajoutés sur le téléphone.
const ROUTES = [
  "/",
  "/connexion",
  "/unite",
  "/unite/ajouter",
  "/unite/epreuves",
  "/unite/tableau-de-bord",
  "/groupe",
  "/famille",
  "/admin/referentiels",
  "/jeune",
  "/jeune/valider",
  "/jeune/carnet",
  "/jeune/cour",
  OFFLINE,
];
const ASSETS = ["/logo.svg", "/icon.svg", "/manifest.webmanifest"];
const STATIC_IN_HTML = /\/_next\/static\/[^"'\s)\\]+/g;

async function precache() {
  const cache = await caches.open(CACHE);
  const assets = new Set(ASSETS);
  for (const route of ROUTES) {
    try {
      const res = await fetch(route, { cache: "no-store" });
      if (!res.ok) continue;
      await cache.put(route, res.clone());
      for (const m of (await res.text()).match(STATIC_IN_HTML) ?? []) assets.add(m);
    } catch {
      // Page indisponible pendant l'installation : elle sera mise en cache à la première visite.
    }
  }
  await Promise.all([...assets].map((url) => cache.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("indlela-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isRsc = (req, url) => req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
const isStatic = (url) => url.pathname.startsWith("/_next/static/") || /\.(svg|png|woff2?|webmanifest)$/.test(url.pathname);

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

/** Pages : réseau d'abord ; sans réseau, la page en cache (sans tenir compte de ?id=…), sinon la page hors connexion. */
async function page(req, url) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(url.pathname, copy));
    }
    return res;
  } catch {
    return (await caches.match(url.pathname)) ?? (await caches.match(OFFLINE)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Données de navigation de Next : jamais de HTML à la place. En cas d'échec, Next recharge
  // la page en entier, et c'est la page en cache qui répond.
  if (isRsc(req, url)) {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(page(req, url));
  }
});
