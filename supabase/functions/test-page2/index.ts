import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ZENROWS_API_KEY = Deno.env.get("ZENROWS_API_KEY") ?? "";

// State URLs
const STATES: Record<string, { url: string; name: string }> = {
  NY: { url: "https://ouf.osc.ny.gov/app/claim-search", name: "New York" },
  CA: { url: "https://claimit.ca.gov/app/claim-search", name: "California" },
  TX: { url: "https://www.claimittexas.gov/app/claim-search", name: "Texas" },
  IL: { url: "https://icash.illinoistreasurer.gov/app/claim-search", name: "Illinois" },
  NC: { url: "https://www.nccash.com/app/claim-search", name: "North Carolina" },
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
}

async function fetchPage(
  firstName: string,
  lastName: string,
  stateCode: string,
  page: number
): Promise<{ html: string; results: ClaimResult[]; totalPages: number }> {
  const state = STATES[stateCode];
  if (!state) {
    throw new Error(`Unknown state: ${stateCode}`);
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
          { wait: 12000 },
          // Use specific pager ID - page N is at nth-child(N+2) because First/Previous come before page numbers
          { click: `#topPropertySearchResultsPager li:nth-child(${page + 2}) a` },
          { wait: 10000 },
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

  console.log(`Fetching page ${page} for ${firstName} ${lastName} in ${stateCode}`);
  console.log(`JS Instructions:`, JSON.stringify(jsInstructions, null, 2));

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

  return { html, results, totalPages };
}

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

function getPaginationInfo(html: string, resultsPerPage = 20): { totalResults: number; totalPages: number } {
  let match = html.match(/returned\s+(\d+)\s+unclaimed/i);
  if (match) {
    const totalResults = parseInt(match[1]);
    return { totalResults, totalPages: Math.ceil(totalResults / resultsPerPage) };
  }

  match = html.match(/(\d+)\s+(?:total\s+)?(?:results?|records?|items?|properties?|claims?)\s*(?:found)?/i);
  if (match) {
    const totalResults = parseInt(match[1]);
    return { totalResults, totalPages: Math.ceil(totalResults / resultsPerPage) };
  }

  const pageLinks = html.match(/aria-label=["']Page\s+(\d+)["']/g) || [];
  if (pageLinks.length > 0) {
    const pages = pageLinks.map(p => parseInt(p.match(/(\d+)/)![1]));
    const maxPage = Math.max(...pages);
    return { totalResults: maxPage * resultsPerPage, totalPages: maxPage };
  }

  return { totalResults: 0, totalPages: 1 };
}

function parseAmount(amountText: string): number | null {
  if (!amountText) return null;
  if (amountText === "UNDER $100") return 50;
  const cleaned = amountText.replace(/[$,]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const firstName = url.searchParams.get("first_name") || "";
    const lastName = url.searchParams.get("last_name") || "";
    const stateCode = url.searchParams.get("state") || "NY";
    const page = parseInt(url.searchParams.get("page") || "2");
    const includeHtml = url.searchParams.get("include_html") === "true";

    if (!lastName) {
      return new Response(
        JSON.stringify({ error: "last_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing page ${page} scrape for: ${firstName} ${lastName} in ${stateCode}`);

    const startTime = Date.now();
    const { html, results, totalPages } = await fetchPage(firstName, lastName, stateCode, page);
    const elapsed = Date.now() - startTime;

    // Check what pagination elements we found
    const paginationDebug = {
      hasAriaLabelPages: (html.match(/aria-label=["']Page\s+\d+["']/g) || []).length,
      foundPages: (html.match(/aria-label=["']Page\s+(\d+)["']/g) || []).map(p => p.match(/(\d+)/)?.[1]),
      hasTopPager: html.includes("topPropertySearchResultsPager"),
      hasPaginationClass: html.includes('class="pagination"'),
      returnedXUnclaimed: html.match(/returned\s+(\d+)\s+unclaimed/i)?.[1],
    };

    const response: Record<string, unknown> = {
      success: true,
      params: { firstName, lastName, stateCode, page },
      elapsed_ms: elapsed,
      results_count: results.length,
      total_pages: totalPages,
      pagination_debug: paginationDebug,
      results: results,
    };

    if (includeHtml) {
      response.html_preview = html.substring(0, 50000);
      response.html_length = html.length;
    }

    return new Response(
      JSON.stringify(response, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
