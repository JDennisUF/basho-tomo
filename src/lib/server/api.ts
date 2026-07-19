export function jsonResponse<T>(payload: T, source?: string) {
  return Response.json(payload, {
    headers: source ? { "X-Basho-Tomo-Data-Source": source } : undefined,
  });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(message: string) {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(error: unknown) {
  return Response.json(
    { error: error instanceof Error ? error.message : "Unexpected server error" },
    { status: 500 },
  );
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function requireSyncSecret(request: Request) {
  const syncSecret = process.env.SUMO_SYNC_SECRET;
  const headerSecret = request.headers.get("x-sumo-sync-secret");
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  return Boolean(syncSecret && (headerSecret === syncSecret || bearerSecret === syncSecret));
}
