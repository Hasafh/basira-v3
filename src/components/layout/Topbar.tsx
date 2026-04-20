import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useProjectsStore } from '../../store';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentProject } = useProjectsStore();

  const inProject = location.pathname.startsWith('/project/');
  const inReports = location.pathname === '/reports';
  const inAdmin   = location.pathname === '/admin';

  const displayTitle =
    title ||
    (inProject  ? currentProject?.name  : null) ||
    (inReports  ? 'التقارير'             : null) ||
    (inAdmin    ? 'الإدارة'              : null) ||
    'لوحة التحكم';

  const displaySub =
    subtitle ||
    (inProject && currentProject?.location) ||
    '';

  return (
    <header
      dir="rtl"
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        background: 'white',
        borderBottom: '1px solid rgba(10,12,18,0.07)',
        minHeight: '56px',
      }}
    >
      {/* ── Right: back + breadcrumb ── */}
      <div className="flex items-center gap-3">
        {inProject && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: 'rgba(10,12,18,0.45)', background: 'transparent' }}
            onMouseEnter={e => {
              (e.currentTarget as any).style.background = '#F4F3EF';
              (e.currentTarget as any).style.color = '#0A0C12';
            }}
            onMouseLeave={e => {
              (e.currentTarget as any).style.background = 'transparent';
              (e.currentTarget as any).style.color = 'rgba(10,12,18,0.45)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            المشاريع
          </button>
        )}

        {inProject && (
          <span style={{ color: 'rgba(10,12,18,0.18)', fontSize: '12px' }}>/</span>
        )}

        <div>
          <h1 className="font-bold text-sm" style={{ color: '#0A0C12' }}>
            {displayTitle}
          </h1>
          {displaySub && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(10,12,18,0.4)' }}>
              {displaySub}
            </p>
          )}
        </div>

        {/* Quick project switcher badge */}
        {inProject && currentProject && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: currentProject.status === 'completed'
                ? 'rgba(34,197,94,0.1)' : 'rgba(184,146,74,0.1)',
              color: currentProject.status === 'completed' ? '#16a34a' : '#B8924A',
            }}
          >
            {currentProject.status === 'completed' ? 'محلَّل' : 'مسودة'}
          </span>
        )}
      </div>

      {/* ── Left: user ── */}
      <div className="flex items-center gap-3">
        <div className="text-left">
          <p className="text-xs font-medium" style={{ color: '#0A0C12' }}>{user?.name}</p>
          <p className="text-xs" style={{ color: 'rgba(10,12,18,0.4)' }}>
            {user?.role === 'admin' ? 'مدير' : 'محلل'}
          </p>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: 'rgba(184,146,74,0.12)', color: '#B8924A' }}
        >
          {user?.name?.charAt(0) || 'م'}
        </div>
      </div>
    </header>
  );
}
