-- HiddenCash Initial Schema
-- Unclaimed property search and claims management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- SEARCH PROFILES
-- User's saved search identities
-- ============================================
CREATE TABLE search_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    first_name_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(first_name))) STORED,
    last_name_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(last_name))) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, first_name_normalized, last_name_normalized)
);

CREATE INDEX idx_search_profiles_user_id ON search_profiles(user_id);

-- ============================================
-- SEARCH JOBS
-- Queue for scraping jobs
-- ============================================
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE search_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_profile_id UUID NOT NULL REFERENCES search_profiles(id) ON DELETE CASCADE,
    state_code CHAR(2) NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for worker queue polling (most important index)
CREATE INDEX idx_search_jobs_queue ON search_jobs(status, priority DESC, created_at ASC)
    WHERE status IN ('pending', 'failed');

CREATE INDEX idx_search_jobs_profile ON search_jobs(search_profile_id);
CREATE INDEX idx_search_jobs_state ON search_jobs(state_code);

-- ============================================
-- SEARCH CACHE
-- 24h TTL cache to avoid re-scraping
-- ============================================
CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name_normalized TEXT NOT NULL,
    last_name_normalized TEXT NOT NULL,
    state_code CHAR(2) NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

    UNIQUE(first_name_normalized, last_name_normalized, state_code)
);

-- Index for cache lookup
CREATE INDEX idx_search_cache_lookup ON search_cache(first_name_normalized, last_name_normalized, state_code);
CREATE INDEX idx_search_cache_expiry ON search_cache(expires_at);

-- ============================================
-- CLAIMS
-- Scraped claim results
-- ============================================
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_id UUID REFERENCES search_cache(id) ON DELETE SET NULL,
    state_code CHAR(2) NOT NULL,
    owner_name TEXT NOT NULL,
    owner_name_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(owner_name))) STORED,
    owner_address TEXT,
    owner_city TEXT,
    owner_state CHAR(2),
    owner_zip TEXT,
    property_id TEXT,
    property_type TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    holder_address TEXT,
    amount DECIMAL(12, 2),
    amount_text TEXT,
    reported_date DATE,
    claim_url TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for matching claims to users
CREATE INDEX idx_claims_owner_normalized ON claims(owner_name_normalized, state_code);
CREATE INDEX idx_claims_state ON claims(state_code);
CREATE INDEX idx_claims_cache_id ON claims(cache_id);

-- Full text search index for fuzzy name matching
CREATE INDEX idx_claims_owner_trgm ON claims USING gin(owner_name_normalized gin_trgm_ops);

-- ============================================
-- USER CLAIMS
-- Links users to their potential claims
-- ============================================
CREATE TYPE claim_status AS ENUM ('new', 'viewed', 'claimed', 'dismissed');

CREATE TABLE user_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    search_profile_id UUID REFERENCES search_profiles(id) ON DELETE SET NULL,
    status claim_status NOT NULL DEFAULT 'new',
    viewed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, claim_id)
);

CREATE INDEX idx_user_claims_user ON user_claims(user_id, status);
CREATE INDEX idx_user_claims_claim ON user_claims(claim_id);

-- ============================================
-- PUSH TOKENS
-- Store Expo push tokens
-- ============================================
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_id TEXT,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id) WHERE is_active = TRUE;

-- ============================================
-- USER SUBSCRIPTIONS (for tracking)
-- ============================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    revenuecat_customer_id TEXT,
    is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_type TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to claim next pending job (with locking)
CREATE OR REPLACE FUNCTION claim_next_job(p_state_code CHAR(2) DEFAULT NULL)
RETURNS TABLE (
    job_id UUID,
    profile_id UUID,
    first_name TEXT,
    last_name TEXT,
    state CHAR(2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id UUID;
BEGIN
    -- Select and lock next available job
    SELECT sj.id INTO v_job_id
    FROM search_jobs sj
    WHERE sj.status = 'pending'
      AND (p_state_code IS NULL OR sj.state_code = p_state_code)
      AND sj.attempts < sj.max_attempts
    ORDER BY sj.priority DESC, sj.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_job_id IS NULL THEN
        RETURN;
    END IF;

    -- Mark as processing
    UPDATE search_jobs
    SET status = 'processing',
        started_at = NOW(),
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = v_job_id;

    -- Return job details with profile info
    RETURN QUERY
    SELECT
        sj.id as job_id,
        sp.id as profile_id,
        sp.first_name,
        sp.last_name,
        sj.state_code as state
    FROM search_jobs sj
    JOIN search_profiles sp ON sp.id = sj.search_profile_id
    WHERE sj.id = v_job_id;
END;
$$;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE search_jobs
    SET status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        completed_at = NOW(),
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$;

-- Function to check cache
CREATE OR REPLACE FUNCTION check_cache(
    p_first_name TEXT,
    p_last_name TEXT,
    p_state_code CHAR(2)
)
RETURNS TABLE (
    cache_id UUID,
    is_valid BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.expires_at > NOW() as is_valid
    FROM search_cache sc
    WHERE sc.first_name_normalized = LOWER(TRIM(p_first_name))
      AND sc.last_name_normalized = LOWER(TRIM(p_last_name))
      AND sc.state_code = p_state_code
    LIMIT 1;
END;
$$;

-- Function to link claims to user after scraping
CREATE OR REPLACE FUNCTION link_claims_to_user(
    p_user_id UUID,
    p_search_profile_id UUID,
    p_cache_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    INSERT INTO user_claims (user_id, claim_id, search_profile_id)
    SELECT p_user_id, c.id, p_search_profile_id
    FROM claims c
    WHERE c.cache_id = p_cache_id
    ON CONFLICT (user_id, claim_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE search_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Search profiles: users can only see their own
CREATE POLICY "Users can view own search profiles"
    ON search_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own search profiles"
    ON search_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search profiles"
    ON search_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Search jobs: users can view their own jobs
CREATE POLICY "Users can view own search jobs"
    ON search_jobs FOR SELECT
    USING (
        search_profile_id IN (
            SELECT id FROM search_profiles WHERE user_id = auth.uid()
        )
    );

-- User claims: users can only see their own
CREATE POLICY "Users can view own claims"
    ON user_claims FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own claims"
    ON user_claims FOR UPDATE
    USING (auth.uid() = user_id);

-- Push tokens: users can manage their own
CREATE POLICY "Users can view own push tokens"
    ON push_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
    ON push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
    ON push_tokens FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
    ON push_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- User subscriptions: users can view their own
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Claims and search_cache are public read (but details gated by subscription in app)
-- No RLS needed as they don't contain user-specific data

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_search_profiles_updated_at
    BEFORE UPDATE ON search_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_search_jobs_updated_at
    BEFORE UPDATE ON search_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_user_claims_updated_at
    BEFORE UPDATE ON user_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-cleanup expired cache entries (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM search_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
