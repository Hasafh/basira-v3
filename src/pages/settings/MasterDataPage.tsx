import { useState } from 'react';
import { useMasterDataStore } from '../../store/masterDataStore';
import { useAnalysisStore } from '../../store/analysisStore';
import type { City, District } from '../../lib/masterData';

type Tab = 'cities' | 'districts' | 'zoning';

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ═══════════════════════════════════════════════════════════ */
export default function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('cities');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'cities',    label: 'المدن'    },
    { id: 'districts', label: 'الأحياء'  },
    { id: 'zoning',    label: 'الأكواد'  },
  ];

  return (
    <div dir="rtl" style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px', fontFamily: 'Tajawal, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>إدارة البيانات الأساسية</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          القاموس المركزي للمدن والأحياء وأكواد البناء — كل المدخلات في النظام تستخدمه.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 24px', fontWeight: tab === t.id ? 700 : 400,
            fontSize: 14, border: 'none', background: 'transparent', cursor: 'pointer',
            borderBottom: tab === t.id ? '2px solid #15803d' : '2px solid transparent',
            color: tab === t.id ? '#15803d' : '#374151', marginBottom: -2,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cities'    && <CitiesTab />}
      {tab === 'districts' && <DistrictsTab />}
      {tab === 'zoning'    && <ZoningTab />}
    </div>
  );
}

