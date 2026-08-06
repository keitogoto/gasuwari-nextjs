'use client';

import { useEffect } from 'react';

// public/sw.js を登録して、2回目以降はオフラインでもアプリが開けるようにする。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // 開発中(npm run dev)は Next.js のホットリロードと噛み合わないので登録しない
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register(`${basePath}/sw.js`).catch((err) => {
      // 登録に失敗してもアプリ自体はオンラインで普通に動く
      console.error('service worker registration failed:', err);
    });
  }, []);

  return null;
}
