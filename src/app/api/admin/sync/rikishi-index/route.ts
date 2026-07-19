import { jsonResponse, requireSyncSecret, serverError, unauthorized } from "@/lib/server/api";
import { getCachedRikishisIndex } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requireSyncSecret(request)) {
    return unauthorized();
  }

  try {
    const result = await getCachedRikishisIndex({ forceRefresh: true });
    return jsonResponse({ ok: true, count: result.data.length }, result.source);
  } catch (error) {
    return serverError(error);
  }
}
