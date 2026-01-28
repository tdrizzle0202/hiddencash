import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DripCandidate {
  cache_id: string;
  user_id: string;
  search_profile_id: string;
  first_name: string;
  last_name: string;
  state_code: string;
  current_page: number;
  total_pages: number | null;
  session_data: Record<string, unknown> | null;
  unrevealed_count: number;
  needs_fetch: boolean;
}

interface ClaimResult {
  owner_name: string;
  holder_name: string;
  owner_address: string;
  owner_city: string;
  owner_state: string;
  owner_zip: string;
  amount: number | null;
  amount_text: string;
}

interface RevealedClaim {
  claim_id: string;
  owner_name: string;
  amount: number | null;
  amount_text: string;
  property_type: string;
  holder_name: string;
}

const ZENROWS_API_KEY = Deno.env.get("ZENROWS_API_KEY") ?? "";
const REVENUECAT_API_KEY = Deno.env.get("REVENUECAT_API_KEY") ?? "";
const CLAIMS_PER_DRIP = 5;

// State URLs (same as search function)
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

/**
 * Verify user has active pro subscription via RevenueCat
 */
async function verifySubscription(userId: string): Promise<boolean> {
  if (!REVENUECAT_API_KEY) {
    console.warn("REVENUECAT_API_KEY not set, skipping verification");
    return true;
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`RevenueCat error: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const entitlements = data.subscriber?.entitlements ?? {};

    return Object.values(entitlements).some(
      (e: any) =>
        e.expires_date === null || new Date(e.expires_date) > new Date()
    );
  } catch (error) {
    console.error("RevenueCat verification failed:", error);
    return false;
  }
}

/**
 * Fetch a page from ZenRows for any state
 */
async function fetchPage(
  firstName: string,
  lastName: string,
  stateCode: string,
  page: number
): Promise<{ results: ClaimResult[]; totalPages: number }> {
  const state = STATES[stateCode];
  if (!state) {
    console.log(`Unknown state: ${stateCode}`);
    return { results: [], totalPages: 1 };
  }

  // Build JS instructions based on page number
  const jsInstructions =
    page === 1
      ? [
          { wait: 8000 },
          { fill: ["input[name='lastName'], input[id*='lastName'], input[id*='last']", lastName] },
          { fill: ["input[name='firstName'], input[id*='firstName'], input[id*='first']", firstName || ""] },
          { wait: 2000 },
          { click: "button[type='submit'], input[type='submit']" },
          { wait: 10000 },
        ]
      : [
          { wait: 6000 },
          { fill: ["input[name='lastName'], input[id*='lastName'], input[id*='last']", lastName] },
          { fill: ["input[name='firstName'], input[id*='firstName'], input[id*='first']", firstName || ""] },
          { wait: 1000 },
          { click: "button[type='submit'], input[type='submit']" },
          { wait: 10000 },
          { click: `[aria-label='Page ${page}'], #topPropertySearchResultsPager li:nth-child(${page + 2}) a, .pagination li:nth-child(${page + 1}) a` },
          { wait: 8000 },
        ];

  const cacheBuster = Date.now();
  const targetUrl = `${state.url}?_cb=${cacheBuster}`;

  const params = new URLSearchParams({
    url: targetUrl,
    apikey: ZENROWS_API_KEY,
    js_render: "true",
    antibot: "true",
    premium_proxy: "true",
    js_instructions: JSON.stringify(jsInstructions),
    wait: "10000",
  });

  const response = await fetch(`https://api.zenrows.com/v1/?${params}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`ZenRows error: ${response.status}`);
  }

  const html = await response.text();

  // Check for Turnstile block
  if (
    !html.includes('turnstile-modal" class="d-none') &&
    html.toLowerCase().includes("check the box")
  ) {
    throw new Error("Blocked by Turnstile CAPTCHA");
  }

  const results = parseResults(html, stateCode);
  const totalPages = getPaginationInfo(html).totalPages;

  return { results, totalPages };
}


/**
 * Parse property results from HTML
 */
function parseResults(html: string, stateCode: string = ""): ClaimResult[] {
  const extractField = (html: string, header: string): string[] => {
    const regex = new RegExp(
      `headers="${header}"[^>]*>.*?<span[^>]*class="[^"]*text-uppercase[^"]*"[^>]*>\\s*([^<]+?)\\s*</span>`,
      "gs"
    );
    const matches = [...html.matchAll(regex)];
    return matches.map((m) => m[1]?.trim() ?? "");
  };

  const names = extractField(html, "propownerName");
  const holders = extractField(html, "propholderName");
  const addresses = extractField(html, "propaddress");
  const cities = extractField(html, "propcity");
  const states = extractField(html, "propstate");
  const zips = extractField(html, "propzip");

  const amountRegex = /(UNDER \$100|\$[\d,]+(?:\.\d{2})?)/g;
  const allAmounts = [...html.matchAll(amountRegex)].map((m) => m[1]);
  const amounts = allAmounts.slice(4);

  const results: ClaimResult[] = [];
  for (let i = 0; i < names.length; i++) {
    results.push({
      owner_name: names[i] ?? "",
      holder_name: holders[i] ?? "",
      owner_address: addresses[i] ?? "",
      owner_city: cities[i] ?? "",
      owner_state: states[i] ?? stateCode,
      owner_zip: zips[i] ?? "",
      amount: parseAmount(amounts[i] ?? ""),
      amount_text: amounts[i] ?? "",
    });
  }

  return results;
}

/**
 * Extract pagination info from HTML
 */
function getPaginationInfo(html: string, resultsPerPage = 20): { totalResults: number; totalPages: number } {
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

/**
 * Parse amount string to decimal
 */
function parseAmount(amountText: string): number | null {
  if (!amountText) return null;
  if (amountText === "UNDER $100") return 50;
  const cleaned = amountText.replace(/[$,]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Send push notification via Expo
 */
async function sendPushNotification(
  supabase: any,
  userId: string,
  claimsCount: number,
  totalAmount: number,
  isFinal: boolean
): Promise<void> {
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!tokens || tokens.length === 0) {
    console.log(`No push tokens for user ${userId}`);
    return;
  }

  const title = isFinal ? "Audit Complete" : "New Properties Found!";
  const body = isFinal
    ? `We've scanned all available pages for your name. We'll continue monitoring for new listings.`
    : `We found ${claimsCount} more unclaimed properties worth $${totalAmount.toLocaleString()}!`;

  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: "default",
    title,
    body,
    data: { type: isFinal ? "audit_complete" : "new_claims", count: claimsCount },
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error("Push notification failed:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get drip candidates
    const { data: candidates, error: candidatesError } = await supabase.rpc(
      "get_drip_candidates",
      { p_limit: 10 }
    );

    if (candidatesError) {
      console.error("Failed to get drip candidates:", candidatesError);
      return new Response(
        JSON.stringify({ error: "Failed to get drip candidates" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No drip candidates found", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${candidates.length} drip candidates`);

    let processed = 0;
    let errors = 0;

    for (const candidate of candidates as DripCandidate[]) {
      try {
        // GUARD: Verify subscription is still active
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("is_subscribed")
          .eq("user_id", candidate.user_id)
          .single();

        if (!subscription?.is_subscribed) {
          console.log(`User ${candidate.user_id} no longer subscribed, skipping`);
          continue;
        }

        // Double-check with RevenueCat
        if (REVENUECAT_API_KEY) {
          const isActive = await verifySubscription(candidate.user_id);
          if (!isActive) {
            console.log(`User ${candidate.user_id} RevenueCat subscription inactive`);
            await supabase
              .from("user_subscriptions")
              .update({ is_subscribed: false })
              .eq("user_id", candidate.user_id);
            continue;
          }
        }

        let revealedClaims: RevealedClaim[] = [];
        let needsFetch = candidate.unrevealed_count < CLAIMS_PER_DRIP && candidate.needs_fetch;

        // Step 1: If we need more claims, fetch next page
        if (needsFetch) {
          const nextPage = candidate.current_page + 1;
          console.log(
            `Fetching page ${nextPage} for ${candidate.first_name} ${candidate.last_name} (${candidate.state_code})`
          );

          try {
            const { results, totalPages } = await fetchPage(
              candidate.first_name,
              candidate.last_name,
              candidate.state_code,
              nextPage
            );

            if (results.length > 0) {
              // Save all results with revealed=false
              const claimsJson = JSON.stringify(
                results.map((r) => ({
                  owner_name: r.owner_name,
                  holder_name: r.holder_name,
                  owner_address: r.owner_address,
                  owner_city: r.owner_city,
                  owner_state: r.owner_state,
                  owner_zip: r.owner_zip,
                  amount: r.amount,
                  amount_text: r.amount_text,
                  state_code: candidate.state_code,
                }))
              );

              await supabase.rpc("save_page_claims", {
                p_cache_id: candidate.cache_id,
                p_user_id: candidate.user_id,
                p_search_profile_id: candidate.search_profile_id,
                p_page_number: nextPage,
                p_claims: claimsJson,
              });

              console.log(`Saved ${results.length} claims from page ${nextPage}`);
            }

            // Update cache with new page info
            await supabase.rpc("update_cache_after_fetch", {
              p_cache_id: candidate.cache_id,
              p_new_page: nextPage,
              p_total_pages: totalPages,
            });
          } catch (fetchError) {
            console.error(`Failed to fetch page: ${fetchError}`);
            // Continue to reveal what we have
          }
        }

        // Step 2: Reveal up to 5 claims
        const { data: revealed, error: revealError } = await supabase.rpc("reveal_claims", {
          p_user_id: candidate.user_id,
          p_cache_id: candidate.cache_id,
          p_limit: CLAIMS_PER_DRIP,
        });

        if (revealError) {
          console.error("Failed to reveal claims:", revealError);
          throw revealError;
        }

        revealedClaims = revealed || [];
        const revealedCount = revealedClaims.length;

        if (revealedCount === 0) {
          console.log(`No claims to reveal for ${candidate.first_name} ${candidate.last_name}`);

          // Check if we're truly done (no unrevealed AND no more pages)
          const { data: unrevealed } = await supabase.rpc("get_unrevealed_count", {
            p_user_id: candidate.user_id,
            p_cache_id: candidate.cache_id,
          });

          const hasMorePages =
            candidate.total_pages !== null &&
            candidate.current_page < candidate.total_pages;

          if (unrevealed === 0 && !hasMorePages) {
            // Mark as complete and send final notification
            await supabase.rpc("complete_drip", {
              p_cache_id: candidate.cache_id,
              p_revealed_count: 0,
              p_is_final: true,
            });

            await sendPushNotification(supabase, candidate.user_id, 0, 0, true);
          }

          continue;
        }

        // Calculate total amount for notification
        const totalAmount = revealedClaims.reduce(
          (sum, c) => sum + (c.amount ?? 0),
          0
        );

        // Check if this was the final drip
        const { data: remainingCount } = await supabase.rpc("get_unrevealed_count", {
          p_user_id: candidate.user_id,
          p_cache_id: candidate.cache_id,
        });

        const hasMorePages =
          candidate.total_pages !== null &&
          candidate.current_page < candidate.total_pages;

        const isFinal = remainingCount === 0 && !hasMorePages;

        // Update drip status
        await supabase.rpc("complete_drip", {
          p_cache_id: candidate.cache_id,
          p_revealed_count: revealedCount,
          p_is_final: isFinal,
        });

        // Send notification
        await sendPushNotification(
          supabase,
          candidate.user_id,
          revealedCount,
          totalAmount,
          isFinal
        );

        processed++;
        console.log(
          `Drip complete: ${candidate.first_name} ${candidate.last_name} - revealed ${revealedCount}, isFinal=${isFinal}`
        );
      } catch (error) {
        console.error(`Error processing ${candidate.cache_id}:`, error);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Drip worker completed",
        processed,
        errors,
        total: candidates.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Drip worker error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
