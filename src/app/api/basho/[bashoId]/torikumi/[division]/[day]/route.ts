import { badRequest, jsonResponse, serverError } from "@/lib/server/api";
import { getCachedTorikumi, parseDivision } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    bashoId: string;
    division: string;
    day: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
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

    const result = await getCachedTorikumi(bashoId, division, day);
    return jsonResponse(result.data, result.source);
  } catch (error) {
    return serverError(error);
  }
}
