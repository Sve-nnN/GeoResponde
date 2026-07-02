import { useTranslation } from 'react-i18next';
import { buildSparkline, type HealthSample } from '../../lib/health';

interface Props {
  samples: HealthSample[];
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 28;
const PADDING = 3;

/**
 * Hand-written SVG response-time sparkline (HEALTH-10). Renders a single
 * `<polyline>` from `buildSparkline`'s up-sample latency points, plus a red
 * baseline `<circle>` marker for every DOWN (null-latency) sample — the
 * null-latency-as-gap-and-marker contract is defined and tested in
 * `lib/health.ts`, this component never re-derives it. No charting library.
 */
export function Sparkline({ samples, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }: Props) {
  const { t } = useTranslation();

  if (samples.length === 0) {
    return (
      <span style={{ color: '#64748b', fontSize: '12px' }}>
        {t('dev.providerStatus.sparkline.empty')}
      </span>
    );
  }

  const { points, markers } = buildSparkline(samples, { width, height, padding: PADDING });

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={t('dev.providerStatus.sparkline.aria')}
    >
      {points && (
        <polyline points={points} fill="none" stroke="#3498db" strokeWidth={1.5} />
      )}
      {markers.map((m, i) => (
        <circle key={i} cx={m.x} cy={m.y} r={1.5} fill="#dc2626" />
      ))}
    </svg>
  );
}
