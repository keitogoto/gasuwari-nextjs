/** @type {import('next').NextConfig} */

// GitHub Pages のプロジェクトサイトは https://<ユーザー名>.github.io/<リポジトリ名>/ という
// サブパス配信になるため、basePath を付ける必要がある。値は GitHub Actions 側で
// NEXT_PUBLIC_BASE_PATH に注入する。ローカル開発では空のまま = http://localhost:3000/ で開ける。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // サーバーを一切使わない完全な静的サイトとして out/ に書き出す
  output: 'export',
  reactStrictMode: true,
  basePath,
};

module.exports = nextConfig;
