# Submission Router — Provider Coverage Matrix

This document maps which providers can receive report submissions, which report
topics they accept, and how live sends are gated. It is derived directly from the
active adapter implementations under `backend/src/adapters/*` and the provider
catalog at `public/catalog/providers.json`. Keep it in sync when adapters change.

## How the router gates submissions

The Submission Router (`ProviderGateway.submit`) fans a single canonical `Report`
out to every adapter that is **both**:

1. **Submission-capable** — `isSubmissionCapable(adapter)` is true, which requires
   the provider to advertise the `submission` capability **and** declare a
   non-empty `submissionTopics` array (see `backend/src/adapters/BaseAdapter.ts`).
2. **Topic-matched** — the adapter's `submissionTopics` includes the report's
   `topic`.

An adapter that advertises `submission` in the catalog but declares no
`submissionTopics` is **not** a routable submission target. If a `ReportTopic`
existed with no submission-capable, topic-matched provider, that report type would
be **unroutable** — the form would collect data with nowhere to send it. The
regression test in `backend/src/gateway/__tests__/topicCoverage.test.ts` guards
against exactly this by asserting every `REPORT_TOPICS` entry has at least one
registered provider that accepts it.

Live sends are off by default. Every API adapter defaults to **dry-run** and only
performs a real HTTP send when `GEORESPONDE_SUBMIT_LIVE=1` is set **and** the
provider's own credentials/endpoint env vars are present. Absent those, an
explicit `?dryRun=0` degrades to `skipped` with a PII-safe preview — nothing is
sent.

## Per-provider matrix

| Provider | id | Adapter | Search? | Submission? | Mode | Submission topics | Live-readiness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Venezuela Reporta | `prov-venezuelareporta` | `VenezuelaReportaAdapter` | Yes | Yes | `api` | missing-person | Dry-run default. Live requires `GEORESPONDE_SUBMIT_LIVE=1` **and** `VENEZUELAREPORTA_API_KEY` (sent as `x-api-key`). |
| Desaparecidos Terremoto VE | `prov-desaparecidos-terremoto` | `DesaparecidosTerremotoAdapter` | Yes | Yes | `deep_link` | missing-person | No server-side send. Router returns a prefilled deep link to the provider's own domain; the user submits there. No env vars unlock an API path. |
| Ushahidi | `prov-ushahidi` | `UshahidiAdapter` | No | Yes | `api` | missing-person, resource-need, shelter-status | Dry-run default. Live requires `GEORESPONDE_SUBMIT_LIVE=1` **and** `USHAHIDI_DEPLOYMENT_URL` **and** `USHAHIDI_TOKEN` (plus `USHAHIDI_FORM_ID` for the target form). |
| Terremoto Venezuela | `prov-terremotovenezuela` | `TerremotoVenezuelaAdapter` | Yes | Yes | `api` | building-damage | Dry-run default. Live requires `GEORESPONDE_SUBMIT_LIVE=1`; posts to the fixed endpoint `https://api.terremotovenezuela.com/api/v1/reportes`. |

### Advertised-but-not-routable

The following providers list `submission` among their catalog capabilities but do
**not** declare `submissionTopics`, so `isSubmissionCapable` returns false and the
router never selects them as submission targets. They are search/directory
providers today:

| Provider | id | Capabilities | Why not routable |
| --- | --- | --- | --- |
| Venezuela Te Busca | `prov-venezuelatebusca` | search, person_lookup, submission | No `submissionTopics` declared on `VenezuelaTeBuscaAdapter`. |
| Refugios Venezuela | `prov-refugiosvenezuela` | search, directory, submission | Backed by `MockHumanitarianAdapter`; no production `submissionTopics`. |

## Per-topic view

Every `ReportTopic` in `REPORT_TOPICS` routes to at least one submission-capable
provider:

| Report topic | Accepting providers |
| --- | --- |
| `missing-person` | Venezuela Reporta (`api`), Desaparecidos Terremoto VE (`deep_link`), Ushahidi (`api`) |
| `resource-need` | Ushahidi (`api`) |
| `shelter-status` | Ushahidi (`api`) |
| `building-damage` | Terremoto Venezuela (`api`) |

`resource-need` and `shelter-status` currently route solely through Ushahidi. That
is sufficient for routability, but it is a single point of coverage — adding a
second accepting provider for those topics would improve resilience.
