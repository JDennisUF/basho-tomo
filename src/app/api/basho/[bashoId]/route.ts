import { getCachedBasho } from "@/lib/server/sumo-cache";
import { badRequest, jsonResponse, serverError } from "@/lib/server/api";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    bashoId: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { bashoId } = await context.params;
    if (!/^\d{6}$/.test(bashoId)) {
      return badRequest("Invalid basho id");
    }

    const result = await getCachedBasho(bashoId);
    return jsonResponse(result.data, result.source);
  } catch (error) {
    return serverError(error);
  }
}
