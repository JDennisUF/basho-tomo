import { badRequest, jsonResponse, requireSyncSecret, serverError, unauthorized } from "@/lib/server/api";
import { getCachedTorikumi, parseDivision } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    bashoId: string;
    division: string;
    day: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  if (!requireSyncSecret(request)) {
    return unauthorized();
  }

  try {
    const { bashoId, division: rawDivision, day: rawDay } = await context.params;
    const division = parseDivision(rawDivision);
    const day = Number(rawDay);

    if (!/^\d{6}$/.test(bashoId)) {
      return badRequest("Invalid basho id");
    }

    if (!division) {
      return badRequest("Invalid division");
    }

    if (!Number.isInteger(day) || day < 1 || day > 15) {
      return badRequest("Invalid day");
    }

    const result = await getCachedTorikumi(bashoId, division, day, { forceRefresh: true });

    return jsonResponse(
      {
        ok: true,
        bashoId,
        division,
        day,
        matches: result.data.matches.length,
      },
      result.source,
    );
  } catch (error) {
    return serverError(error);
  }
}
