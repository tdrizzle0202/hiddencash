-- Update drip system to daily reveals
-- Changes interval from 3 days to 1 day

-- Update link_claims_to_user to accept revealed parameter
CREATE OR REPLACE FUNCTION link_claims_to_user(
    p_user_id UUID,
    p_search_profile_id UUID,
    p_cache_id UUID,
    p_revealed BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    INSERT INTO user_claims (user_id, claim_id, search_profile_id, revealed)
    SELECT p_user_id, c.id, p_search_profile_id, p_revealed
    FROM claims c
    WHERE c.cache_id = p_cache_id
    ON CONFLICT (user_id, claim_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Update get_drip_candidates to check daily instead of every 3 days
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
      AND (sc.last_drip_at IS NULL OR sc.last_drip_at < NOW() - INTERVAL '1 day')
    ORDER BY sc.last_drip_at ASC NULLS FIRST, sc.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_drip_candidates(INTEGER) IS
'Returns pro subscribers eligible for daily drip (5 claims/day).
Checks for users with unrevealed claims or incomplete page fetches
where last_drip_at was more than 1 day ago.';
