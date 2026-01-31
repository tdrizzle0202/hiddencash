import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClaimResult {
  id: string;
  state_code: string;
  owner_name: string;
  owner_city: string | null;
  property_type: string;
  holder_name: string;
  amount: number | null;
  amount_text: string | null;
  claim_url: string | null;
  status: string;
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription status
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("is_subscribed")
      .eq("user_id", user.id)
      .single();

    const isSubscribed = subscription?.is_subscribed ?? false;

    // Get user's claims with full claim details
    // For subscribers with drip system, only show revealed claims
    let claimsQuery = supabaseClient
      .from("user_claims")
      .select(`
        id,
        status,
        revealed,
        created_at,
        claim:claims (
          id,
          state_code,
          owner_name,
          owner_city,
          property_type,
          holder_name,
          amount,
          amount_text,
          claim_url
        )
      `)
      .eq("user_id", user.id);

    // Subscribers only see revealed claims (drip system)
    // Free users see all claims (revealed defaults to true for them)
    if (isSubscribed) {
      claimsQuery = claimsQuery.eq("revealed", true);
    }

    const { data: userClaims, error: claimsError } = await claimsQuery
      .order("created_at", { ascending: false });

    if (claimsError) {
      console.error("Claims fetch error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch claims" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get pending job counts
    const { data: searchProfiles } = await supabaseClient
      .from("search_profiles")
      .select("id")
      .eq("user_id", user.id);

    const profileIds = searchProfiles?.map((p) => p.id) || [];

    let pendingJobs = 0;
    let completedJobs = 0;

    if (profileIds.length > 0) {
      const { data: jobs } = await supabaseClient
        .from("search_jobs")
        .select("status")
        .in("search_profile_id", profileIds);

      if (jobs) {
        pendingJobs = jobs.filter(
          (j) => j.status === "pending" || j.status === "processing"
        ).length;
        completedJobs = jobs.filter((j) => j.status === "completed").length;
      }
    }

    // Format results, hiding sensitive data for non-subscribers
    const results: ClaimResult[] = (userClaims || []).map((uc: any) => {
      const claim = uc.claim;

      // Non-subscribers see blurred/limited data
      if (!isSubscribed) {
        return {
          id: uc.id,
          state_code: claim.state_code,
          owner_name: maskName(claim.owner_name),
          owner_city: claim.owner_city ? maskCity(claim.owner_city) : null,
          property_type: claim.property_type,
          holder_name: maskName(claim.holder_name),
          amount: null, // Hide exact amount
          amount_text: claim.amount ? "Upgrade to see amount" : null,
          claim_url: null, // Hide claim URL
          status: uc.status,
          created_at: uc.created_at,
          is_locked: true,
        };
      }

      // Subscribers see full data
      return {
        id: uc.id,
        state_code: claim.state_code,
        owner_name: claim.owner_name,
        owner_city: claim.owner_city,
        property_type: claim.property_type,
        holder_name: claim.holder_name,
        amount: claim.amount,
        amount_text: claim.amount_text,
        claim_url: claim.claim_url,
        status: uc.status,
        created_at: uc.created_at,
        is_locked: false,
      };
    });

    // Calculate total amount (for subscribers)
    const totalAmount = isSubscribed
      ? results.reduce((sum, r) => sum + (r.amount || 0), 0)
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        is_subscribed: isSubscribed,
        claims: results,
        total_claims: results.length,
        total_amount: totalAmount,
        search_status: {
          pending: pendingJobs,
          completed: completedJobs,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper functions to mask data for free users
function maskName(name: string): string {
  if (!name || name.length < 3) return "***";
  return name.charAt(0) + "*".repeat(name.length - 2) + name.charAt(name.length - 1);
}

function maskCity(city: string): string {
  if (!city || city.length < 3) return "***";
  return city.charAt(0) + "*".repeat(Math.min(city.length - 2, 5)) + "...";
}
