import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';
import GasuwariApp from '../components/GasuwariApp';

// アクセスログの保存先。Docker上では docker-compose.yml の LOG_DIR で
// /app/logs (マウントしたボリューム) に向ける。ローカル開発時はプロジェクト内の ./logs に書く。
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

function logAccess(userAgent) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const time = new Date().toISOString();
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