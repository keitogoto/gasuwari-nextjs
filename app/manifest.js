// PWA(ホーム画面に追加)の設定。basePath を含める必要があるため、
// 静的ファイル(public/manifest.json)ではなくビルド時に生成する形にしている。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// output: 'export' ではビルド時に確定した内容を書き出す必要があるため明示する
export const dynamic = 'force-static';

export default function manifest() {
  return {
    name: 'ガスワリ！',
    short_name: 'ガスワリ',
    description: 'ドライブ費用の割り勘計算アプリ',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#1B2430',
    theme_color: '#1B2430',
    orientation: 'portrait',
    icons: [
      { src: `${basePath}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${basePath}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
  };
}
