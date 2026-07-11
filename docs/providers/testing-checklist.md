# Provider Testing Checklist

Self-check this before opening a provider PR. It's the same bar reviewers will
hold the PR to, so working through it first saves a review round-trip.

- [ ] **Search works** — spot-checked live through `GET /api/dev/inspect/:id`
  with a real query; the adapter returns results, not just an empty array or a
  silent failure.
- [ ] **Parser tested** — `parser.ts` has Vitest coverage exercising the real
  response shape, not just the happy path.
- [ ] **Fixtures added** — raw response payloads saved under the provider's
  `fixtures/` directory, and they contain **no real personal data**: names,
  cédulas, phone numbers, and addresses in fixtures must be synthetic or
  redacted.
- [ ] **Links validated** — the provider's `website` field in
  `public/catalog/providers.json` resolves, and any per-result links the
  adapter constructs point where they claim to.
- [ ] **Attribution given** — the provider's `display_name` and `website` are
  correct and complete, so results are traceable back to the source (see
  CONTRIBUTING.md's philosophy on data ownership).
- [ ] **License compatible** — the source's terms of use permit federating its
  data this way; note anything relevant in the PR description if it's not
  obvious from a public API.
- [ ] **Health endpoint wired** — the new provider shows up correctly on
  `/dev/providers` (the health dashboard), not stuck in "warming up" or
  erroring on first probe.
- [ ] **CI passes** — `pnpm run build`, `pnpm run typecheck`, `pnpm run lint`,
  and `pnpm run test` all pass locally before you push.

See the [Provider Integration Template](./provider-integration-template.md)
for the step-by-step build process this checklist verifies against.
