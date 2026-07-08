# ガスワリ！ 開発・運用リファレンス

このドキュメントは、「ガスワリ！」というドライブ費用の割り勘計算アプリが**どんな技術で・どういう仕組みで動いているか**、そして**今後どう機能追加・デバッグ・運用していくか**を一つにまとめたものです。この構築作業に関わっていない人が読んでも、環境の全体像がわかることを目指しています。

---

## 1. このアプリは何か

スマホのブラウザから使う、ドライブでかかった費用(ガソリン代・高速代・その他費用)を乗車人数で割り勘計算するWebアプリ。個人のRaspberry Piでホストされており、インターネット上のどこからでもURLでアクセスできる(スマホの「ホーム画面に追加」でアプリのように使える = PWA)。

---

## 2. システム全体像

大きく分けて2つの流れがある。

1. **開発・デプロイの流れ**: 開発者(Mac)がコードを直すと、自動的に本番(ラズパイ)に反映される
2. **実行時のアクセスの流れ**: スマホからアクセスすると、そのリクエストがラズパイのアプリまで届く

```mermaid
flowchart TB
    subgraph Dev["開発(Mac)"]
        A[VSCodeでコード編集] --> B["git push origin main"]
    end

    subgraph GitHub["GitHub"]
        B --> C[リポジトリ: keitogoto/gasuwari-nextjs]
        C --> D["GitHub Actions\n(.github/workflows/deploy.yml)"]
        D -->|"Dockerイメージをビルド\n(linux/arm64)"| E["ghcr.io\n(GitHub Container Registry)\nghcr.io/keitogoto/gasuwari-nextjs"]
    end

    subgraph Pi["Raspberry Pi 3 (自宅)"]
        F["Watchtower\n(60秒おきにghcr.ioを確認)"] -->|新イメージがあればpull&再起動| G["Dockerコンテナ: app\nNext.jsサーバー\n127.0.0.1:3000"]
        E -.->|イメージ取得| F
        H["Tailscale (tailscaled)\nFunnelでHTTPS公開"] --> G
    end

    subgraph Internet["インターネット"]
        I["スマホのブラウザ\nhttps://raspberrypi.tailbcc39a.ts.net"]
    end

    I -->|"HTTPSリクエスト"| H

    style Dev fill:#1B2430,color:#fff
    style GitHub fill:#24292e,color:#fff
    style Pi fill:#C2410C,color:#fff
    style Internet fill:#2563EB,color:#fff
```

**ポイント**

- Piはルーターのポート開放を一切していない。Tailscale FunnelがPiから外向きに接続を確立し、そこにインターネットからのリクエストが中継される仕組み(Piのグローバル待受ポートは無い)
- 開発者が`git push`する以外、人の手を介さずに本番へ反映される(Watchtowerが自動検知)

---

## 3. 技術スタック一覧

| 分類 | 技術 | 役割 |
|---|---|---|
| フレームワーク | Next.js 16 (App Router) | 画面の描画・ビルド |
| UIライブラリ | React 19 | コンポーネントベースのUI |
| 画像化 | html2canvas | レシート画面をPNG画像化(共有機能) |
| PWA | `manifest.json` | スマホのホーム画面に追加できるようにする設定 |
| コンテナ化 | Docker (マルチステージビルド) | アプリを実行環境ごとパッケージ化 |
| 実行基盤 | Raspberry Pi 3 (Raspberry Pi OS Lite 64-bit) | 自宅で常時稼働させるサーバー本体 |
| 自動更新 | Watchtower | 新しいDockerイメージを検知して自動的に再起動 |
| 外部公開 | Tailscale Funnel | ポート開放・固定IP不要でHTTPS公開 |
| コード管理 | GitHub (Private リポジトリ) | ソースコードのバージョン管理 |
| イメージ保管 | GitHub Container Registry (ghcr.io) | ビルド済みDockerイメージの保管場所(Public) |
| CI/CD | GitHub Actions | pushをトリガーにDockerイメージを自動ビルド・push |

---

## 4. リクエストの流れ(実行時)

スマホで `https://raspberrypi.tailbcc39a.ts.net` を開いたときに起きていること:

