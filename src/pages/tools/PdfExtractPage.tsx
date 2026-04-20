import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { documentsAPI } from '../../api';
import { useProjectsStore } from '../../store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function DocumentsPage() {
  const { currentProject } = useProjectsStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Record<string, any>>({});

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const res = await documentsAPI.list(currentProject.id);
      return res.data?.data || res.data?.documents || res.data || [];
    },
    enabled: !!currentProject?.id,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      if (currentProject?.id) fd.append('projectId', currentProject.id);
      fd.append('type', file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
      return documentsAPI.upload(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', currentProject?.id] });
      toast.success('✅ تم رفع الملف');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || 'تعذّر رفع الملف');
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    if (!currentProject?.id) { toast.error('اختر مشروعاً أولاً'); return; }
    Array.from(files).forEach(f => upload.mutate(f));
  };

  const extractDoc = async (doc: any) => {
    setExtracting(doc.id);
    try {
      const res = await documentsAPI.extract(doc.id);
      const data = res.data?.data || res.data;
      setExtracted(prev => ({ ...prev, [doc.id]: data }));
      toast.success('✅ تم استخراج البيانات بالذكاء الاصطناعي');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر الاستخراج');
    } finally {
      setExtracting(null);
    }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="px-6 py-5" style={{ background: 'white', borderBottom: '1px solid rgba(10,12,18,0.07)' }}>
        <h1 className="font-bold text-base" style={{ color: '#0A0C12' }}>قراءة المستندات</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.45)' }}>
          رفع صكوك الملكية والوثائق العقارية — يستخرج AI البيانات تلقائياً
          {currentProject && <span style={{ color: '#B8924A' }}> · {currentProject.name}</span>}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-5">
        {!currentProject && (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
            <span style={{ color: '#d97706' }}>💡 اختر مشروعاً من الشريط الجانبي لإرفاق المستندات به</span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 py-12 cursor-pointer transition-all"
          style={{
            borderColor: dragging ? '#B8924A' : 'rgba(184,146,74,0.25)',
            background:  dragging ? 'rgba(184,146,74,0.05)' : 'white',
          }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'rgba(184,146,74,0.08)' }}>📄</div>
          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: '#0A0C12' }}>
              اسحب وأفلت الملفات هنا أو انقر للاختيار
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(10,12,18,0.4)' }}>
              PDF، صورة (JPG/PNG) — صكوك الملكية، رخص البناء، مخططات الأرض
            </p>
          </div>
          {upload.isPending && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#B8924A' }}>
              <div className="w-4 h-4 border-2 border-gold rounded-full animate-spin"
                style={{ borderColor: 'rgba(184,146,74,0.3)', borderTopColor: '#B8924A' }} />
              جاري الرفع...
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Documents list */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(184,146,74,0.3)', borderTopColor: '#B8924A' }} />
          </div>
        ) : (docs as any[]).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'rgba(10,12,18,0.4)' }}>لا توجد مستندات مرفوعة بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(docs as any[]).map((doc: any) => (
              <DocCard
                key={doc.id} doc={doc}
                extracting={extracting === doc.id}
                extracted={extracted[doc.id]}
                onExtract={() => extractDoc(doc)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocCard({ doc, extracting, extracted, onExtract }: {
  doc: any; extracting: boolean; extracted: any; onExtract: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isPDF = doc.type === 'pdf' || doc.filename?.endsWith('.pdf');

  return (
    <div style={{ background: 'white', border: '1px solid rgba(10,12,18,0.07)', borderRadius: '16px' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: isPDF ? 'rgba(239,68,68,0.08)' : 'rgba(37,99,235,0.08)' }}>
          {isPDF ? '📑' : '🖼️'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: '#0A0C12' }}>
            {doc.originalName || doc.filename || 'مستند'}
          </p>
          <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
            {doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : ''}
            {doc.createdAt && ` · ${new Date(doc.createdAt).toLocaleDateString('ar-SA')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {doc.extractedAt || extracted ? (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>✓ مستخرَج</span>
          ) : null}
          <button onClick={onExtract} disabled={extracting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: extracting ? 'rgba(184,146,74,0.2)' : 'rgba(184,146,74,0.10)',
              color: '#B8924A',
              cursor: extracting ? 'not-allowed' : 'pointer',
            }}>
            {extracting ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border rounded-full animate-spin"
                  style={{ borderColor: 'rgba(184,146,74,0.3)', borderTopColor: '#B8924A' }} />
                جاري...
              </span>
            ) : '🤖 استخراج AI'}
          </button>
          <button onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(10,12,18,0.4)', background: open ? '#F4F3EF' : 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 14 14"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}>
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Extracted data */}
      {open && (extracted || doc.extracted) && (
        <div className="px-5 pb-4 animate-fadeup" style={{ borderTop: '1px solid rgba(10,12,18,0.06)' }}>
          <p className="text-xs font-medium pt-3 mb-3" style={{ color: 'rgba(10,12,18,0.5)' }}>
            البيانات المستخرجة بالذكاء الاصطناعي:
          </p>
          <ExtractedData data={extracted || doc.extracted} />
        </div>
      )}
    </div>
  );
}

function ExtractedData({ data }: { data: any }) {
  if (!data) return null;

  // Handle different response shapes
  const fields = typeof data === 'object' && !Array.isArray(data)
    ? Object.entries(data).filter(([k]) => !['_id', 'id', 'documentId', '__v'].includes(k))
    : [];

  if (data.rawText) {
    return (
      <div className="rounded-xl p-4 text-xs font-mono"
        style={{ background: '#F4F3EF', color: '#0A0C12', maxHeight: '200px', overflowY: 'auto', lineHeight: 1.8 }}>
        {data.rawText}
      </div>
    );
  }

  if (fields.length === 0) {
    return <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>لا توجد بيانات مستخرجة</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map(([key, value]) => (
        <div key={key} className="rounded-lg p-2.5"
          style={{ background: '#F4F3EF' }}>
          <p className="text-xs mb-0.5 capitalize" style={{ color: 'rgba(10,12,18,0.45)' }}>
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </p>
          <p className="text-xs font-medium" style={{ color: '#0A0C12' }}>
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
