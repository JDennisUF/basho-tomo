import { jsonResponse, serverError } from "@/lib/server/api";
import { getCachedRikishisIndex } from "@/lib/server/sumo-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getCachedRikishisIndex();
    return jsonResponse(result.data, result.source);
  } catch (error) {
    return serverError(error);
  }
}
