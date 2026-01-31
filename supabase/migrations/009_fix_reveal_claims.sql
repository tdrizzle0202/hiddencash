-- Fix reveal_claims to use search_profile_id instead of cache_id
-- This is more reliable since search_profile_id is directly on user_claims

-- Drop old function first (parameter names are changing)
DROP FUNCTION IF EXISTS reveal_claims(uuid, uuid, integer);

-- Recreate reveal_claims to use search_profile_id
CREATE OR REPLACE FUNCTION reveal_claims(
    p_user_id UUID,
    p_search_profile_id UUID,
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
        WHERE uc.user_id = p_user_id
          AND uc.search_profile_id = p_search_profile_id
          AND uc.revealed = FALSE
        ORDER BY uc.created_at
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

-- Also create a version that works with cache_id for backwards compatibility
-- (used by drip-worker)
CREATE OR REPLACE FUNCTION reveal_claims_by_cache(
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
