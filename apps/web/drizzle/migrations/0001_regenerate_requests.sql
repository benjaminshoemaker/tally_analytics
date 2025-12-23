-- =============================================================================
-- REGENERATE REQUESTS TABLE (rate limiting)
-- =============================================================================
CREATE TABLE IF NOT EXISTS regenerate_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(20) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regenerate_requests_project_id ON regenerate_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_regenerate_requests_created_at ON regenerate_requests(created_at);
--> statement-breakpoint

