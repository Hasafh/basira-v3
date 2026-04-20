import { useState } from 'react';
import { useAuthStore } from '../../store';

const SECTIONS = [
  {
    id: 'branding',
    title: 'الهوية البصرية',
    icon: '🎨',
    fields: [
      { key: 'logo',       label: 'شعار المنصة',       type: 'text',  placeholder: 'بصيرة' },
      { key: 'brandColor', label: 'اللون الرئيسي',     type: 'color', placeholder: '#B8924A' },
      { key: 'tagline',    label: 'الشعار التعريفي',   type: 'text',  placeholder: 'منصة الذكاء العقاري' },
    ],
  },
  {
    id: 'defaults',
    title: 'القيم الافتراضية للتقارير',
    icon: '⚙️',
    fields: [
      { key: 'buildCost',     label: 'تكلفة البناء الافتراضية (ر.س/م²)',  type: 'number', placeholder: '2000' },
      { key: 'bankRate',      label: 'معدل الفائدة البنكية الافتراضي',     type: 'number', placeholder: '7' },
      { key: 'softCostsPct',  label: 'نسبة التكاليف الناعمة',              type: 'number', placeholder: '5' },
      { key: 'profitTarget',  label: 'هدف الربح الافتراضي ٪',             type: 'number', placeholder: '25' },
    ],
  },
  {
    id: 'users',
    title: 'إدارة المستخدمين',
    icon: '👥',
    fields: [],
    custom: true,
  },
];

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState('branding');
  const [values, setValues] = useState<Record<string, string>>({});

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="text-center">
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-bold text-sm" style={{ color: '#0A0C12' }}>صلاحية محدودة</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.45)' }}>
            هذه الصفحة متاحة للمديرين فقط
          </p>
        </div>
      </div>
    );
  }

  const sec = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="flex h-full" dir="rtl">
      {/* Section nav */}
      <div
        className="w-48 shrink-0 p-3 space-y-1"
        style={{ background: 'white', borderLeft: '1px solid rgba(10,12,18,0.07)' }}
      >
        <p className="text-xs font-medium px-2 py-1 mb-2" style={{ color: 'rgba(10,12,18,0.4)' }}>
          أقسام الإدارة
        </p>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-right"
            style={{
              background: activeSection === s.id ? 'rgba(184,146,74,0.10)' : 'transparent',
              color:      activeSection === s.id ? '#B8924A' : 'rgba(10,12,18,0.5)',
            }}
          >
            <span>{s.icon}</span>
            {s.title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {sec && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="font-bold text-base" style={{ color: '#0A0C12' }}>
                {sec.icon} {sec.title}
              </h2>
            </div>

            {sec.custom && sec.id === 'users' ? (
              <UsersSection />
            ) : (
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}
              >
                {sec.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={values[f.key] || ''}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full text-sm"
                      style={{
                        border: '1px solid rgba(10,12,18,0.12)',
                        borderRadius: '12px', padding: '10px 14px',
                        outline: 'none', fontFamily: 'Tajawal, sans-serif',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#B8924A';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                ))}
                <button
                  className="px-6 py-2.5 rounded-xl text-sm font-bold mt-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
                  onClick={() => alert('سيتم حفظ الإعدادات عند ربط الـ API')}
                >
                  حفظ التغييرات
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersSection() {
  const mockUsers = [
    { id: 1, name: 'أحمد المطوّع', email: 'ahmed@example.com', role: 'admin',  reports: 50, aiChats: 100, used: 12 },
    { id: 2, name: 'فهد العمري',   email: 'fahad@example.com', role: 'analyst', reports: 20, aiChats: 50,  used: 5  },
    { id: 3, name: 'سارة الجريد',  email: 'sara@example.com',  role: 'viewer',  reports: 10, aiChats: 20,  used: 3  },
  ];

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}
      >
        {mockUsers.map((u, i) => (
          <div
            key={u.id}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderBottom: i < mockUsers.length - 1 ? '1px solid rgba(10,12,18,0.05)' : 'none' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: 'rgba(184,146,74,0.12)', color: '#B8924A' }}
            >
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: '#0A0C12' }}>{u.name}</p>
              <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{u.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: u.role === 'admin' ? 'rgba(184,146,74,0.10)' : 'rgba(10,12,18,0.05)',
                  color:      u.role === 'admin' ? '#B8924A' : 'rgba(10,12,18,0.5)',
                }}
              >
                {u.role === 'admin' ? 'مدير' : u.role === 'analyst' ? 'محلل' : 'مشاهد'}
              </span>
              <div className="text-center">
                <p className="text-xs font-mono" style={{ color: '#0A0C12' }}>{u.used}/{u.reports}</p>
                <p className="text-xs" style={{ color: 'rgba(10,12,18,0.35)' }}>تقرير</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center" style={{ color: 'rgba(10,12,18,0.35)' }}>
        إدارة المستخدمين ستتصل بـ API الإدارة قريباً
      </p>
    </div>
  );
}
