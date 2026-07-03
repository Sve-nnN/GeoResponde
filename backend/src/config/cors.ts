/**
 * Resolve the CORS `origin` option for the Provider Gateway.
 *
 * Local development stays friction-free: when `CORS_ALLOWED_ORIGINS` is not set
 * the gateway reflects any request origin (equivalent to the previous
 * `origin: true`), so a contributor running the frontend on any localhost port
 * never hits a CORS wall. In a deployed environment you set
 * `CORS_ALLOWED_ORIGINS` to a comma-separated allowlist and the gateway
 * restricts responses to those origins.
 *
 * Examples:
 *   CORS_ALLOWED_ORIGINS unset            -> true (reflect any origin, dev default)
 *   CORS_ALLOWED_ORIGINS="https://a.app"  -> ["https://a.app"]
 *   CORS_ALLOWED_ORIGINS="https://a.app, https://b.app" -> ["https://a.app", "https://b.app"]
 */
export function resolveCorsOrigin(
  env: NodeJS.ProcessEnv = process.env,
): true | string[] {
  const raw = env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) return true;

  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // A value that is only commas/whitespace carries no real origin; fall back to
  // the permissive dev default rather than silently blocking every request.
  return origins.length > 0 ? origins : true;
}
