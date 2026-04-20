import { useState } from 'react';
import { useMasterDataStore } from '../../store/masterDataStore';
import { matchDistrict } from '../../lib/market/matchingEngine';
import type { District } from '../../lib/masterData';

interface Props {
  cityId:      string;
  value:       string;            // district id
  onChange:    (districtId: string, district: District | null) => void;
  placeholder?: string;
  className?:  string;
  style?:      React.CSSProperties;
  disabled?:   boolean;
  /** Show "add district" prompt when user types a free-text not in list */
  allowAdd?:   boolean;
  onAddRequest?: (name: string, cityId: string) => void;
}

export default function DistrictSelect({
  cityId, value, onChange,
  placeholder = 'اختر الحي',
  className, style, disabled,
  allowAdd, onAddRequest,
}: Props) {
  const { districts, cities } = useMasterDataStore();
  const [freeText, setFreeText] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);

  const cityDistricts = districts.filter(d => d.cityId === cityId);

  /* If cityId is empty, show nothing useful */
  if (!cityId) {
    return (
      <select disabled className={className} style={style}>
        <option>اختر المدينة أولاً</option>
      </select>
    );
  }

  const selectedDistrict = districts.find(d => d.id === value) ?? null;

  /* Smart fallback: if stored value is a free-text name (old data), try to match */
  const matchResult = !selectedDistrict && value
    ? matchDistrict(value, districts, cityId)
    : null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const district = districts.find(d => d.id === id) ?? null;
    onChange(id, district);
    setFreeText('');
    setShowSuggestion(false);
  };

  const handleFreeTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setFreeText(text);
    if (!text.trim()) { setShowSuggestion(false); return; }
    const match = matchDistrict(text, districts, cityId);
    setShowSuggestion(match == null || match.score < 1);
  };

  /* Show suggestion banner if free-text doesn't match */
  const suggestion = freeText ? matchDistrict(freeText, districts, cityId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        style={style}
      >
        <option value="">{placeholder}</option>
        {cityDistricts.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
        {matchResult && (
          <option value={matchResult.district.id} style={{ color: '#92400e' }}>
            {matchResult.district.name} ← {value}
          </option>
        )}
      </select>

      {/* Smart Fallback — add prompt */}
      {allowAdd && showSuggestion && freeText && (
        <div style={{
          padding: '6px 10px', background: '#fef3c7',
          border: '1px solid #f59e0b', borderRadius: 6, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          {suggestion ? (
            <>
              <span style={{ color: '#92400e' }}>
                هل تقصد: <strong>{suggestion.district.name}</strong>؟
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => { onChange(suggestion.district.id, suggestion.district); setFreeText(''); setShowSuggestion(false); }}
                  style={{ fontSize: 11, padding: '2px 8px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  نعم
                </button>
                {onAddRequest && (
                  <button
                    type="button"
                    onClick={() => { onAddRequest(freeText, cityId); setFreeText(''); setShowSuggestion(false); }}
                    style={{ fontSize: 11, padding: '2px 8px', background: '#fff', color: '#92400e', border: '1px solid #f59e0b', borderRadius: 4, cursor: 'pointer' }}
                  >
                    لا، إضافة جديد
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span style={{ color: '#92400e' }}>الحي غير موجود — هل تريد إضافته؟</span>
              {onAddRequest && (
                <button
                  type="button"
                  onClick={() => { onAddRequest(freeText, cityId); setFreeText(''); setShowSuggestion(false); }}
                  style={{ fontSize: 11, padding: '2px 8px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  إضافة الآن
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
