-- Update drip system to weekly reveals (5 claims per week)
-- Changes interval from 1 day to 7 days

-- Update get_drip_candidates to check weekly instead of daily
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
      AND (sc.last_drip_at IS NULL OR sc.last_drip_at < NOW() - INTERVAL '7 days')
    ORDER BY sc.last_drip_at ASC NULLS FIRST, sc.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Update comment for documentation
COMMENT ON FUNCTION get_drip_candidates(INTEGER) IS
'Returns pro subscribers eligible for weekly drip (5 claims/week).
Checks for users with unrevealed claims or incomplete page fetches
where last_drip_at was more than 7 days ago.';