/* ─── تبويب المدن ─────────────────────────────────────────── */
function CitiesTab() {
  const { cities, addCity, updateCity, deleteCity, resetToDefaults, districts } = useMasterDataStore();
  const [newName, setNewName] = useState('');
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const districtCount = (cityId: string) => districts.filter(d => d.cityId === cityId).length;

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (cities.some(c => c.name === name)) return;
    addCity({ id: nanoid(), name });
    setNewName('');
  };

  return (
    <div>
      {/* Add city */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="اسم المدينة الجديدة"
          style={INPUT}
        />
        <Btn onClick={handleAdd} color="green">+ إضافة</Btn>
      </div>

      {/* Table */}
      <table style={TABLE}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <TH>المدينة</TH>
            <TH center>عدد الأحياء</TH>
            <TH center>الإجراءات</TH>
          </tr>
        </thead>
        <tbody>
          {cities.map(c => (
            <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <TD>
                {editId === c.id ? (
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    autoFocus onKeyDown={e => {
                      if (e.key === 'Enter') { updateCity(c.id, { name: editName.trim() }); setEditId(null); }
                      if (e.key === 'Escape') setEditId(null);
                    }}
                    style={{ ...INPUT, width: 160 }}
                  />
                ) : (
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                )}
              </TD>
              <TD center>
                <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                  {districtCount(c.id)}
                </span>
              </TD>
              <TD center>
                {editId === c.id ? (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <Btn onClick={() => { updateCity(c.id, { name: editName.trim() }); setEditId(null); }} color="green" small>حفظ</Btn>
                    <Btn onClick={() => setEditId(null)} small>إلغاء</Btn>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <Btn onClick={() => { setEditId(c.id); setEditName(c.name); }} small>تعديل</Btn>
                    <Btn onClick={() => {
                      if (confirm(`حذف "${c.name}" وكل أحيائها (${districtCount(c.id)} حي)؟`)) deleteCity(c.id);
                    }} color="red" small>حذف</Btn>
                  </div>
                )}
              </TD>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => { if (confirm('إعادة تعيين المدن والأحياء للافتراضي؟')) resetToDefaults(); }}
        style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
        إعادة تعيين للافتراضي
      </button>
    </div>
  );
}

/* ─── تبويب الأحياء ───────────────────────────────────────── */
function DistrictsTab() {
  const { cities, districts, addDistrict, updateDistrict, deleteDistrict } = useMasterDataStore();
  const [selectedCity, setSelectedCity] = useState<string>(cities[0]?.id ?? '');
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<District>>({});
  const [newName,  setNewName]  = useState('');
  const [newAliases, setNewAliases] = useState('');

  const cityDistricts = districts.filter(d => d.cityId === selectedCity);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name || !selectedCity) return;
    addDistrict({
      id:      nanoid(),
      cityId:  selectedCity,
      name,
      aliases: newAliases.split(',').map(a => a.trim()).filter(Boolean),
    });
    setNewName('');
    setNewAliases('');
  };

  const startEdit = (d: District) => {
    setEditId(d.id);
    setEditData({ name: d.name, aliases: [...d.aliases] });
  };

  const saveEdit = (id: string) => {
    updateDistrict(id, {
      name:    editData.name?.trim(),
      aliases: typeof editData.aliases === 'string'
        ? (editData.aliases as unknown as string).split(',').map((a: string) => a.trim()).filter(Boolean)
        : editData.aliases,
    });
    setEditId(null);
  };

  return (
    <div>
      {/* City selector */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>المدينة:</label>
        <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={SELECT}>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#6b7280' }}>({cityDistricts.length} حي)</span>
      </div>

      {/* Add district */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="اسم الحي" style={{ ...INPUT, minWidth: 150 }} />
        <input value={newAliases} onChange={e => setNewAliases(e.target.value)}
          placeholder="أسماء بديلة (مفصولة بفاصلة)"
          style={{ ...INPUT, flex: 1, minWidth: 200 }} />
        <Btn onClick={handleAdd} color="green">+ إضافة</Btn>
      </div>

      {/* Table */}
      {cityDistricts.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: 32 }}>
          لا توجد أحياء لهذه المدينة — أضف أولاً
        </p>
      ) : (
        <table style={TABLE}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <TH>الحي</TH>
              <TH>الأسماء البديلة (Aliases)</TH>
              <TH center>الإجراءات</TH>
            </tr>
          </thead>
          <tbody>
            {cityDistricts.map(d => (
              <tr key={d.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <TD>
                  {editId === d.id ? (
                    <input value={editData.name ?? ''} onChange={e => setEditData(s => ({ ...s, name: e.target.value }))}
                      autoFocus style={{ ...INPUT, width: 140 }} />
                  ) : (
                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                  )}
                </TD>
                <TD>
                  {editId === d.id ? (
                    <input
                      value={Array.isArray(editData.aliases) ? editData.aliases.join(', ') : ''}
                      onChange={e => setEditData(s => ({
                        ...s,
                        aliases: e.target.value.split(',').map(a => a.trim()).filter(Boolean),
                      }))}
                      placeholder="alias1, alias2"
                      style={{ ...INPUT, width: '100%', fontSize: 12 }}
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {d.aliases.length > 0 ? d.aliases.join(' · ') : <em>—</em>}
                    </span>
                  )}
                </TD>
                <TD center>
                  {editId === d.id ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <Btn onClick={() => saveEdit(d.id)} color="green" small>حفظ</Btn>
                      <Btn onClick={() => setEditId(null)} small>إلغاء</Btn>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <Btn onClick={() => startEdit(d)} small>تعديل</Btn>
                      <Btn onClick={() => { if (confirm(`حذف "${d.name}"؟`)) deleteDistrict(d.id); }} color="red" small>حذف</Btn>
                    </div>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── تبويب الأكواد ───────────────────────────────────────── */
function ZoningTab() {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        background: '#f0fdf4', border: '1px solid #86efac',
        borderRadius: 10, padding: '14px 18px', fontSize: 14, color: '#15803d',
      }}>
        أكواد البناء تُدار من صفحة{' '}
        <a href="/settings/zoning-config" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'underline' }}>
          إعدادات أكواد البناء
        </a>
        {' '}— تتضمن القواعد، الأوزان، ومزايا الموقع لكل كود.
      </div>

      <div style={{ marginTop: 24, padding: '16px 18px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>الأكواد المتاحة حالياً</h4>
        <ZoningCodesList />
      </div>
    </div>
  );
}

function ZoningCodesList() {
  const zoningConfigs = useAnalysisStore((s) => s.zoningConfigs);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {zoningConfigs.map((z) => (
        <span key={z.code} style={{
          padding: '4px 12px', background: '#fff', border: '1px solid #d1d5db',
          borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#374151',
        }}>
          {z.code}
          <span style={{ color: '#9ca3af', fontWeight: 400, marginRight: 4, fontSize: 11 }}>
            {z.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ─── Shared UI helpers ───────────────────────────────────── */

const INPUT: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: 14, outline: 'none', fontFamily: 'Tajawal, sans-serif',
};

const SELECT: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14,
};

const TABLE: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 14,
  border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
};

function TH({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th style={{ padding: '10px 12px', textAlign: center ? 'center' : 'right', fontWeight: 600, color: '#374151' }}>
      {children}
    </th>
  );
}
function TD({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <td style={{ padding: '10px 12px', textAlign: center ? 'center' : 'right', verticalAlign: 'middle' }}>
      {children}
    </td>
  );
}

function Btn({ children, onClick, color, small }: {
  children: React.ReactNode; onClick: () => void;
  color?: 'green' | 'red'; small?: boolean;
}) {
  const bg =
    color === 'green' ? '#15803d' :
    color === 'red'   ? '#dc2626' :
    '#f3f4f6';
  const fg = color ? '#fff' : '#374151';
  const border = color ? 'none' : '1px solid #d1d5db';
  return (
    <button onClick={onClick} style={{
      padding: small ? '3px 10px' : '6px 16px',
      background: bg, color: fg, border, borderRadius: 6,
      fontSize: small ? 12 : 13, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'Tajawal, sans-serif',
    }}>
      {children}
    </button>
  );
}
