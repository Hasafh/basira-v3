import { useMasterDataStore } from '../../store/masterDataStore';

interface Props {
  value:       string;            // city id
  onChange:    (cityId: string) => void;
  placeholder?: string;
  className?:  string;
  style?:      React.CSSProperties;
  disabled?:   boolean;
}

export default function CitySelect({
  value, onChange,
  placeholder = 'اختر المدينة',
  className, style, disabled,
}: Props) {
  const cities = useMasterDataStore(s => s.cities);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={className}
      style={style}
    >
      <option value="">{placeholder}</option>
      {cities.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
