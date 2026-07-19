import { getSupabaseServiceClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasSyncSecret = Boolean(process.env.SUMO_SYNC_SECRET);
  const serviceClient = getSupabaseServiceClient();

  return Response.json({
    hasUrl,
    hasServiceRoleKey,
    hasSyncSecret,
    serviceClientConfigured: Boolean(serviceClient),
  });
}
