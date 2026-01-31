import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RegisterTokenRequest {
  token: string;
  device_id?: string;
  platform?: "ios" | "android" | "web";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RegisterTokenRequest = await req.json();
    const { token, device_id, platform } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing push token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (
      !token.startsWith("ExponentPushToken[") &&
      !token.startsWith("ExpoPushToken[")
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid push token format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");

    // Create a Supabase client WITHOUT assuming auth exists
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let userId: string | null = null;

    // If auth header exists, try to resolve user
    if (authHeader) {
      const authedClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data } = await authedClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const resolvedDeviceId = device_id ?? crypto.randomUUID();

    const { data, error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          token,
          device_id: resolvedDeviceId,
          user_id: userId,
          platform: platform ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "device_id,token",
        }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Push token upsert failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to register push token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token_id: data.id,
        linked_to_user: !!userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});