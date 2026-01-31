-- ============================================
-- CRON JOB SETUP FOR WEEKLY DRIP WORKER
-- ============================================
--
-- Run this SQL in your Supabase Dashboard:
-- 1. Go to: https://supabase.com/dashboard/project/owcnyzmfjtnrjzdgrujl
-- 2. Navigate to: Database > Extensions
-- 3. Enable: pg_cron and pg_net extensions
-- 4. Go to: SQL Editor
-- 5. Run this script
--
-- ============================================

-- Step 1: Enable extensions (if not already enabled via Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Remove any existing drip-worker cron jobs
DO $$
BEGIN
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname LIKE 'drip-worker%';
EXCEPTION WHEN undefined_table THEN
    -- cron.job doesn't exist yet, that's fine
    NULL;
END $$;

-- Step 3: Schedule the drip worker to run daily at 9 AM UTC
-- The function checks for users who haven't received their weekly drip (7+ days since last)
-- Running daily ensures users get their claims on their "anniversary" day
--
-- ⚠️  IMPORTANT: Before running this, you MUST replace the placeholder below!
--     1. Go to: https://supabase.com/dashboard/project/owcnyzmfjtnrjzdgrujl/settings/api
--     2. Copy the "service_role" key (NOT the anon key)
--     3. Replace 'YOUR_SERVICE_ROLE_KEY' below with the actual key
--
SELECT cron.schedule(
    'drip-worker-daily',
    '0 9 * * *',  -- Every day at 9:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://owcnyzmfjtnrjzdgrujl.supabase.co/functions/v1/drip-worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- ============================================
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY_HERE above with your actual service role key
-- Find it at: https://supabase.com/dashboard/project/owcnyzmfjtnrjzdgrujl/settings/api
-- ============================================

-- Step 4: Verify the cron job was created
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'drip-worker-daily';

-- ============================================
-- USEFUL COMMANDS
-- ============================================

-- Check cron job history (after it runs):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Manually trigger the drip worker (for testing):
-- SELECT net.http_post(
--     url := 'https://owcnyzmfjtnrjzdgrujl.supabase.co/functions/v1/drip-worker',
--     headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
-- );

-- Unschedule the cron job:
-- SELECT cron.unschedule('drip-worker-daily');
