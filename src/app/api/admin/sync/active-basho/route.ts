import { jsonResponse, requireSyncSecret, serverError, unauthorized } from "@/lib/server/api";
import {
  DIVISIONS,
  getCachedBanzuke,
  getCachedBasho,
  getCachedTorikumi,
} from "@/lib/server/sumo-cache";
import { getBashoDayFromStartDate, getCurrentBashoId } from "@/lib/sumo-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requireSyncSecret(request)) {
    return unauthorized();
  }

  try {
    const bashoId = getCurrentBashoId();
    const basho = await getCachedBasho(bashoId, { forceRefresh: true });
    const day = getBashoDayFromStartDate(basho.data.startDate);

    const banzuke = await Promise.all(
      DIVISIONS.map(async (division) => {
        const result = await getCachedBanzuke(bashoId, division, { forceRefresh: true });
        return {
          division,
          records: result.data.records.length,
          source: result.source,
        };
      }),
    );

    const torikumi = await Promise.all(
      DIVISIONS.map(async (division) => {
        const result = await getCachedTorikumi(bashoId, division, day, { forceRefresh: true });
        return {
          division,
          day,
          matches: result.data.matches.length,
          source: result.source,
        };
      }),
    );

    return jsonResponse({
      ok: true,
      bashoId,
      day,
      basho: basho.data,
      banzuke,
      torikumi,
    });
  } catch (error) {
    return serverError(error);
  }
}
