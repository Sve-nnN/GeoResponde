import { useTranslation } from 'react-i18next';

interface Props {
  min: number | null;
  max: number | null;
  value: number;
  onChange: (epoch: number) => void;
}

/**
 * Order-of-appearance timeline scrubber. A native range input spans the
 * `min..max` first-appearance epochs; scrubbing left hides the most recent
 * events first (the parent filters features to `firstDateEpoch <= value`).
 * Disables itself when there is no range (min/max null).
 */
export function EonetTimeline({ min, max, value, onChange }: Props) {
  const { t } = useTranslation();
  const disabled = min === null || max === null || min === max;
  const label = min !== null && max !== null ? new Date(value).toLocaleDateString() : '—';

  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px',
        }}
      >
        <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>
          {t('situation.eonet.timelineLabel')}
        </span>
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{label}</span>
      </div>
      <input
        type="range"
        min={min ?? 0}
        max={max ?? 0}
        step={86400000}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#3b82f6', cursor: disabled ? 'default' : 'pointer' }}
      />
      {min !== null && max !== null && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#64748b',
            fontSize: '11px',
            marginTop: '4px',
          }}
        >
          <span>{new Date(min).toLocaleDateString()}</span>
          <span>{new Date(max).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
