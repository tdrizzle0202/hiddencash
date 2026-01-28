-- Drip System Schema
-- Adds pagination tracking and drip functionality for pro users

-- ============================================
-- SEARCH CACHE UPDATES
-- Add pagination and drip tracking
-- ============================================

ALTER TABLE search_cache
    ADD COLUMN IF NOT EXISTS search_profile_id UUID REFERENCES search_profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS current_page INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS total_pages INTEGER,
    ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_drip_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS session_data JSONB;

-- Mark all existing cache entries as complete (they were single-page fetches)
UPDATE search_cache SET is_complete = TRUE WHERE is_complete = FALSE;

-- Index for drip worker queries
CREATE INDEX IF NOT EXISTS idx_search_cache_drip_pending
    ON search_cache(last_drip_at, is_complete)
    WHERE is_complete = FALSE;

CREATE INDEX IF NOT EXISTS idx_search_cache_profile
    ON search_cache(search_profile_id);

-- ============================================
-- USER CLAIMS UPDATES
-- Track revealed status per user (claims are shared via cache)
-- ============================================

ALTER TABLE user_claims
    ADD COLUMN IF NOT EXISTS revealed BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for unrevealed claims
CREATE INDEX IF NOT EXISTS idx_user_claims_unrevealed
    ON user_claims(user_id, revealed)
    WHERE revealed = FALSE;

-- ============================================
-- CLAIMS UPDATES
-- Track which page/batch each claim came from
-- ============================================

ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS page_number INTEGER NOT NULL DEFAULT 1;

