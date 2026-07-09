import { useEffect, useState } from 'react';
import { validateReport, type Report as ReportModel, type ReportTopic, type SubmissionResult } from '@georesponde/shared';
import { useTranslation } from 'react-i18next';
import { TopicSelector } from '../components/report/TopicSelector';
import { ReportFields } from '../components/report/ReportFields';
import { ConsentGate } from '../components/report/ConsentGate';
import { ResultPreview } from '../components/report/ResultPreview';
import { submitReport } from '../lib/report';
import { API_BASE } from '../lib/api';
import {
  providersForTopic,
  isTopicDeliverable,
  type CapabilitiesByTopic,
} from '../lib/reportCapabilities';

export function Report() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState<ReportTopic | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilitiesByTopic | null>(null);

  useEffect(() => {
    // Non-blocking: if this fails, capabilities stays null and the form still
    // works (the availability hint just does not render). Never surfaces an error.
    fetch(`${API_BASE}/api/report/capabilities`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCapabilities(data))
      .catch(() => setCapabilities(null));
  }, []);

  const validation = topic ? validateReport(topic, fields) : { ok: false, errors: {} };
  const topicProviders = providersForTopic(capabilities, topic);
  // Only gate on availability once we actually know it. While capabilities are
  // still loading (null), do not block the user.
  const deliverable = capabilities === null || isTopicDeliverable(capabilities, topic);

  const handleTopicChange = (next: ReportTopic) => {
    setTopic(next);
    setFields({});
    setTouched(new Set());
    setResult(null);
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFields((prev) => {
      const next = { ...prev };
      if (value === undefined || value === '') {
        delete next[name];
      } else {
        next[name] = value;
      }
      return next;
    });
  };

  const canSubmit =
    topic !== null && acknowledgedAt !== null && validation.ok && deliverable && !submitting;

  const handleSubmit = async () => {
    if (topic === null || acknowledgedAt === null || !validation.ok) return;
    setSubmitting(true);
    setResult(null);

    const contact = fields.reporterContact;
    const report: ReportModel = {
      id: crypto.randomUUID(),
      topic,
      createdAt: new Date().toISOString(),
      fields,
      consent: { targets: [], acknowledgedAt },
      reporter: typeof contact === 'string' && contact ? { contact } : undefined,
    };

    try {
      const submissionResult = await submitReport(report);
      setResult(submissionResult);
    } catch {
      // Do not log the report body (sensitive PII). Surface a generic error.
      setResult({
        provider: 'dry-run',
        mode: 'dry-run',
        status: 'error',
        error: t('report.result.networkError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: '40px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        flex: 1,
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#f8fafc' }}>
          {t('report.title')}
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0 }}>{t('report.subtitle')}</p>
      </header>

      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: '#94a3b8',
            margin: '0 0 20px 0',
            paddingBottom: '16px',
            borderBottom: '1px solid #334155',
          }}
        >
          {t('report.underDevelopment')}
        </p>

        <TopicSelector value={topic} onChange={handleTopicChange} />

        {topic && (
          <>
            {capabilities !== null &&
              (topicProviders.length > 0 ? (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    margin: '16px 0',
                  }}
                >
                  {t('report.availability.deliveredTo')}{' '}
                  {topicProviders.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 ? ', ' : ''}
                      <strong style={{ color: '#cbd5e1' }}>{p.name}</strong>
                      {' ('}
                      {p.mode === 'deep_link'
                        ? t('report.availability.modeDeepLink')
                        : t('report.availability.modeApi')}
                      {')'}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#fca5a5',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    margin: '16px 0',
                  }}
                >
                  {t('report.availability.none')}
                </div>
              ))}
            <ReportFields
              topic={topic}
              values={fields}
              onChange={handleFieldChange}
              errors={validation.errors}
              touched={touched}
              onBlur={handleBlur}
            />
            <ConsentGate acknowledgedAt={acknowledgedAt} onChange={setAcknowledgedAt} />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: canSubmit ? '#2563eb' : '#334155',
                color: canSubmit ? '#f8fafc' : '#64748b',
                fontSize: '16px',
                fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? t('report.submitting') : t('report.submit')}
            </button>
            {!validation.ok && (
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
                {t('report.errors.formIncomplete')}
              </p>
            )}
          </>
        )}

        {result && <ResultPreview result={result} />}
      </div>
    </div>
  );
}
