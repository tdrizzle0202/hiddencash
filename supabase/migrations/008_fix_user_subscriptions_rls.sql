-- Add missing INSERT and UPDATE policies for user_subscriptions
-- Users need to be able to create and update their own subscription records

CREATE POLICY "Users can insert own subscription"
    ON user_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
