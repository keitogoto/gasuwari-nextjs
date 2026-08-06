// ガスワリ！ オフライン用 Service Worker(テンプレート)
//
// このファイルは直接配信されない。`npm run build` の最後に scripts/build-sw.mjs が
// 下のプレースホルダ2箇所を実際の値に差し替えて out/sw.js を生成する。
// ビルドごとに中身が変わるので、ブラウザ側も確実に新しいSWへ更新される。
//
// 計算・画像化はすべてブラウザ内で完結するため、一度読み込めばサーバーは不要。
// 圏外や機内モードでもホーム画面のアイコンからそのまま使える。

const BUILD_ID = '__BUILD_ID__';

// out/ 配下の全ファイル(HTML / JS / CSS / アイコン)。ビルド時に差し込まれる。
const PRECACHE_PATHS = __PRECACHE__;

// GitHub Pages では /gasuwari-nextjs/sw.js として配信されるため、
// 自分自身のURLから basePath を割り出す(ローカルの localhost では空になる)。
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');
const START_URL = `${BASE}/`;
const CACHE = `gasuwari-${BUILD_ID}`;

self.addEventListener('install', (event) => {
  // 遅延読み込みされる html2canvas のチャンクも含め、最初にまとめて取り込む。
  // 全部で1MB台なので一括で問題ない。
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([START_URL, ...PRECACHE_PATHS.map((p) => `${BASE}/${p}`)]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  // 前回のビルドで作られたキャッシュを掃除する
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

// 中身がハッシュ付きで確定しているファイル向け。キャッシュがあればネットワークを見ない。
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

// Google Fonts 向け。すぐキャッシュを返しつつ、裏で取り直して次回に備える。
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const fetching = fetch(request)
    .then((response) => {
      // クロスオリジンの opaque レスポンスは ok が false になるので type でも判定する
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  return (await fetching) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // アプリを開く操作。オンラインなら最新を取り、圏外ならキャッシュしたHTMLを返す
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(START_URL, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(START_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // 同一オリジンの静的ファイル(JS / CSS / アイコン / manifest)
  if (url.origin === self.location.origin && url.pathname.startsWith(`${BASE}/`)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Google Fonts。オフライン時にも書体が崩れないようキャッシュしておく
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