-- Index for page queries
CREATE INDEX IF NOT EXISTS idx_claims_page ON claims(cache_id, page_number);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to count unrevealed claims for a user's cache
CREATE OR REPLACE FUNCTION get_unrevealed_count(p_user_id UUID, p_cache_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM user_claims uc
    JOIN claims c ON c.id = uc.claim_id
    WHERE uc.user_id = p_user_id
      AND c.cache_id = p_cache_id
      AND uc.revealed = FALSE;

    RETURN v_count;
END;
$$;

-- Function to reveal next N claims and return them
CREATE OR REPLACE FUNCTION reveal_claims(
    p_user_id UUID,
    p_cache_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    claim_id UUID,
    owner_name TEXT,
    amount DECIMAL,
    amount_text TEXT,
    property_type TEXT,
    holder_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update claims to revealed and return them
    RETURN QUERY
    WITH to_reveal AS (
        SELECT uc.id as uc_id, uc.claim_id
        FROM user_claims uc
        JOIN claims c ON c.id = uc.claim_id
        WHERE uc.user_id = p_user_id
          AND c.cache_id = p_cache_id
          AND uc.revealed = FALSE
        ORDER BY c.page_number, c.created_at
        LIMIT p_limit
    ),
    updated AS (
        UPDATE user_claims
        SET revealed = TRUE, updated_at = NOW()
        WHERE id IN (SELECT uc_id FROM to_reveal)
        RETURNING claim_id
    )
    SELECT
        c.id,
        c.owner_name,
        c.amount,
        c.amount_text,
        c.property_type,
        c.holder_name
    FROM updated u
    JOIN claims c ON c.id = u.claim_id;
END;
$$;

-- Function to get users due for drip (pro subscribers only)
-- Now includes users with unrevealed claims OR needing new page fetch
CREATE OR REPLACE FUNCTION get_drip_candidates(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    cache_id UUID,
    user_id UUID,
    search_profile_id UUID,
    first_name TEXT,
    last_name TEXT,
    state_code CHAR(2),
    current_page INTEGER,
    total_pages INTEGER,
    session_data JSONB,
    unrevealed_count INTEGER,
    needs_fetch BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id as cache_id,
        sp.user_id,
        sp.id as search_profile_id,
        sp.first_name,
        sp.last_name,
        sc.state_code,
        sc.current_page,
        sc.total_pages,
        sc.session_data,
        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM user_claims uc
            JOIN claims c ON c.id = uc.claim_id
            WHERE uc.user_id = sp.user_id
              AND c.cache_id = sc.id
              AND uc.revealed = FALSE
        ), 0) as unrevealed_count,
        (sc.total_pages IS NOT NULL AND sc.current_page < sc.total_pages) as needs_fetch
    FROM search_cache sc
    JOIN search_profiles sp ON sp.id = sc.search_profile_id
    JOIN user_subscriptions us ON us.user_id = sp.user_id
    WHERE sc.is_complete = FALSE
      AND us.is_subscribed = TRUE
      AND (sc.last_drip_at IS NULL OR sc.last_drip_at < NOW() - INTERVAL '3 days')
    ORDER BY sc.last_drip_at ASC NULLS FIRST, sc.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Function to save claims from a new page fetch
CREATE OR REPLACE FUNCTION save_page_claims(
    p_cache_id UUID,
    p_user_id UUID,
    p_search_profile_id UUID,
    p_page_number INTEGER,
    p_claims JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim JSONB;
    v_claim_id UUID;
    v_count INTEGER := 0;
BEGIN
    FOR v_claim IN SELECT * FROM jsonb_array_elements(p_claims)
    LOOP
        -- Insert claim
        INSERT INTO claims (
            cache_id, state_code, owner_name, property_type, holder_name,
            owner_address, owner_city, owner_state, owner_zip,
            amount, amount_text, page_number
        ) VALUES (
            p_cache_id,
            COALESCE(v_claim->>'state_code', 'CA'),
            v_claim->>'owner_name',
            COALESCE(v_claim->>'property_type', 'Unknown'),
            v_claim->>'holder_name',
            v_claim->>'owner_address',
            v_claim->>'owner_city',
            v_claim->>'owner_state',
            v_claim->>'owner_zip',
            (v_claim->>'amount')::DECIMAL,
            v_claim->>'amount_text',
            p_page_number
        )
        RETURNING id INTO v_claim_id;

        -- Link to user with revealed=FALSE (will be revealed in batches)
        INSERT INTO user_claims (user_id, claim_id, search_profile_id, revealed)
        VALUES (p_user_id, v_claim_id, p_search_profile_id, FALSE)
        ON CONFLICT (user_id, claim_id) DO NOTHING;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Function to update cache after page fetch
CREATE OR REPLACE FUNCTION update_cache_after_fetch(
    p_cache_id UUID,
    p_new_page INTEGER,
    p_total_pages INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE search_cache
    SET current_page = p_new_page,
        total_pages = COALESCE(p_total_pages, total_pages)
    WHERE id = p_cache_id;
END;
$$;

-- Function to complete drip (after revealing claims)
CREATE OR REPLACE FUNCTION complete_drip(
    p_cache_id UUID,
    p_revealed_count INTEGER,
    p_is_final BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE search_cache
    SET last_drip_at = NOW(),
        is_complete = p_is_final
    WHERE id = p_cache_id;
END;
$$;

-- Function to get total unrevealed amount for notification
CREATE OR REPLACE FUNCTION get_claims_total_amount(p_claim_ids UUID[])
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM claims
    WHERE id = ANY(p_claim_ids);

    RETURN v_total;
END;
$$;

-- ============================================
-- CRON JOB SETUP (pg_cron)
-- Triggers drip worker every hour
-- ============================================

-- Enable pg_cron extension (if not already enabled)
-- Note: This may require superuser permissions
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the drip worker to run every hour
-- This calls the Edge Function via pg_net
-- Uncomment after deploying the edge function:

/*
SELECT cron.schedule(
    'drip-worker-hourly',
    '0 * * * *',  -- Every hour at minute 0
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/drip-worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);
*/

-- Alternative: Use Supabase Dashboard to schedule the cron job
-- Go to: Database > Extensions > Enable pg_cron
-- Then: SQL Editor > Run the cron.schedule command above