1. スマホがそのURLにHTTPSでアクセス
2. Tailscaleの中継サーバー(Funnel relay)がリクエストを受け取り、Pi上で動いている`tailscaled`まで暗号化された経路で転送
3. Pi上の`tailscaled`が、あらかじめ設定された転送ルール(`tailscale funnel --bg 3000`)に従って `http://127.0.0.1:3000` に転送
4. Docker上の`app`コンテナ(Next.jsサーバー)がリクエストを処理し、画面のHTML/JS/CSSを返す
5. スマホ側でReactが動き、ボタン操作や計算はすべてブラウザ内(クライアントサイド)で完結する

> ※ 現状このアプリは入力された数値をその場で計算するだけで、サーバー側にデータベースなどは存在しない。全ての計算はスマホのブラウザ内(JavaScript)で行われている。

---

## 5. デプロイの流れ(コードを直してから本番に反映されるまで)

1. Macで `components/` 配下などを編集
2. `git add . && git commit -m "..." && git push origin main`
3. GitHub Actions(`.github/workflows/deploy.yml`)が自動起動
   - リポジトリを取得
   - QEMUでarm64(ラズパイのCPUアーキテクチャ)エミュレーション環境を用意
   - `Dockerfile`に従ってNext.jsアプリをビルド
   - 完成したイメージを `ghcr.io/keitogoto/gasuwari-nextjs:latest` としてpush
4. ラズパイ上のWatchtowerコンテナが最大60秒おきに`ghcr.io`をチェック
5. 新しいイメージを検知したら、自動的に`docker pull`→`app`コンテナを再作成・再起動
6. 数分以内に本番URLに新しいコードが反映される

**今すぐ反映させたい場合(Watchtowerを待たない)**

PiにSSH接続して:
```bash
cd ~
docker compose pull
docker compose up -d
```

---

## 6. ディレクトリ構成とファイルの役割

```
gasuwari-nextjs/
├── app/
│   ├── layout.js       … 全ページ共通のレイアウト・メタ情報・PWA設定の読み込み
│   ├── page.js         … トップページ(GasuwariAppコンポーネントを表示するだけ)
│   └── globals.css     … 全体のデザイントークン・スタイル定義
├── components/
│   ├── GasuwariApp.jsx     … 画面全体のロジック(状態管理・計算・シェア処理)。機能追加は主にここ
│   ├── SegmentedControl.jsx… ガソリン種別選択などのタブ切り替え部品
│   ├── Stepper.jsx         … 人数の+/-ボタン部品
│   ├── ExtraCosts.jsx      … 追加費用の行を管理する部品
│   └── Receipt.jsx         … シェア用レシート表示(画像化される部分)
├── public/
│   ├── manifest.json   … PWA設定(アプリ名・アイコン・テーマカラー)
│   └── icons/          … ホーム画面用アイコン
├── Dockerfile          … 本番用Dockerイメージのビルド手順(3段階: 依存関係→ビルド→実行専用の軽量イメージ)
├── docker-compose.yml  … ラズパイ上で実際に起動する構成(app + watchtower)
├── .github/workflows/deploy.yml … GitHub Actionsの自動ビルド設定
└── next.config.js      … Next.jsの設定(output: 'standalone' でDocker用に最適化)
```

---

## 7. VSCodeでのデバッグ手順

プロジェクトのルート(`gasuwari-nextjs/`)に `.vscode/launch.json` を作成すると、VSCode上でブレークポイントを使ったデバッグができる。以下はNext.js公式ドキュメントに基づく設定。

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev -- --inspect"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
      "runtimeArgs": ["--inspect"],
      "skipFiles": ["<node_internals>/**"],
      "serverReadyAction": {
        "action": "debugWithChrome",
        "killOnServerStop": true,
        "pattern": "- Local:.+(https?://.+)",
        "uriFormat": "%s",
        "webRoot": "${workspaceFolder}"
      }
    }
  ]
}
```

**使い方**

1. VSCode左側の「実行とデバッグ」パネル(`⇧+⌘+D`)を開く
2. 上部のドロップダウンで用途に応じた設定を選ぶ
   - **debug server-side**: `components/GasuwariApp.jsx`内など、サーバーで動くコードにブレークポイントを置きたいとき(今回の構成はほぼクライアントコンポーネントなのであまり使わないが、将来API Routeを追加した場合に有効)
   - **debug client-side**: ボタンのクリック処理や計算ロジックなど、ブラウザで動く部分を止めたいとき。一番よく使うことになるはず
   - **debug full stack**: 両方同時に見たいとき
3. `F5`でデバッグ開始。ブレークポイントは行番号の左をクリックして設置

**Dockerコンテナ内のログを見たいとき(本番の挙動確認)**

```bash
# ラズパイにSSH接続した状態で
docker compose logs -f app        # リアルタイムでログを流し見る
docker exec -it gasuwari-app sh   # コンテナの中に入って直接調査する
```

---

## 8. ラズパイ運用コマンド チートシート

```bash
# Macから接続
ssh keito@raspberrypi.local

