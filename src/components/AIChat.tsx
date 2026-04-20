import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { aiAPI } from '../api';
import { useProjectsStore } from '../store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export default function AIChat() {
  const { currentProject } = useProjectsStore();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([{
    role: 'assistant',
    content: 'مرحباً! أنا المحلل الذكي لبصيرة. يمكنني مساعدتك في تحليل مشاريعك العقارية، تفسير النتائج، ومقارنة السيناريوهات. كيف يمكنني مساعدتك؟',
    ts: Date.now(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text, ts: Date.now() };
    setMsgs(m => [...m, userMsg]);
    setLoading(true);
    try {
      const history = msgs.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await aiAPI.chat({
        message: text,
        projectId: currentProject?.id,
        history,
      });
      const reply = res.data?.data?.message || res.data?.message || res.data?.reply || res.data?.answer || 'تم استلام رسالتك، جاري المعالجة...';
      setMsgs(m => [...m, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (e: any) {
      const errMsg = e?.response?.data?.error || e?.response?.data?.message;
      if (errMsg) {
        setMsgs(m => [...m, { role: 'assistant', content: `⚠️ ${errMsg}`, ts: Date.now() }]);
      } else {
        toast.error('تعذّر الوصول للمحلل الذكي');
        setMsgs(m => m.slice(0, -1));
        setInput(text);
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all"
        style={{
          background: open
            ? '#0A0C12'
            : 'linear-gradient(135deg, #C9A05E 0%, #B8924A 100%)',
          boxShadow: '0 8px 24px rgba(184,146,74,0.35)',
          transform: open ? 'rotate(45deg)' : 'rotate(0)',
        }}
        title="المحلل الذكي"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          dir="rtl"
          className="fixed bottom-24 left-6 z-50 w-96 rounded-2xl overflow-hidden animate-fadeup"
          style={{
            background: 'white',
            border: '1px solid rgba(184,146,74,0.20)',
            boxShadow: '0 24px 80px rgba(10,12,18,0.15)',
            maxHeight: '560px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ background: '#0A0C12', borderBottom: '1px solid rgba(184,146,74,0.15)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'rgba(184,146,74,0.15)' }}>🤖</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: '#F4F3EF' }}>المحلل الذكي</p>
              {currentProject && (
                <p className="text-xs" style={{ color: 'rgba(184,146,74,0.7)' }}>
                  {currentProject.name}
                </p>
              )}
            </div>
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} title="متصل" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0, maxHeight: '380px' }}>
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className="max-w-xs rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    background: m.role === 'user'
                      ? '#0A0C12'
                      : 'rgba(184,146,74,0.10)',
                    color: m.role === 'user' ? '#F4F3EF' : '#0A0C12',
                    borderRadius: m.role === 'user'
                      ? '20px 20px 4px 20px'
                      : '20px 20px 20px 4px',
                    lineHeight: 1.6,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(184,146,74,0.08)', borderRadius: '20px 20px 20px 4px' }}>
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: '#B8924A', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3" style={{ borderTop: '1px solid rgba(10,12,18,0.07)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="اسأل عن المشروع..."
              disabled={loading}
              className="flex-1 text-sm"
              style={{
                border: '1px solid rgba(10,12,18,0.12)',
                borderRadius: '12px', padding: '9px 14px',
                outline: 'none', fontFamily: 'Tajawal, sans-serif',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#B8924A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(10,12,18,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{
                background: !input.trim() || loading ? 'rgba(184,146,74,0.2)' : 'linear-gradient(135deg, #C9A05E, #B8924A)',
                color: !input.trim() || loading ? 'rgba(184,146,74,0.5)' : '#0A0C12',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L2 6.5L7 8.5L9 13.5L14 2Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Suggestions */}
          {msgs.length === 1 && (
            <div className="px-3 pb-3 flex flex-wrap gap-1.5">
              {[
                'ما هو الاستخدام الأمثل لهذه الأرض؟',
                'هل هذا الاستثمار مربح؟',
                'ما هو سعر الأرض المناسب؟',
                'فسّر نتائج التحليل',
              ].map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{ background: 'rgba(184,146,74,0.08)', color: '#B8924A', border: '1px solid rgba(184,146,74,0.20)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
