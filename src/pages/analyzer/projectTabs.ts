export const PROJECT_TABS = [
  { id: 'dimensions', label: 'الأبعاد',  icon: '📐' },
  { id: 'basics',     label: 'الأساسي',  icon: '📋' },
  { id: 'costs',      label: 'التكاليف', icon: '💰' },
  { id: 'finance',    label: 'التمويل',  icon: '🏦' },
  { id: 'results',    label: 'النتائج',  icon: '📊' },
] as const;

export type TabId = typeof PROJECT_TABS[number]['id'];
