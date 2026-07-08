'use client';

export default function ExtraCosts({ extras, onChange }) {
  const updateItem = (id, field, value) => {
    onChange(extras.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id) => {
    onChange(extras.filter((item) => item.id !== id));
  };

  const addItem = () => {
    onChange([...extras, { id: crypto.randomUUID(), name: '', amount: 0 }]);
  };

  return (
    <div className="field">
      <label>その他の費用(駐車場代・レンタカー代など)</label>
      <div>
        {extras.map((item) => (
          <div className="extra-row" key={item.id}>
            <div className="input-row name-input">
              <input
                type="text"
                placeholder="例: 駐車場代"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
              />
            </div>
            <div className="input-row amount-input">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="円"
                value={item.amount || ''}
                onChange={(e) => updateItem(item.id, 'amount', Number(e.target.value) || 0)}
              />
            </div>
            <button type="button" className="remove-btn" onClick={() => removeItem(item.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="add-extra-btn" onClick={addItem}>
        ＋ 費用を追加
      </button>
    </div>
  );
}
