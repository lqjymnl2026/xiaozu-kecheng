/* 简单离线缓存：先缓存应用壳与课程数据，音频按需缓存（子路径部署感知） */
const CACHE = 'xz-course-v1';
const BASE = self.registration ? self.registration.scope.replace(/\/+$/, '') : '';

const APP_SHELL = [BASE + '/', BASE + '/manifest.webmanifest', BASE + '/courses/yaodao-rumen.json', BASE + '/icons/icon-192.png', BASE + '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url);
  // 音频：缓存优先
  if (url.pathname.startsWith(BASE + '/audio/')) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  // 其余：网络优先，失败回退缓存
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
