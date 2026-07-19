import { badRequest, jsonResponse, serverError } from "@/lib/server/api";
import { getCachedRikishi } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    rikishiId: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { rikishiId: rawRikishiId } = await context.params;
    const rikishiId = Number(rawRikishiId);

    if (!Number.isInteger(rikishiId) || rikishiId <= 0) {
      return badRequest("Invalid rikishi id");
    }

    const result = await getCachedRikishi(rikishiId);
    return jsonResponse(result.data, result.source);
  } catch (error) {
    return serverError(error);
  }
}
