ALTER TABLE users
  ADD COLUMN github_user_id BIGINT UNIQUE,
  ADD COLUMN github_username VARCHAR(39),
  ADD COLUMN github_avatar_url TEXT;

CREATE INDEX idx_users_github_user_id ON users(github_user_id);

