-- Migration 006: Fix claim_status enum and add missing columns
-- Fixes:
-- 1. Add 'liked' and 'disliked' to claim_status enum
-- 2. Add liked_at and disliked_at columns to user_claims
-- 3. Add INSERT policy for user_claims
-- 4. Handle NULL search_profile_id in drip candidates

-- ============================================
-- FIX 1: Add missing enum values to claim_status
-- ============================================

-- PostgreSQL requires creating a new type and migrating
-- First, add the new values to the existing enum
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'liked';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'disliked';

-- ============================================
-- FIX 2: Add missing columns to user_claims
-- ============================================

ALTER TABLE user_claims
    ADD COLUMN IF NOT EXISTS liked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disliked_at TIMESTAMPTZ;

-- ============================================
-- FIX 3: Add INSERT policy for user_claims
-- ============================================

-- Drop if exists (for idempotency)
DROP POLICY IF EXISTS "Users can insert own claims" ON user_claims;

-- Users can insert their own claims
CREATE POLICY "Users can insert own claims"
    ON user_claims FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FIX 4: Update get_drip_candidates to handle NULL search_profile_id
-- ============================================

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
    INNER JOIN search_profiles sp ON sp.id = sc.search_profile_id
    INNER JOIN user_subscriptions us ON us.user_id = sp.user_id
    WHERE sc.is_complete = FALSE
      AND sc.search_profile_id IS NOT NULL  -- Explicitly filter out NULL profile IDs
      AND us.is_subscribed = TRUE
      AND (sc.last_drip_at IS NULL OR sc.last_drip_at < NOW() - INTERVAL '7 days')
    ORDER BY sc.last_drip_at ASC NULLS FIRST, sc.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Update comment
COMMENT ON FUNCTION get_drip_candidates(INTEGER) IS
'Returns pro subscribers eligible for weekly drip (5 claims/week).
Checks for users with unrevealed claims or incomplete page fetches
where last_drip_at was more than 7 days ago.
Only includes cache entries with valid search_profile_id.';

-- ============================================
-- FIX 5: Update check_cache to return more fields
-- Must drop first since return type is changing
-- ============================================

DROP FUNCTION IF EXISTS check_cache(TEXT, TEXT, CHAR);

CREATE FUNCTION check_cache(
    p_first_name TEXT,
    p_last_name TEXT,
    p_state_code CHAR(2)
)
RETURNS TABLE (
    cache_id UUID,
    is_valid BOOLEAN,
    results_count INTEGER,
    total_pages INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.expires_at > NOW() as is_valid,
        sc.results_count,
        sc.total_pages
    FROM search_cache sc
    WHERE sc.first_name_normalized = LOWER(TRIM(p_first_name))
      AND sc.last_name_normalized = LOWER(TRIM(p_last_name))
      AND sc.state_code = p_state_code
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION check_cache(TEXT, TEXT, CHAR) IS
'Check if a valid cache entry exists for the given name and state.
Returns cache_id, validity status, results_count, and total_pages.';