# アプリの状態確認
docker compose ps
docker compose logs -f app

# 手動で最新版に更新
docker compose pull && docker compose up -d

# コンテナを作り直す(設定変更を反映したいとき)
docker compose down
docker compose up -d

# Tailscale Funnelの状態確認
sudo tailscale funnel status

# Funnelを一時的に止める / 再開する
sudo tailscale funnel 3000 off
sudo tailscale funnel --bg 3000

# Piの再起動
sudo reboot
```

**Pi再起動後の注意**: Docker (`restart: unless-stopped`)とtailscaled(systemdサービス)はどちらも自動起動するが、`tailscale funnel`の設定はPiの再起動では原則保持される(tailscaledが設定を保存している)。再起動後は念のため`sudo tailscale funnel status`で確認するとよい。

---

## 9. トラブルシューティング

| 症状 | 主な原因 | 対処 |
|---|---|---|
| GitHub Actionsが赤い❌で失敗 | ビルドエラー(コードの構文ミスなど) | Actionsタブでログの赤字部分を確認。ローカルで`npm run build`が通るか先に確認する |
| Watchtowerが新しいイメージを取ってこない | `ghcr.io`のパッケージが非公開のまま / ラベル未設定 | パッケージがPublicか確認。`docker-compose.yml`の`app`に`watchtower.enable=true`ラベルがあるか確認 |
| スマホからURLにアクセスできない | Piの電源が落ちている / Wi-Fiが切れている / Funnelがoffになっている | `ssh`で接続できるか確認 → `sudo tailscale funnel status`を確認 |
| `docker compose up`でport already in useエラー | 別のプロセスが3000番ポートを使っている | `sudo lsof -i :3000` で確認し、不要なプロセスを止める |
| ローカルの`npm run dev`は動くのに本番だけ壊れる | 環境差異(Node.jsバージョン違いなど) | `Dockerfile`の`node:20-alpine`とローカルのNode.jsバージョンを揃える |

---

## 10. 用語集(この分野に馴染みがない人向け)

- **Docker / コンテナ**: アプリと、それが動くのに必要なもの(Node.jsなど)を一つの箱(コンテナ)にまとめる技術。「自分のPCでは動くのに本番では動かない」問題を減らせる
- **Dockerイメージ**: コンテナの元になる、実行前のパッケージされたファイル一式
- **GHCR (GitHub Container Registry)**: DockerイメージをGitHub上に保管しておく場所。`ghcr.io/ユーザー名/イメージ名`という住所で管理される
- **CI/CD**: コードを変更したら自動でテスト・ビルド・配布・反映まで行う仕組み全般の呼び方。今回は「pushしたら自動でビルド→自動で本番反映」の部分がこれにあたる
- **Watchtower**: 動いているDockerコンテナを監視し、新しいイメージが公開されたら自動で入れ替えてくれる補助ツール
- **Tailscale**: 複数の端末同士を安全に直接つなぐ仮想ネットワーク(VPN)サービス。今回はその中の「Funnel」機能で、ラズパイの中の1つのサービスだけをインターネットに公開している
- **PWA (Progressive Web App)**: 普通のWebサイトを、スマホのホーム画面にアイコンとして追加してアプリのように使えるようにする仕組み
- **standalone出力**: Next.jsのビルド時に、Docker配布に必要な最小限のファイルだけを`.next/standalone`にまとめてくれる機能

---

## 11. 今後の拡張の進め方(参考)

新しい機能を追加したくなったら、次の順で進めるとスムーズ。

1. `components/GasuwariApp.jsx`など該当ファイルを編集(必要ならVSCodeのデバッガでロジックを確認)
2. `npm run dev`でローカル確認
3. `npm run build`でビルドが通ることを確認(本番と同じ条件でのチェック)
4. `git add . && git commit -m "機能: ○○を追加" && git push origin main`
5. GitHub Actionsが緑✅になるのを確認
6. 数分待つか、Piで手動`docker compose pull && up -d`
7. スマホで動作確認
