import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';
import GasuwariApp from '../components/GasuwariApp';

// アクセスログの保存先。Docker上では docker-compose.yml の LOG_DIR で
// /app/logs (マウントしたボリューム) に向ける。ローカル開発時はプロジェクト内の ./logs に書く。
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// UTC→JST(+9時間)に変換して "YYYY-MM-DD HH:mm:ss JST" の形式にする。
// Intl/タイムゾーンDBに依存させず、時刻の足し算だけで変換するので
// Alpineなど軽量なDockerイメージでも確実に動く。
function formatJST(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const y = jst.getUTCFullYear();
  const mo = pad(jst.getUTCMonth() + 1);
  const d = pad(jst.getUTCDate());
  const h = pad(jst.getUTCHours());
  const mi = pad(jst.getUTCMinutes());
  const s = pad(jst.getUTCSeconds());
  return `${y}-${mo}-${d} ${h}:${mi}:${s} JST`;
}

function logAccess(userAgent) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const time = formatJST(new Date());
    const line = `${time}\t${userAgent}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'access.log'), line);
  } catch (err) {
    // ログの書き込みに失敗してもアプリ自体は止めない
    console.error('access log write failed:', err);
  }
}

export default async function Home() {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || 'unknown';
  logAccess(userAgent);

  return <GasuwariApp />;
}