import GasuwariApp from '../components/GasuwariApp';

// 計算・画像化はすべてブラウザ内で完結するので、このページはコンポーネントを置くだけ。
// サーバーで実行される処理は無く、ビルド時に静的HTMLとして書き出される。
export default function Home() {
  return <GasuwariApp />;
}
