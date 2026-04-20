import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../api';
import { useAuthStore } from '../../store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, token } = useAuthStore();

  // Already logged in → go to dashboard
  if (token) return <Navigate to="/dashboard" replace />;
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const doLogin = async (demo = false) => {
    setLoading(true);
    try {
      const res = demo ? await authAPI.demo() : await authAPI.login(email, pass);
      const d = res.data?.data || res.data;
      setAuth(d.token, d.user);
      navigate('/dashboard');
    } catch (e: any) {
      const msg = e?.response?.data?.message
        || e?.response?.data?.error
        || 'فشل تسجيل الدخول — تحقق من البريد وكلمة المرور';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0A0C12' }}
    >
      {/* ── Background pattern ── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#B8924A" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Gold orb top-right */}
        <div
          className="absolute rounded-full"
          style={{
            width: 480, height: 480,
            top: -120, left: -120,
            background: 'radial-gradient(circle, rgba(184,146,74,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 320, height: 320,
            bottom: -60, right: -60,
            background: 'radial-gradient(circle, rgba(184,146,74,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Card ── */}
      <div
        className="relative w-full max-w-sm mx-4 animate-fadeup"
        style={{
          background: 'rgba(19,22,33,0.95)',
          border: '1px solid rgba(184,146,74,0.20)',
          borderRadius: '20px',
          padding: '40px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,146,74,0.08)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div
              style={{
                width: 56, height: 56,
                background: 'linear-gradient(135deg, rgba(184,146,74,0.2) 0%, rgba(184,146,74,0.05) 100%)',
                border: '1px solid rgba(184,146,74,0.30)',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '24px', color: '#B8924A', fontWeight: 900 }}>ب</span>
            </div>
          </div>
          <h1
            className="font-black"
            style={{
              fontSize: '32px',
              color: '#B8924A',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            بصيرة
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(184,146,74,0.55)' }}>
            منصة الذكاء العقاري
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={e => e.key === 'Enter' && doLogin(false)}
              className="w-full text-sm transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(184,146,74,0.20)',
                borderRadius: '12px',
                padding: '11px 14px',
                color: 'rgba(255,255,255,0.85)',
                outline: 'none',
                fontFamily: 'Tajawal, sans-serif',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#B8924A';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(184,146,74,0.20)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && doLogin(false)}
                className="w-full text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(184,146,74,0.20)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  paddingLeft: '40px',
                  color: 'rgba(255,255,255,0.85)',
                  outline: 'none',
                  fontFamily: 'Tajawal, sans-serif',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#B8924A';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,146,74,0.12)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(184,146,74,0.20)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Login btn */}
          <button
            onClick={() => doLogin(false)}
            disabled={loading || !email || !pass}
            className="w-full font-bold py-3 rounded-xl text-sm transition-all relative overflow-hidden"
            style={{
              background: loading || !email || !pass
                ? 'rgba(184,146,74,0.3)'
                : 'linear-gradient(135deg, #C9A05E 0%, #B8924A 50%, #9A7535 100%)',
              color: loading || !email || !pass ? 'rgba(255,255,255,0.4)' : '#0A0C12',
              cursor: loading || !email || !pass ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              letterSpacing: '0.3px',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                جاري الدخول...
              </span>
            ) : 'دخول'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(184,146,74,0.12)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>أو</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(184,146,74,0.12)' }} />
          </div>

          {/* Demo btn */}
          <button
            onClick={() => doLogin(true)}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'transparent',
              border: '1px solid rgba(184,146,74,0.25)',
              color: '#B8924A',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as any).style.background = 'rgba(184,146,74,0.08)';
                (e.currentTarget as any).style.borderColor = 'rgba(184,146,74,0.4)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as any).style.background = 'transparent';
              (e.currentTarget as any).style.borderColor = 'rgba(184,146,74,0.25)';
            }}
          >
            🚀 دخول تجريبي
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          منصة بصيرة © 2025
        </p>
      </div>
    </div>
  );
}
