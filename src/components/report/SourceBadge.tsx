import { sourceLabel, type DataSourceType } from '../../lib/types/report';

const SOURCE_COLORS: Record<DataSourceType, string> = {
  manual:  'bg-gray-100 text-gray-500',
  derived: 'bg-blue-50 text-blue-600',
  erp:     'bg-green-50 text-green-600',
  market:  'bg-amber-50 text-amber-600',
};

const SOURCE_STYLES: Record<DataSourceType, React.CSSProperties> = {
  manual:  { background: '#f3f4f6', color: '#6b7280' },
  derived: { background: '#eff6ff', color: '#2563eb' },
  erp:     { background: '#f0fdf4', color: '#16a34a' },
  market:  { background: '#fffbeb', color: '#d97706' },
};

interface Props {
  source: DataSourceType;
  small?: boolean;
}

export function SourceBadge({ source, small = false }: Props) {
  return (
    <span style={{
      ...SOURCE_STYLES[source],
      display:      'inline-block',
      padding:      small ? '1px 6px' : '2px 8px',
      borderRadius: 4,
      fontSize:     small ? 10 : 11,
      fontWeight:   600,
      whiteSpace:   'nowrap',
    }}>
      {sourceLabel(source)}
    </span>
  );
}

// also export class-based version for Tailwind contexts
export { SOURCE_COLORS };
