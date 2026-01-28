import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateSearchRequest {
  first_name: string;
  last_name: string;
  states: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user
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

    // Parse request body
    const body: CreateSearchRequest = await req.json();
    const { first_name, last_name, states } = body;

    // Validate input
    if (!first_name || !last_name || !states || states.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate state codes
    const validStateCodes = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    ];

    const invalidStates = states.filter(
      (s: string) => !validStateCodes.includes(s.toUpperCase())
    );
    if (invalidStates.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid state codes: ${invalidStates.join(", ")}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check subscription status (optional - free users get limited searches)
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("is_subscribed")
      .eq("user_id", user.id)
      .single();

    const isSubscribed = subscription?.is_subscribed ?? false;

    // Free users: limit to 3 states per search
    if (!isSubscribed && states.length > 3) {
      return new Response(
        JSON.stringify({
          error: "Free users can search up to 3 states. Upgrade to search all 50!",
          requires_subscription: true,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create or get existing search profile
    const normalizedFirstName = first_name.trim().toLowerCase();
    const normalizedLastName = last_name.trim().toLowerCase();

    let profileId: string;

    // Check for existing profile
    const { data: existingProfile } = await supabaseClient
      .from("search_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("first_name_normalized", normalizedFirstName)
      .eq("last_name_normalized", normalizedLastName)
      .single();

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      // Create new profile
      const { data: newProfile, error: profileError } = await supabaseClient
        .from("search_profiles")
        .insert({
          user_id: user.id,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        })
        .select("id")
        .single();

      if (profileError || !newProfile) {
        console.error("Profile creation error:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to create search profile" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      profileId = newProfile.id;
    }

    // Create search jobs for each state
    const jobsToCreate = states.map((state: string) => ({
      search_profile_id: profileId,
      state_code: state.toUpperCase(),
      status: "pending",
      priority: isSubscribed ? 1 : 0, // Subscribers get higher priority
    }));

    const { data: jobs, error: jobsError } = await supabaseClient
      .from("search_jobs")
      .insert(jobsToCreate)
      .select("id, state_code");

    if (jobsError) {
      console.error("Jobs creation error:", jobsError);
      return new Response(
        JSON.stringify({ error: "Failed to create search jobs" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile_id: profileId,
        jobs: jobs,
        message: `Search started for ${first_name} ${last_name} in ${states.length} state(s)`,
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
