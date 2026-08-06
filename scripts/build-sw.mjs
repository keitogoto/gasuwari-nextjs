// out/ に書き出された静的ファイル一覧を Service Worker に埋め込む。
// Next.js の JS/CSS はビルドのたびにファイル名のハッシュが変わるため、
// 一覧を持った sw.js を毎回作り直すことで「取りこぼしのないオフライン対応」と
// 「ブラウザ側の確実な更新(sw.js の中身が変わる = 更新とみなされる)」を両立させる。

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out');
const templatePath = path.join(root, 'scripts', 'sw-template.js');

// キャッシュ対象にしないもの(sw.js 自身、macOSのゴミファイル、Pages用の空ファイル)
const IGNORED = new Set(['.DS_Store', '.nojekyll', 'sw.js']);

async function collectFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path.join(dir, entry.name), relative)));
    } else {
      files.push(relative);
    }
  }

  return files.sort();
}

const files = await collectFiles(outDir);

// ファイル名と中身の両方からビルドIDを作る(HTMLだけ変わった場合も検知できるように)
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(path.join(outDir, file)));
}
const buildId = hash.digest('hex').slice(0, 12);

const template = await readFile(templatePath, 'utf8');
const serviceWorker = template
  .replace('__BUILD_ID__', buildId)
  .replace('__PRECACHE__', JSON.stringify(files, null, 2));

// 差し替えは各1回ずつ。テンプレート側にプレースホルダを増やすと
// 静かに壊れる(先頭の1つしか置換されない)ので、ここで検出して止める。
for (const token of ['__BUILD_ID__', '__PRECACHE__']) {
  if (!template.includes(token)) {
    throw new Error(`sw-template.js に ${token} がありません`);
  }
  if (serviceWorker.includes(token)) {
    throw new Error(`sw-template.js に ${token} が2箇所以上あります`);
  }
}

await writeFile(path.join(outDir, 'sw.js'), serviceWorker);
console.log(`out/sw.js を生成しました (${files.length}ファイル / build ${buildId})`);
