# ガスワリ！(Next.js版)

ドライブ費用の割り勘計算アプリ。Next.js + Docker + Cloudflare Tunnel + GitHub Actions で
「`git push` するとラズパイの本番環境に自動反映される」構成になっています。

## 1. ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:3000` で確認できます。`components/GasuwariApp.jsx` が画面のメインロジックです。
機能追加は基本的にこのファイルと `components/` 配下の編集で完結します。

## 2. GitHubリポジトリの作成

```bash
git init
git add .
git commit -m "initial commit"
gh repo create gasuwari-nextjs --private --source=. --remote=origin --push
# または https://github.com/new でリポジトリ作成後、
# git remote add origin https://github.com/keitogoto/gasuwari-nextjs.git && git push -u origin main
```

`docker-compose.yml` の `image:` は既に `ghcr.io/keitogoto/gasuwari-nextjs:latest` に設定済みです。
リポジトリ名を `gasuwari-nextjs`以外にする場合は、この行を実際のリポジトリ名に合わせて書き換えてください。

### パッケージ(イメージ)の公開設定

`main` にpushすると GitHub Actions が `ghcr.io/keitogoto/gasuwari-nextjs` にイメージをpushします。
デフォルトでは非公開になるため、ラズパイ側で認証なしにpullできるようにするには次のどちらかが必要です。

- GitHubの `Packages` タブ → 該当パッケージ → Package settings → **Change visibility** → Public にする(お試し・個人利用ならこれが簡単)
- または非公開のままにして、ラズパイ側で読み取り専用PAT(`read:packages`権限)を使いログインする:
  ```bash
  echo <PAT> | docker login ghcr.io -u <GitHubユーザー名> --password-stdin
  ```

## 3. ラズパイのセットアップ

```bash
# Raspberry Pi OS Lite (64-bit) 前提
sudo apt update && sudo apt full-upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
# 一度ログアウト/再ログインしてdockerグループを反映
```

このリポジトリを `git clone` するか、`docker-compose.yml` と `.env` だけをラズパイに置きます。

## 4. Cloudflare Tunnel の設定

1. ドメインをCloudflareに登録(ネームサーバーを切り替え済みであること)
2. [Cloudflare Zero Trustダッシュボード](https://one.dash.cloudflare.com/) → **Networks → Tunnels → Create a tunnel**
3. Connector type は **Docker** を選択 → トンネル名を入力(例: `gasuwari`)
4. 表示される起動コマンドの中の **トークン部分だけ** をコピーし、ラズパイ上に `.env` ファイルを作成:
   ```
   TUNNEL_TOKEN=ここに発行されたトークンを貼る
   ```
5. 続けて **Public Hostname** を追加:
   - Subdomain: `gasuwari`(お好みで)
   - Domain: 自分の取得したドメイン
   - Service Type: `HTTP`
   - URL: `app:3000` (docker-composeのサービス名。同じcomposeネットワーク内なのでホスト名で到達できます)

## 5. 起動

```bash
cd gasuwari-nextjs   # docker-compose.ymlのある場所
docker compose pull
docker compose up -d
```

`https://gasuwari.あなたのドメイン` でアクセスできれば成功です。スマホのブラウザでこのURLを開き、
「ホーム画面に追加」するとアイコン付きのアプリのように使えます(`manifest.json`で設定済み)。

## 6. 開発フロー(2回目以降)

1. ローカルで機能追加 → `git add . && git commit -m "..." && git push origin main`
2. GitHub Actions が自動でarm64向けDockerイメージをビルドし `ghcr.io` にpush(Actionsタブで進捗確認可)
3. ラズパイ上のWatchtowerが最大60秒間隔でチェックし、新しいイメージを検知したら自動でpull & 再起動
4. 特に何もしなくても数分以内に本番環境(Cloudflare Tunnel経由のURL)に反映されます

手動で今すぐ反映したい場合はラズパイ上で:
```bash
docker compose pull && docker compose up -d
```

## ディレクトリ構成

```
app/                Next.js App Router (layout, page, グローバルCSS)
components/         画面を構成するReactコンポーネント
public/             manifest.json, PWAアイコン
Dockerfile          マルチステージビルド(standalone出力)
docker-compose.yml  ラズパイ本番用(app / cloudflared / watchtower)
.github/workflows/  GitHub Actions (mainへのpushで自動ビルド&push)
```
