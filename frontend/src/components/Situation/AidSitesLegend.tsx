import { useTranslation } from 'react-i18next';
import { AID_SITE_TIPOS, TIPO_COLORS } from '../../lib/sitios';

interface Props {
  activeTipos: Set<string>;
}

/** Legend for the aid-sites layer: one colored dot + label per active type. */
export function AidSitesLegend({ activeTipos }: Props) {
  const { t } = useTranslation();
  const items = AID_SITE_TIPOS.filter((id) => activeTipos.has(id));
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
        {t('situation.sitios.legendHeading')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((id) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: TIPO_COLORS[id],
                border: '1px solid #fff',
              }}
            />
            <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
              {t(`situation.sitios.tipos.${id}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
