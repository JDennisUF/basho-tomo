import { badRequest, jsonResponse, serverError } from "@/lib/server/api";
import { getCachedBanzuke, parseDivision } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    bashoId: string;
    division: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { bashoId, division: rawDivision } = await context.params;
    const division = parseDivision(rawDivision);

    if (!/^\d{6}$/.test(bashoId)) {
      return badRequest("Invalid basho id");
    }

    if (!division) {
      return badRequest("Invalid division");
    }

    const result = await getCachedBanzuke(bashoId, division);
    return jsonResponse(result.data, result.source);
  } catch (error) {
    return serverError(error);
  }
}
