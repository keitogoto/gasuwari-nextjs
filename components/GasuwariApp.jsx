'use client';

import { useRef, useState } from 'react';
import SegmentedControl from './SegmentedControl';
import Stepper from './Stepper';
import ExtraCosts from './ExtraCosts';
import Receipt from './Receipt';

const FUEL_TYPES = ['レギュラー', 'ハイオク', '軽油'];

export default function GasuwariApp() {
  const [distance, setDistance] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [fuelType, setFuelType] = useState(FUEL_TYPES[0]);
  const [price, setPrice] = useState(0);
  const [highway, setHighway] = useState(0);
  const [people, setPeople] = useState(4);
  const [extras, setExtras] = useState([]);
  const [status, setStatus] = useState('');

  const receiptRef = useRef(null);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;

  const handleNumberInput = (setter) => (e) => {
    const v = e.target.value;
    setter(v === '' ? 0 : Math.max(0, Number(v)));
  };

  const handleShare = async () => {
    setStatus('画像を作成中...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#F7F3EC',
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setStatus('画像の作成に失敗しました');
          return;
        }
        const file = new File([blob], 'gasuwari-receipt.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'ガスワリ！',
              text: 'ドライブ費用の割り勘結果',
            });
            setStatus('');
            return;
          } catch (err) {
            // ユーザーが共有をキャンセルした場合はダウンロードにフォールバック
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gasuwari-receipt.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('画像を保存しました');
        setTimeout(() => setStatus(''), 2500);
      }, 'image/png');
    } catch (e) {
      setStatus('画像の作成に失敗しました');
    }
  };

  return (
    <div className="app">
      <div className="hero">
        <p className="hero-eyebrow">Road Trip Cost Splitter</p>
        <h1>
          ガス<span>ワリ</span>！
        </h1>
        <p>走った距離とかかった費用を入れるだけ。ガソリン代・高速代をみんなで気持ちよく割り勘。</p>
      </div>

      <main>
        <div className="card">
          <h2>
            <span className="num">1</span>走行データ
          </h2>
          <div className="field">
            <label htmlFor="distance">走行距離</label>
            <div className="input-row">
              <input
                id="distance"
                type="number"
                inputMode="decimal"
                placeholder="例: 320"
                min="0"
                value={distance || ''}
                onChange={handleNumberInput(setDistance)}
              />
              <span className="unit">km</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="efficiency">平均燃費</label>
            <div className="input-row">
              <input
                id="efficiency"
                type="number"
                inputMode="decimal"
                placeholder="例: 16.5"
                min="0"
                step="0.1"
                value={efficiency || ''}
                onChange={handleNumberInput(setEfficiency)}
              />
              <span className="unit">km/L</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>
            <span className="num">2</span>ガソリン
          </h2>
          <div className="field">
            <label>ガソリン種別</label>
            <SegmentedControl options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />
          </div>
          <div className="field">
            <label htmlFor="price">ガソリン単価(実際に給油した価格)</label>
            <div className="input-row">
              <input
                id="price"
                type="number"
                inputMode="decimal"
                placeholder="例: 175"
                min="0"
                value={price || ''}
                onChange={handleNumberInput(setPrice)}
              />
              <span className="unit">円/L</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>
            <span className="num">3</span>費用・人数
          </h2>
          <div className="field">
            <label htmlFor="highway">高速代(合計)</label>
            <div className="input-row">
              <input
                id="highway"
                type="number"
                inputMode="decimal"
                placeholder="例: 4200"
                min="0"
                value={highway || ''}
                onChange={handleNumberInput(setHighway)}
              />
              <span className="unit">円</span>
            </div>
          </div>

          <ExtraCosts extras={extras} onChange={setExtras} />

          <div className="field">
            <label>乗車人数(運転者含む)</label>
            <Stepper value={people} onChange={setPeople} />
          </div>
        </div>

        <div id="receiptWrap">
          <Receipt
            ref={receiptRef}
            distance={distance}
            efficiency={efficiency}
            fuelType={fuelType}
            price={price}
            highway={highway}
            extras={extras}
            people={people}
            timestamp={timestamp}
          />

          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={handleShare}>
              画像として保存・シェア
            </button>
          </div>
          <div className="status">{status}</div>
        </div>
      </main>

      <footer>GASU-WARI · 割り勘は仲良く、運転はご安全に</footer>
    </div>
  );
}
