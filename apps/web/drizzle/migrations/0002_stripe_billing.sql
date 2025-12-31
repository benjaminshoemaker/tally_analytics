ALTER TABLE users
  ADD COLUMN stripe_subscription_id VARCHAR(255),
  ADD COLUMN stripe_subscription_status VARCHAR(32),
  ADD COLUMN stripe_price_id VARCHAR(255),
  ADD COLUMN stripe_current_period_end TIMESTAMPTZ,
  ADD COLUMN stripe_cancel_at_period_end BOOLEAN,
  ADD COLUMN stripe_last_webhook_event_id VARCHAR(255),
  ADD COLUMN stripe_last_webhook_event_created BIGINT;

CREATE INDEX idx_users_stripe_subscription_id ON users(stripe_subscription_id);

