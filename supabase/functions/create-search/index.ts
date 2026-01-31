import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ZENROWS_API_KEY = Deno.env.get("ZENROWS_API_KEY") ?? "";

interface CreateSearchRequest {
  first_name: string;
  last_name: string;
  states: string[];
}

// State URLs for scraping
const STATES: Record<string, { url: string; name: string }> = {
  AL: { url: "https://missingmoney.al.gov/app/claim-search", name: "Alabama" },
  AK: { url: "https://unclaimedproperty.alaska.gov/app/claim-search", name: "Alaska" },
  AZ: { url: "https://azdor.gov/unclaimed-property/search-unclaimed-property", name: "Arizona" },
  AR: { url: "https://www.claimitarkansas.org/app/claim-search", name: "Arkansas" },
  CA: { url: "https://claimit.ca.gov/app/claim-search", name: "California" },
  CO: { url: "https://colorado.findyourunclaimedproperty.com/app/claim-search", name: "Colorado" },
  CT: { url: "https://ctbiglist.com/app/claim-search", name: "Connecticut" },
  DE: { url: "https://unclaimedproperty.delaware.gov/app/claim-search", name: "Delaware" },
  DC: { url: "https://cfo.dc.gov/unclaimed-property/app/claim-search", name: "Washington DC" },
  FL: { url: "https://www.fltreasurehunt.gov/app/claim-search", name: "Florida" },
  GA: { url: "https://georgia.findyourunclaimedproperty.com/app/claim-search", name: "Georgia" },
  HI: { url: "https://hawaii.findyourunclaimedproperty.com/app/claim-search", name: "Hawaii" },
  ID: { url: "https://yourmoney.idaho.gov/app/claim-search", name: "Idaho" },
  IL: { url: "https://icash.illinoistreasurer.gov/app/claim-search", name: "Illinois" },
  IN: { url: "https://indianaunclaimed.gov/app/claim-search", name: "Indiana" },
  IA: { url: "https://greatiowatreasruehunt.gov/app/claim-search", name: "Iowa" },
  KS: { url: "https://missingmoney.ks.gov/app/claim-search", name: "Kansas" },
  KY: { url: "https://missingmoney.ky.gov/app/claim-search", name: "Kentucky" },
  LA: { url: "https://www.latreasury.com/app/claim-search", name: "Louisiana" },
  ME: { url: "https://maine.findyourunclaimedproperty.com/app/claim-search", name: "Maine" },
  MD: { url: "https://maryland.findyourunclaimedproperty.com/app/claim-search", name: "Maryland" },
  MA: { url: "https://findmassmoney.com/app/claim-search", name: "Massachusetts" },
  MI: { url: "https://unclaimedproperty.michigan.gov/app/claim-search", name: "Michigan" },
  MN: { url: "https://mn.findyourunclaimedproperty.com/app/claim-search", name: "Minnesota" },
  MS: { url: "https://treasury.ms.gov/unclaimed-property/app/claim-search", name: "Mississippi" },
  MO: { url: "https://treasurer.mo.gov/unclaimedproperty/app/claim-search", name: "Missouri" },
  MT: { url: "https://mtrevenue.gov/unclaimed-property/app/claim-search", name: "Montana" },
  NE: { url: "https://treasurer.nebraska.gov/up/app/claim-search", name: "Nebraska" },
  NV: { url: "https://nevadatreasurer.gov/unclaimed-property/app/claim-search", name: "Nevada" },
  NH: { url: "https://www.nh.gov/treasury/unclaimed-property/app/claim-search", name: "New Hampshire" },
  NJ: { url: "https://www.njtreasure.gov/app/claim-search", name: "New Jersey" },
  NM: { url: "https://nmpossibility.com/app/claim-search", name: "New Mexico" },
  NY: { url: "https://ouf.osc.ny.gov/app/claim-search", name: "New York" },
  NC: { url: "https://www.nccash.com/app/claim-search", name: "North Carolina" },
  ND: { url: "https://ndunclaimed.findyourunclaimedproperty.com/app/claim-search", name: "North Dakota" },
  OH: { url: "https://com.ohio.gov/unclaimedproperty/app/claim-search", name: "Ohio" },
  OK: { url: "https://oklahoma.findyourunclaimedproperty.com/app/claim-search", name: "Oklahoma" },
  OR: { url: "https://oregon.findyourunclaimedproperty.com/app/claim-search", name: "Oregon" },
  PA: { url: "https://unclaimedproperty.patreasury.gov/en/Property/SearchIndex", name: "Pennsylvania" },
  RI: { url: "https://findrimoney.com/app/claim-search", name: "Rhode Island" },
  SC: { url: "https://southcarolina.findyourunclaimedproperty.com/app/claim-search", name: "South Carolina" },
  SD: { url: "https://sdtreasurer.gov/unclaimed-property/app/claim-search", name: "South Dakota" },
  TN: { url: "https://treasury.tn.gov/unclaimed-property/app/claim-search", name: "Tennessee" },
  TX: { url: "https://www.claimittexas.gov/app/claim-search", name: "Texas" },
  UT: { url: "https://mycash.utah.gov/app/claim-search", name: "Utah" },
  VT: { url: "https://vermont.findyourunclaimedproperty.com/app/claim-search", name: "Vermont" },
  VA: { url: "https://vamoneysearch.org/app/claim-search", name: "Virginia" },
  WA: { url: "https://ucp.dor.wa.gov/app/claim-search", name: "Washington" },
  WV: { url: "https://wvtreasury.com/unclaimed-property/app/claim-search", name: "West Virginia" },
  WI: { url: "https://statetreasury.wisconsin.gov/ucpm/app/claim-search", name: "Wisconsin" },
  WY: { url: "https://wyoming.findyourunclaimedproperty.com/app/claim-search", name: "Wyoming" },
  MM: { url: "https://www.missingmoney.com/app/claim-search", name: "MissingMoney" },
};

