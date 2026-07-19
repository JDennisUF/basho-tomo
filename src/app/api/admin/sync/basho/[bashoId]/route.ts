import { badRequest, jsonResponse, requireSyncSecret, serverError, unauthorized } from "@/lib/server/api";
import { getCachedBasho } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    bashoId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  if (!requireSyncSecret(request)) {
    return unauthorized();
  }

  try {
    const { bashoId } = await context.params;
    if (!/^\d{6}$/.test(bashoId)) {
      return badRequest("Invalid basho id");
    }

    const result = await getCachedBasho(bashoId, { forceRefresh: true });
    return jsonResponse({ ok: true, bashoId, data: result.data }, result.source);
  } catch (error) {
    return serverError(error);
  }
}
