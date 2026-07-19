import { badRequest, jsonResponse, serverError } from "@/lib/server/api";
import { getCachedHeadToHead } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    rikishiId: string;
    opponentId: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { rikishiId: rawRikishiId, opponentId: rawOpponentId } = await context.params;
    const rikishiId = Number(rawRikishiId);
    const opponentId = Number(rawOpponentId);

    if (!Number.isInteger(rikishiId) || rikishiId <= 0) {
      return badRequest("Invalid rikishi id");
    }

    if (!Number.isInteger(opponentId) || opponentId <= 0 || opponentId === rikishiId) {
      return badRequest("Invalid opponent id");
    }

    const result = await getCachedHeadToHead(rikishiId, opponentId);
    return jsonResponse(result.data, result.source);
  } catch (error) {
    return serverError(error);
  }
}