interface ClaimResult {
  owner_name: string;
  holder_name: string;
  owner_address: string;
  owner_city: string;
  owner_state: string;
  owner_zip: string;
  amount: number | null;
  amount_text: string;
  state_code: string;
  property_type: string;
}

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch from ZenRows with exponential backoff retry
async function fetchZenRows(
  stateCode: string,
  lastName: string,
  firstName: string,
  maxRetries = 3
): Promise<string> {
  const state = STATES[stateCode];
  if (!state) throw new Error(`Unknown state: ${stateCode}`);

  const cacheBuster = Date.now();
  const targetUrl = `${state.url}?_cb=${cacheBuster}`;

  const jsInstructions = [
    { wait: 8000 },
    { fill: ["input[name='lastName'], input[id*='lastName'], input[id*='last']", lastName] },
    { fill: ["input[name='firstName'], input[id*='firstName'], input[id*='first']", firstName || ""] },
    { wait: 2000 },
    { click: "button[type='submit'], input[type='submit']" },
    { wait: 10000 },
  ];

  const params = new URLSearchParams({
    url: targetUrl,
    apikey: ZENROWS_API_KEY,
    js_render: "true",
    antibot: "true",
    premium_proxy: "true",
    js_instructions: JSON.stringify(jsInstructions),
    wait: "10000",
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s...
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[ZenRows] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await sleep(delay);
      }

      const response = await fetch(`https://api.zenrows.com/v1/?${params}`, {
        method: "GET",
      });

      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`ZenRows error: ${response.status}`);
        console.log(`[ZenRows] Retryable error ${response.status} for ${stateCode}`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`ZenRows error: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error as Error;
      // Retry on network errors
      if (error instanceof TypeError || (error as any).code === "ECONNRESET") {
        console.log(`[ZenRows] Network error for ${stateCode}: ${error.message}`);
        continue;
      }
      // Don't retry on other errors
      throw error;
    }
  }

  throw lastError || new Error(`ZenRows failed after ${maxRetries} attempts`);
}

// Check if blocked by CAPTCHA
function isBlocked(html: string): boolean {
  if (!html.includes('turnstile-modal" class="d-none') && html.toLowerCase().includes("check the box")) {
    return true;
  }
  return false;
}

// Extract pagination info
function extractPagination(html: string, resultsPerPage = 20): { totalResults: number; totalPages: number } {
  // Pattern 1: "returned X unclaimed"
  let match = html.match(/returned\s+(\d+)\s+unclaimed/i);
  if (match) {
    const totalResults = parseInt(match[1]);
    return { totalResults, totalPages: Math.ceil(totalResults / resultsPerPage) };
  }

  // Pattern 2: "X results"
  match = html.match(/(\d+)\s+(?:total\s+)?(?:results?|records?|items?|properties?|claims?)\s*(?:found)?/i);
  if (match) {
    const totalResults = parseInt(match[1]);
    return { totalResults, totalPages: Math.ceil(totalResults / resultsPerPage) };
  }

  // Pattern 3: aria-label pagination
  const pageLinks = html.match(/aria-label=["']Page\s+(\d+)["']/g) || [];
  if (pageLinks.length > 0) {
    const pages = pageLinks.map(p => parseInt(p.match(/(\d+)/)![1]));
    const maxPage = Math.max(...pages);
    return { totalResults: maxPage * resultsPerPage, totalPages: maxPage };
  }

  return { totalResults: 0, totalPages: 1 };
}

// Parse claims from HTML
function parseClaims(html: string, stateCode: string): ClaimResult[] {
  const extractField = (header: string): string[] => {
    const pattern = new RegExp(
      `headers="${header}"[^>]*>.*?<span[^>]*class="[^"]*text-uppercase[^"]*"[^>]*>\\s*([^<]+?)\\s*</span>`,
      "gis"
    );
    const matches = [...html.matchAll(pattern)];
    return matches.map(m => m[1].trim());
  };

  const names = extractField("propownerName");
  const holders = extractField("propholderName");
  const addresses = extractField("propaddress");
  const cities = extractField("propcity");
  const states = extractField("propstate");
  const zips = extractField("propzip");

  // Get amounts
  const amountMatches = html.match(/(UNDER \$100|\$[\d,]+(?:\.\d{2})?)/g) || [];
  const amounts = amountMatches.slice(4); // Skip header amounts

  const claims: ClaimResult[] = [];
  for (let i = 0; i < names.length; i++) {
    const amountText = amounts[i] || "";
    let amount: number | null = null;
    if (amountText && !amountText.includes("UNDER")) {
      amount = parseFloat(amountText.replace(/[$,]/g, ""));
    }

    claims.push({
      owner_name: names[i] || "",
      holder_name: holders[i] || "",
      owner_address: addresses[i] || "",
      owner_city: cities[i] || "",
      owner_state: states[i] || stateCode,
      owner_zip: zips[i] || "",
      amount,
      amount_text: amountText,
      state_code: stateCode,
      property_type: "Unknown",
    });
  }

  return claims;
}

// Process a single state search
async function processStateSearch(
  supabaseAdmin: any,
  userId: string,
  profileId: string,
  firstName: string,
  lastName: string,
  stateCode: string,
  isSubscribed: boolean
): Promise<{ success: boolean; claimsCount: number; error?: string }> {
  try {
    // Check cache first
    const { data: cacheData } = await supabaseAdmin.rpc("check_cache", {
      p_first_name: firstName || "",
      p_last_name: lastName,
      p_state_code: stateCode,
    });

    if (cacheData?.[0]?.is_valid) {
      // Cache hit - get full cache info and link claims to user
      const cacheId = cacheData[0].cache_id;

      const { data: cacheInfo } = await supabaseAdmin
        .from("search_cache")
        .select("results_count")
        .eq("id", cacheId)
        .single();

      await supabaseAdmin.rpc("link_claims_to_user", {
        p_user_id: userId,
        p_search_profile_id: profileId,
        p_cache_id: cacheId,
        p_revealed: true,
      });

      return { success: true, claimsCount: cacheInfo?.results_count ?? 0 };
    }

    // Fetch from ZenRows
    console.log(`Fetching ${stateCode} for ${firstName} ${lastName}`);
    const html = await fetchZenRows(stateCode, lastName, firstName || "");

    // Check for blocking
    if (isBlocked(html)) {
      return { success: false, claimsCount: 0, error: "Blocked by CAPTCHA" };
    }

    // Parse results
    const claims = parseClaims(html, stateCode);
    const { totalResults, totalPages } = extractPagination(html);

    console.log(`Found ${claims.length} claims, ${totalResults} total, ${totalPages} pages`);

    // Create cache entry
    const isComplete = totalPages <= 1;
    const { data: cacheEntry } = await supabaseAdmin
      .from("search_cache")
      .insert({
        first_name_normalized: (firstName || "").toLowerCase().trim(),
        last_name_normalized: lastName.toLowerCase().trim(),
        state_code: stateCode,
        results_count: claims.length,
        search_profile_id: profileId,
        total_pages: totalPages > 1 ? totalPages : null,
        current_page: 1,
        is_complete: isComplete,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (cacheEntry && claims.length > 0) {
      // Save claims
      const claimData = claims.map(c => ({
        cache_id: cacheEntry.id,
        state_code: c.state_code,
        owner_name: c.owner_name,
        owner_address: c.owner_address,
        owner_city: c.owner_city,
        owner_state: c.owner_state,
        owner_zip: c.owner_zip,
        property_type: c.property_type,
        holder_name: c.holder_name,
        amount: c.amount,
        amount_text: c.amount_text,
        page_number: 1,
      }));

      await supabaseAdmin.from("claims").insert(claimData);

      // Link to user with all claims revealed
      await supabaseAdmin.rpc("link_claims_to_user", {
        p_user_id: userId,
        p_search_profile_id: profileId,
        p_cache_id: cacheEntry.id,
        p_revealed: true,
      });
    }

    return { success: true, claimsCount: claims.length };
  } catch (error) {
    console.error(`Error processing ${stateCode}:`, error);
    return { success: false, claimsCount: 0, error: error.message };
  }
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

    // Validate state codes (includes DC for Washington DC and MM for MissingMoney)
    const validStateCodes = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "MM",
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

    // Check if user has already completed their initial search
    // Users can only search once during onboarding
    const { data: existingClaims, error: claimsError } = await supabaseClient
      .from("user_claims")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existingClaims && existingClaims.length > 0) {
      return new Response(
        JSON.stringify({
          error: "You have already completed your initial search. Your claims are being processed.",
          already_searched: true,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // Create admin client for service role operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create or get existing search profile using upsert to handle race conditions
    // The table has UNIQUE(user_id, first_name_normalized, last_name_normalized)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("search_profiles")
      .upsert(
        {
          user_id: user.id,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
        {
          onConflict: "user_id,first_name_normalized,last_name_normalized",
          ignoreDuplicates: false,
        }
      )
      .select("id")
      .single();

    if (profileError || !profile) {
      console.error("Profile upsert error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to create search profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const profileId = profile.id;

    // Process searches immediately for each state
    const results: Array<{ state: string; success: boolean; claims: number; error?: string }> = [];
    let totalClaims = 0;

    // States with different website structures that we can't scrape yet
    const UNSUPPORTED_STATES = ["AZ", "FL", "GA", "HI", "KY", "MO", "MT", "NM", "PA", "VT", "WI"];

    // Filter out unsupported states from user's selection
    let statesToSearch = states
      .map(s => s.toUpperCase())
      .filter(s => !UNSUPPORTED_STATES.includes(s));

    // ONLY if user selected zero supported states, default to NY first
    // CA will be tried as fallback if NY finds nothing (lines 581-606)
    if (statesToSearch.length === 0) {
      statesToSearch = ["NY"];
    }

    // Process states sequentially to avoid rate limiting
    for (const stateCode of statesToSearch) {
      const result = await processStateSearch(
        supabaseAdmin,
        user.id,
        profileId,
        first_name.trim(),
        last_name.trim(),
        stateCode,
        isSubscribed
      );

      results.push({
        state: stateCode,
        success: result.success,
        claims: result.claimsCount,
        error: result.error,
      });

      if (result.success) {
        totalClaims += result.claimsCount;
      }

      // Also create a job record for tracking (optional, mark as completed)
      await supabaseAdmin
        .from("search_jobs")
        .insert({
          search_profile_id: profileId,
          state_code: stateCode,
          status: result.success ? "completed" : "failed",
          priority: isSubscribed ? 1 : 0,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        });
    }

    // Fallback: if no claims found, try NY then CA
    if (totalClaims === 0) {
      const fallbackStates = ["NY", "CA"].filter(s => !statesToSearch.includes(s));
      for (const stateCode of fallbackStates) {
        const result = await processStateSearch(
          supabaseAdmin,
          user.id,
          profileId,
          first_name.trim(),
          last_name.trim(),
          stateCode,
          isSubscribed
        );
        results.push({ state: stateCode, success: result.success, claims: result.claimsCount, error: result.error });
        if (result.success) totalClaims += result.claimsCount;
        await supabaseAdmin.from("search_jobs").insert({
          search_profile_id: profileId,
          state_code: stateCode,
          status: result.success ? "completed" : "failed",
          priority: isSubscribed ? 1 : 0,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        });
        if (totalClaims > 0) break; // Stop once we find claims
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        profile_id: profileId,
        results,
        total_claims: totalClaims,
        message: `Search completed for ${first_name} ${last_name}: ${successCount}/${states.length} states, ${totalClaims} claims found`,
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
