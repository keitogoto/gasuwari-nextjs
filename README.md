# ガスワリ！(Next.js版)

ドライブ費用の割り勘計算アプリ。**サーバーを一切使わない静的サイト**として GitHub Pages に配信し、
Service Worker により2回目以降はオフラインでも動きます。`git push` すると GitHub Actions が
自動でビルド・デプロイします。

## 1. ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:3000` で確認できます。`components/GasuwariApp.jsx` が画面のメインロジックです。
機能追加は基本的にこのファイルと `components/` 配下の編集で完結します。

本番と同じ静的ファイルを確認したいときは:

```bash
npm run build && npm run preview
```

> Service Worker は本番ビルドでのみ登録されます(`npm run dev` では無効)。

## 2. GitHub Pages の初期設定(初回のみ)

1. リポジトリの **Settings → Pages** を開く
2. **Build and deployment → Source** を `GitHub Actions` にする
3. `main` に push すると `.github/workflows/deploy.yml` が動き、
   `https://keitogoto.github.io/gasuwari-nextjs/` に公開される

> **Private リポジトリの場合**: GitHub Pages で Private リポジトリを公開するには GitHub Pro が必要です。
> Pro を使わない場合はリポジトリを Public にしてください(このアプリはサーバー側の秘密情報を持たないため、
> Public にしても漏れて困るものはありません)。

## 3. サブパス(basePath)について

GitHub Pages のプロジェクトサイトは `https://<ユーザー名>.github.io/<リポジトリ名>/` という
サブパスで配信されます。そのため `next.config.js` の `basePath` を設定する必要があり、
値は GitHub Actions が `actions/configure-pages` の出力から `NEXT_PUBLIC_BASE_PATH` に注入します。

- ローカル開発: 空文字 → `http://localhost:3000/`
- GitHub Pages: `/gasuwari-nextjs` → `https://keitogoto.github.io/gasuwari-nextjs/`

独自ドメインを設定した場合は `configure-pages` が空文字を返すので、コードの変更は不要です。

## 4. 開発フロー(2回目以降)

1. ローカルで機能追加 → `npm run dev` で確認
2. `npm run build` が通ることを確認
3. `git add . && git commit -m "..." && git push origin main`
4. GitHub Actions が緑✅になれば公開URLに反映(1〜2分)
5. スマホで開く。Service Worker が更新を取り込むので、再読み込みすれば新しい版になります

## 5. スマホへのインストール

公開URLをスマホのブラウザで開き、「ホーム画面に追加」するとアイコン付きのアプリのように使えます
(`app/manifest.js` で設定済み)。一度開いておけば、以降は圏外・機内モードでも起動して計算できます。

## ディレクトリ構成

```
app/
├── layout.js       全ページ共通のレイアウト・メタ情報
├── page.js         トップページ(コンポーネントを置くだけ)
├── manifest.js     PWA設定(basePathを含めるためビルド時に生成)
└── globals.css     デザイントークン・スタイル定義
components/         画面を構成するReactコンポーネント
├── GasuwariApp.jsx        画面全体のロジック。機能追加は主にここ
├── SegmentedControl.jsx   ガソリン種別のタブ切り替え
├── Stepper.jsx            人数の +/- ボタン
├── ExtraCosts.jsx         追加費用の行
├── Receipt.jsx            シェア用レシート(画像化される部分)
└── ServiceWorkerRegister.jsx  Service Workerの登録
scripts/
├── sw-template.js  Service Workerのテンプレート
└── build-sw.mjs    out/ のファイル一覧を埋め込んで out/sw.js を生成
public/             PWAアイコン、.nojekyll
.github/workflows/  GitHub Actions (mainへのpushでビルド&Pagesへデプロイ)
next.config.js      output: 'export' + basePath
```

詳しい仕組みは [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。
