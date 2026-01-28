// Supabase Edge Function: Search
// Triggered by HTTP request from Expo app
// Calls ZenRows for Page 1, saves to DB, returns results

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ZENROWS_API_KEY = Deno.env.get("ZENROWS_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// State URLs
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
}

interface SearchRequest {
  user_id: string
  profile_id: string
  first_name: string
  last_name: string
  state_code: string
}

interface Claim {
  owner_name: string
  holder_name: string
  owner_address: string
  owner_city: string
  owner_state: string
  owner_zip: string
  amount: number | null
  amount_text: string
  state_code: string
  property_type: string
}

// Fetch from ZenRows
async function fetchZenRows(stateCode: string, lastName: string, firstName: string): Promise<string> {
  const state = STATES[stateCode]
  if (!state) throw new Error(`Unknown state: ${stateCode}`)

  const cacheBuster = Date.now()
  const targetUrl = `${state.url}?_cb=${cacheBuster}`

  const jsInstructions = [
    { wait: 8000 },
    { fill: ["input[name='lastName'], input[id*='lastName'], input[id*='last']", lastName] },
    { fill: ["input[name='firstName'], input[id*='firstName'], input[id*='first']", firstName || ""] },
    { wait: 2000 },
    { click: "button[type='submit'], input[type='submit']" },
    { wait: 10000 },
  ]

  const params = new URLSearchParams({
    url: targetUrl,
    apikey: ZENROWS_API_KEY,
    js_render: "true",
    antibot: "true",
    premium_proxy: "true",
    js_instructions: JSON.stringify(jsInstructions),
    wait: "10000",
  })

  const response = await fetch(`https://api.zenrows.com/v1/?${params}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(`ZenRows error: ${response.status}`)
  }

  return await response.text()
}

// Check if blocked by CAPTCHA
function isBlocked(html: string): boolean {
  if (!html.includes('turnstile-modal" class="d-none') && html.toLowerCase().includes("check the box")) {
    return true
  }
  return false
}

// Extract pagination info
function extractPagination(html: string, resultsPerPage = 20): { totalResults: number; totalPages: number } {
  // Pattern 1: "returned X unclaimed"
  let match = html.match(/returned\s+(\d+)\s+unclaimed/i)
  if (match) {
    const totalResults = parseInt(match[1])
    return { totalResults, totalPages: Math.ceil(totalResults / resultsPerPage) }
  }

  // Pattern 2: "X results"
  match = html.match(/(\d+)\s+(?:total\s+)?(?:results?|records?|items?|properties?|claims?)\s*(?:found)?/i)
  if (match) {
    const totalResults = parseInt(match[1])
    return { totalResults, totalPages: Math.ceil(totalResults / resultsPerPage) }
  }

  // Pattern 3: aria-label pagination
  const pageLinks = html.match(/aria-label=["']Page\s+(\d+)["']/g) || []
  if (pageLinks.length > 0) {
    const pages = pageLinks.map(p => parseInt(p.match(/(\d+)/)![1]))
    const maxPage = Math.max(...pages)
    return { totalResults: maxPage * resultsPerPage, totalPages: maxPage }
  }

  return { totalResults: 0, totalPages: 1 }
}

// Parse claims from HTML
function parseClaims(html: string, stateCode: string): Claim[] {
  const extractField = (header: string): string[] => {
    const pattern = new RegExp(
      `headers="${header}"[^>]*>.*?<span[^>]*class="[^"]*text-uppercase[^"]*"[^>]*>\\s*([^<]+?)\\s*</span>`,
      "gis"
    )
    const matches = [...html.matchAll(pattern)]
    return matches.map(m => m[1].trim())
  }

  const names = extractField("propownerName")
  const holders = extractField("propholderName")
  const addresses = extractField("propaddress")
  const cities = extractField("propcity")
  const states = extractField("propstate")
  const zips = extractField("propzip")

  // Get amounts
  const amountMatches = html.match(/(UNDER \$100|\$[\d,]+(?:\.\d{2})?)/g) || []
  const amounts = amountMatches.slice(4) // Skip header amounts

  const claims: Claim[] = []
  for (let i = 0; i < names.length; i++) {
    const amountText = amounts[i] || ""
    let amount: number | null = null
    if (amountText && !amountText.includes("UNDER")) {
      amount = parseFloat(amountText.replace(/[$,]/g, ""))
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
    })
  }

  return claims
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const { user_id, profile_id, first_name, last_name, state_code }: SearchRequest = await req.json()

    if (!user_id || !last_name || !state_code) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check cache first
    const { data: cacheData } = await supabase.rpc("check_cache", {
      p_first_name: first_name || "",
      p_last_name: last_name,
      p_state_code: state_code,
    })

    if (cacheData?.[0]?.is_valid) {
      // Cache hit - link claims to user and return
      const cacheId = cacheData[0].cache_id
      await supabase.rpc("link_claims_to_user", {
        p_user_id: user_id,
        p_search_profile_id: profile_id,
        p_cache_id: cacheId,
        p_revealed: true,
      })

      // Get claims from cache
      const { data: claims } = await supabase
        .from("claims")
        .select("*")
        .eq("cache_id", cacheId)
        .limit(20)

      return new Response(JSON.stringify({
        success: true,
        cached: true,
        claims: claims || [],
        total_results: cacheData[0].results_count,
        total_pages: cacheData[0].total_pages || 1,
      }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Fetch from ZenRows
    console.log(`Fetching ${state_code} for ${first_name} ${last_name}`)
    const html = await fetchZenRows(state_code, last_name, first_name || "")

    // Check for blocking
    if (isBlocked(html)) {
      return new Response(JSON.stringify({ error: "Blocked by CAPTCHA" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Parse results
    const claims = parseClaims(html, state_code)
    const { totalResults, totalPages } = extractPagination(html)

    console.log(`Found ${claims.length} claims, ${totalResults} total, ${totalPages} pages`)

    // Create cache entry
    const isComplete = totalPages <= 1
    const { data: cacheEntry } = await supabase
      .from("search_cache")
      .insert({
        first_name_normalized: (first_name || "").toLowerCase().trim(),
        last_name_normalized: last_name.toLowerCase().trim(),
        state_code,
        results_count: claims.length,
        search_profile_id: profile_id,
        total_pages: totalPages > 1 ? totalPages : null,
        current_page: 1,
        is_complete: isComplete,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

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
      }))

      await supabase.from("claims").insert(claimData)

      // Link to user
      await supabase.rpc("link_claims_to_user", {
        p_user_id: user_id,
        p_search_profile_id: profile_id,
        p_cache_id: cacheEntry.id,
        p_revealed: true,
      })
    }

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      claims,
      total_results: totalResults,
      total_pages: totalPages,
      is_complete: isComplete,
    }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("Search error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
