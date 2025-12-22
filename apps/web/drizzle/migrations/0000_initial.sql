-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
    stripe_customer_id VARCHAR(255),

    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
--> statement-breakpoint

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    user_agent TEXT,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
--> statement-breakpoint

-- =============================================================================
-- MAGIC LINKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
--> statement-breakpoint

-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(20) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    github_repo_id BIGINT NOT NULL,
    github_repo_full_name VARCHAR(255) NOT NULL,
    github_installation_id BIGINT NOT NULL,

    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'analyzing',
        'analysis_failed',
        'pr_pending',
        'pr_closed',
        'active',
        'unsupported'
    )),

    pr_number INTEGER,
    pr_url VARCHAR(500),

    detected_framework VARCHAR(50),
    detected_analytics TEXT[],

    events_this_month BIGINT DEFAULT 0,
    events_month_reset_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_event_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(github_repo_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_github_repo_id ON projects(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
--> statement-breakpoint

-- =============================================================================
-- GITHUB TOKENS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS github_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    installation_id BIGINT NOT NULL,
    installation_access_token TEXT,
    installation_token_expires_at TIMESTAMP WITH TIME ZONE,

    user_access_token TEXT,
    user_refresh_token TEXT,
    user_token_expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_github_tokens_user_id ON github_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_github_tokens_installation_id ON github_tokens(installation_id);
--> statement-breakpoint

-- =============================================================================
-- WAITLIST TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    framework VARCHAR(100),
    github_repo_full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(email, framework)
);
--> statement-breakpoint

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
--> statement-breakpoint

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

CREATE TRIGGER update_github_tokens_updated_at BEFORE UPDATE ON github_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
