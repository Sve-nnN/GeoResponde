import { useTranslation } from 'react-i18next';
import { EONET_CATEGORIES, CATEGORY_COLORS } from '../../lib/eonet';

interface Props {
  activeCategories: Set<string>;
}

/** Maps each active category color to its label. */
export function EonetLegend({ activeCategories }: Props) {
  const { t } = useTranslation();
  const items = EONET_CATEGORIES.filter((id) => activeCategories.has(id));
  if (items.length === 0) return null;

  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '12px 14px',
      }}
    >
      <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
        {t('situation.eonet.legendHeading')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((id) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: CATEGORY_COLORS[id],
                border: '1px solid #fff',
              }}
            />
            <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
              {t(`situation.eonet.categories.${id}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
