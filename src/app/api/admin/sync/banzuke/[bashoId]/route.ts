import { badRequest, jsonResponse, requireSyncSecret, serverError, unauthorized } from "@/lib/server/api";
import { DIVISIONS, getCachedBanzuke } from "@/lib/server/sumo-cache";

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

    const results = await Promise.all(
      DIVISIONS.map(async (division) => {
        const result = await getCachedBanzuke(bashoId, division, { forceRefresh: true });
        return {
          division,
          records: result.data.records.length,
          source: result.source,
        };
      }),
    );

    return jsonResponse({ ok: true, bashoId, results });
  } catch (error) {
    return serverError(error);
  }
}
