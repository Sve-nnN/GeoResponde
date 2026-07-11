# Negentropy Technologies Scientific Provider

Federates three datasets from the Negentropy Technologies API
(`https://api.negentropytechnologies.com/v1/terremoto/api-docs`) as GeoJSON
layers via `GET /api/negentropy/:dataset?bbox=minx,miny,maxx,maxy`.

## Scope

Negentropy exposes ~20 endpoints. Only three are federated here, chosen by
comparing each candidate against what GeoResponde already provides natively
(2026-07-11):

| Dataset | Why it's included |
|---|---|
| `hospitales` | Venezuela Reporta's `sitios?tipo=hospital` had 0-2 crowd-sourced entries nationally at the time of evaluation; Negentropy serves 100+ from an official facility registry. |
| `planteles` | No existing GeoResponde layer covers schools at all. |
| `edificaciones` | Human-verified, named buildings with a damage level, verification status, and free-text notes — no existing point-level equivalent (richer than the polygon probability layers below). |

## Explicitly excluded

| Dataset | Reason |
|---|---|
| `edificaciones_nasa` | Re-serves the same NASA ARIA DPM product already consumed directly from the authoritative ArcGIS FeatureServer (`backend/src/adapters/damage/nasa.ts`) — same fields (`overture_id`, `probabilidad_dano`, `danado`). |
| `movimiento_suelo` | Matches Copernicus EMS ground-movement's own methodology ("Automatic extraction", displacement value classes) — already consumed directly (`backend/src/adapters/damage/service.ts`). |
| `edificaciones_microsoft` | A different footprint source (Microsoft Building Footprints) and methodology (buffer-distance damage probability) than NASA's — not a strict duplicate, but deferred to avoid a third overlapping "probability of damage" layer on one map. |
| Before/after satellite imagery | Marked optional/future in issue #83. |

## Route

`GET /api/negentropy/:dataset` where `:dataset` is one of `hospitales`,
`planteles`, `edificaciones`. An unknown dataset yields an empty
FeatureCollection rather than forwarding an arbitrary path upstream.
Optional `?bbox=minx,miny,maxx,maxy` (EPSG:4326) is forwarded to Negentropy;
an invalid bbox is dropped rather than sent upstream.

Degrade-safe: never a 5xx. `X-Negentropy-Source` reports `live` / `cache` /
`empty`. `X-Attribution: Negentropy Technologies` is required on every
response.

## Adding a fourth dataset later

If a future need justifies adding another Negentropy dataset, extend
`NEGENTROPY_DATASETS` in `backend/src/adapters/negentropy/service.ts` — the
route and cache already generalize over the dataset name. Re-check for
overlap with existing native adapters first (see the exclusions table
above) before adding.
