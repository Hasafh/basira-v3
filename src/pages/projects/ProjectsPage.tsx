import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsAPI } from '../../api';
import { useProjectsStore } from '../../store';
import { useAnalysisStore } from '../../store/analysisStore';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'مسودة',       color: 'rgba(10,12,18,0.4)',  bg: 'rgba(10,12,18,0.06)' },
  active:    { label: 'نشط',         color: '#16a34a',              bg: 'rgba(34,197,94,0.08)' },
  completed: { label: 'مكتمل',       color: '#2563eb',              bg: 'rgba(37,99,235,0.08)' },
  archived:  { label: 'مؤرشف',       color: 'rgba(10,12,18,0.3)',  bg: 'rgba(10,12,18,0.05)' },
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setCurrentProject, currentProject } = useProjectsStore();
  const { projectResults, initFormForProject } = useAnalysisStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', status: 'draft', landArea: '', landPricePerM2: '', sellPricePerM2: '' });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', status: 'draft' });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsAPI.list();
      return res.data?.data || res.data?.projects || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => projectsAPI.create(d),
    onSuccess: (res) => {
      const p = res.data?.data?.project ?? res.data?.data ?? res.data?.project ?? res.data;
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('✅ تم إنشاء المشروع');
      setShowModal(false);
      if (p?.id) {
        setCurrentProject(p);
        // Pre-fill any land data the user entered in the modal
        const prefill: Record<string, string> = {};
        if (form.landArea)       prefill.landArea       = form.landArea;
        if (form.landPricePerM2) prefill.landPricePerM2 = form.landPricePerM2;
        if (form.sellPricePerM2) prefill.sellPricePerM2 = form.sellPricePerM2;
        if (Object.keys(prefill).length > 0) initFormForProject(p.id, prefill);
        setForm({ name: '', location: '', status: 'draft', landArea: '', landPricePerM2: '', sellPricePerM2: '' });
        navigate(`/project/${p.id}#basics`);
      } else {
        setForm({ name: '', location: '', status: 'draft', landArea: '', landPricePerM2: '', sellPricePerM2: '' });
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'تعذّر إنشاء المشروع'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => projectsAPI.patch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('✅ تم تحديث المشروع');
      setEditTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'تعذّر التحديث'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (currentProject?.id === deleteTarget?.id) setCurrentProject(null);
      toast.success('تم حذف المشروع');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'تعذّر حذف المشروع'),
  });

  const open = (p: any) => {
    setCurrentProject(p);
    navigate(`/project/${p.id}#basics`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-lg" style={{ color: '#0A0C12' }}>مشاريعي</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>
            {projects.length} مشروع
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}
        >
          + مشروع جديد
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(184,146,74,0.3)', borderTopColor: '#B8924A' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-5xl">🏗️</div>
          <p className="font-medium" style={{ color: 'rgba(10,12,18,0.5)' }}>لا توجد مشاريع بعد</p>
          <button onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #C9A05E, #B8924A)', color: '#0A0C12' }}>
            أنشئ أول مشروع
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projects as any[]).map((p: any) => {
            const _raw = projectResults[p.id] ?? p.result ?? null;
            const f = _raw?.financials ?? _raw?.feasibility?.financials ?? null;
            const st = STATUS_LABELS[p.status] || STATUS_LABELS.draft;
            return (
              <div
                key={p.id}
                className="rounded-2xl p-5 transition-all cursor-pointer group"
                style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(184,146,74,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => open(p)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: 'rgba(184,146,74,0.10)' }}
                  >🏛</div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                    {/* Edit button */}
                    <button
                      onClick={e => { e.stopPropagation(); setEditForm({ name: p.name, location: p.location || '', status: p.status || 'draft' }); setEditTarget(p); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: 'rgba(37,99,235,0.6)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; e.currentTarget.style.color = '#2563eb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(37,99,235,0.6)'; }}
                      title="تعديل المشروع"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: 'rgba(220,38,38,0.6)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(220,38,38,0.6)'; }}
                      title="حذف المشروع"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-sm mb-0.5" style={{ color: '#0A0C12' }}>{p.name}</h3>
                {p.location && (
                  <p className="text-xs mb-4" style={{ color: 'rgba(10,12,18,0.4)' }}>{p.location}</p>
                )}

                {/* KPIs */}
                {f ? (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { l: 'IRR',    v: f.irr    != null && isFinite(f.irr)    ? `${f.irr.toFixed(1)}٪`    : '--', c: '#16a34a' },
                      { l: 'الهامش', v: f.margin != null && isFinite(f.margin) ? `${f.margin.toFixed(1)}٪` : '--', c: '#B8924A' },
                      { l: 'ROI',    v: f.roi    != null && isFinite(f.roi)    ? `${f.roi.toFixed(1)}٪`    : '--', c: '#2563eb' },
                    ].map(k => (
                      <div key={k.l} className="rounded-xl p-2 text-center"
                        style={{ background: '#F4F3EF' }}>
                        <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>{k.l}</p>
                        <p className="font-bold num text-sm" style={{ color: k.c }}>{k.v}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl p-2.5 text-xs text-center"
                    style={{ background: 'rgba(184,146,74,0.05)', border: '1px dashed rgba(184,146,74,0.2)', color: 'rgba(10,12,18,0.4)' }}>
                    ← أدخل البيانات وشغّل التحليل
                  </div>
                )}

                <button
                  className="w-full py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: 'rgba(184,146,74,0.09)',
                    color: '#B8924A',
                    border: '1px solid rgba(184,146,74,0.20)',
                  }}
                >
                  فتح المشروع ←
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(10,12,18,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-fadeup"
            style={{ background: 'white', margin: '16px' }}
            dir="rtl"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(220,38,38,0.08)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 className="font-bold text-base mb-1" style={{ color: '#0A0C12' }}>حذف المشروع</h3>
            <p className="text-sm mb-1" style={{ color: 'rgba(10,12,18,0.6)' }}>
              هل تريد حذف مشروع <span className="font-bold" style={{ color: '#0A0C12' }}>"{deleteTarget.name}"</span>؟
            </p>
            <p className="text-xs mb-6" style={{ color: 'rgba(220,38,38,0.7)' }}>لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#F4F3EF', color: 'rgba(10,12,18,0.6)' }}
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#dc2626', color: 'white', opacity: deleteMutation.isPending ? 0.6 : 1 }}
              >
                {deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(10,12,18,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 animate-fadeup"
            style={{ background: 'white', margin: '16px' }}
            dir="rtl"
          >
            <h3 className="font-bold text-base mb-5" style={{ color: '#0A0C12' }}>تعديل المشروع</h3>

            {[
              { label: 'اسم المشروع *', key: 'name',     placeholder: 'اسم المشروع' },
              { label: 'الموقع',         key: 'location', placeholder: 'الموقع' },
            ].map(f => (
              <div key={f.key} className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                  {f.label}
                </label>
                <input
                  value={(editForm as any)[f.key]}
                  onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full text-sm"
                  style={{
                    border: '1px solid rgba(10,12,18,0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    outline: 'none',
                    fontFamily: 'Tajawal, sans-serif',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            ))}

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>الحالة</label>
              <select
                value={editForm.status}
                onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full text-sm"
                style={{ border: '1px solid rgba(10,12,18,0.12)', borderRadius: '12px', padding: '10px 14px', outline: 'none', fontFamily: 'Tajawal, sans-serif', background: 'white', cursor: 'pointer' }}
              >
                <option value="draft">مسودة</option>
                <option value="active">نشط</option>
                <option value="completed">مكتمل</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#F4F3EF', color: 'rgba(10,12,18,0.6)' }}
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (editForm.name.trim()) {
                    editMutation.mutate({ id: editTarget.id, data: { name: editForm.name, location: editForm.location, status: editForm.status } });
                  }
                }}
                disabled={!editForm.name.trim() || editMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: editForm.name.trim() ? 'linear-gradient(135deg, #C9A05E, #B8924A)' : 'rgba(184,146,74,0.3)',
                  color: editForm.name.trim() ? '#0A0C12' : 'rgba(10,12,18,0.4)',
                }}
              >
                {editMutation.isPending ? '...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(10,12,18,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 animate-fadeup"
            style={{ background: 'white', margin: '16px' }}
            dir="rtl"
          >
            <h3 className="font-bold text-base mb-5" style={{ color: '#0A0C12' }}>مشروع جديد</h3>

            {[
              { label: 'اسم المشروع *', key: 'name', placeholder: 'مثال: برج الرياض السكني', type: 'text' },
              { label: 'الموقع',         key: 'location', placeholder: 'مثال: الرياض — حي العليا', type: 'text' },
            ].map(f => (
              <div key={f.key} className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(10,12,18,0.5)' }}>
                  {f.label}
                </label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full text-sm"
                  style={{
                    border: '1px solid rgba(10,12,18,0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    outline: 'none',
                    fontFamily: 'Tajawal, sans-serif',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            ))}

            {/* Optional land data — pre-fills the analysis form */}
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(184,146,74,0.06)', border: '1px dashed rgba(184,146,74,0.35)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#B8924A' }}>بيانات الأرض (اختياري — توفّر الوقت)</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'مساحة م²', key: 'landArea', placeholder: '500' },
                  { label: 'سعر/م²', key: 'landPricePerM2', placeholder: '3000' },
                  { label: 'بيع/م²', key: 'sellPricePerM2', placeholder: '6000' },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className="block text-xs mb-1" style={{ color: 'rgba(10,12,18,0.45)' }}>{f.label}</label>
                    <input
                      type="number" min="0"
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full text-sm"
                      style={{
                        border: '1px solid rgba(184,146,74,0.25)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        outline: 'none',
                        fontFamily: 'IBM Plex Mono, monospace',
                        background: 'white',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(184,146,74,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#F4F3EF', color: 'rgba(10,12,18,0.6)' }}
              >
                إلغاء
              </button>
              <button
                onClick={() => { if (form.name.trim()) createMutation.mutate(form); }}
                disabled={!form.name.trim() || createMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: form.name.trim() ? 'linear-gradient(135deg, #C9A05E, #B8924A)' : 'rgba(184,146,74,0.3)',
                  color: form.name.trim() ? '#0A0C12' : 'rgba(10,12,18,0.4)',
                }}
              >
                {createMutation.isPending ? '...' : 'إنشاء المشروع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
