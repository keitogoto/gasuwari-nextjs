'use client';

import { forwardRef } from 'react';

export function yen(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

const Receipt = forwardRef(function Receipt(
  { distance, efficiency, fuelType, price, highway, extras, people, timestamp },
  ref
) {
  const fuelUsed = efficiency > 0 ? distance / efficiency : 0;
  const fuelCost = fuelUsed * price;
  const extraTotal = extras.reduce((s, x) => s + (x.amount || 0), 0);
  const total = fuelCost + highway + extraTotal;
  const perPerson = people > 0 ? Math.ceil(total / people) : 0;
  const collected = perPerson * people;
  const adjustment = collected - total;

  return (
    <div className="receipt" ref={ref}>
      <div className="receipt-zigzag" />
      <div className="receipt-title">
        <div className="mark">
          ガス<span className="accent">ワリ</span>！
        </div>
        <div className="sub">SPLIT RECEIPT</div>
      </div>

      <div className="line">
        <span className="lbl">走行距離</span>
        <span className="val">{distance.toLocaleString('ja-JP')} km</span>
      </div>
      <div className="line">
        <span className="lbl">平均燃費</span>
        <span className="val">{efficiency.toLocaleString('ja-JP')} km/L</span>
      </div>
      <div className="line">
        <span className="lbl">消費燃料量</span>
        <span className="val">{fuelUsed.toFixed(1)} L</span>
      </div>
      <hr className="dashed" />
      <div className="line">
        <span className="lbl">ガソリン代({fuelType})</span>
        <span className="val">{yen(fuelCost)}</span>
      </div>
      <div className="line sub">
        <span className="lbl">単価</span>
        <span className="val">{yen(price)}/L</span>
      </div>
      <div className="line">
        <span className="lbl">高速代</span>
        <span className="val">{yen(highway)}</span>
      </div>
      {extras
        .filter((item) => item.name || item.amount)
        .map((item) => (
          <div className="line" key={item.id}>
            <span className="lbl">{item.name || 'その他費用'}</span>
            <span className="val">{yen(item.amount)}</span>
          </div>
        ))}

      <div className="total-block">
        <div className="row1">
          <span>合計費用</span>
          <span className="val">{yen(total)}</span>
        </div>
        <div className="row1">
          <span>乗車人数</span>
          <span className="val">{people}人</span>
        </div>
        <div className="per-person">
          <span className="lbl">ひとり あたり</span>
          <span className="val">{yen(perPerson)}</span>
        </div>
      </div>
      {adjustment > 0 && (
        <div className="adjust-note">
          ※端数切り上げのため、実費より{yen(adjustment)}多く集まります
        </div>
      )}

      <hr className="dashed" />
      <div className="receipt-footer">
        <div className="barcode" />
        <span className="timestamp">{timestamp}</span>
      </div>
      <div className="receipt-zigzag bottom" />
    </div>
  );
});

export default Receipt;
