-- Run this entire file in your Supabase SQL editor
-- (Project → SQL Editor → New query → paste → Run)

-- ── user_config ────────────────────────────────────────────────
-- One row per user. All gym + run settings stored as JSONB so the
-- schema never needs changing when the client adds new fields.

CREATE TABLE IF NOT EXISTS user_config (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_days       JSONB    NOT NULL DEFAULT '[]',
  gym_day_count  INT      NOT NULL DEFAULT 5,
  completed      JSONB    NOT NULL DEFAULT '[]',
  lifts          JSONB    NOT NULL DEFAULT '[]',
  gym_goals      JSONB    NOT NULL DEFAULT '[]',
  gym_rules      JSONB    NOT NULL DEFAULT '[]',
  run_week       INT      NOT NULL DEFAULT 0,
  run_weeks      JSONB    NOT NULL DEFAULT '[]',
  run_types      JSONB    NOT NULL DEFAULT '[]',
  run_completed  JSONB    NOT NULL DEFAULT '{}',
  active_gym_session JSONB DEFAULT NULL,
  active_run_session JSONB DEFAULT NULL,
  ten_k_time     TEXT     NOT NULL DEFAULT '',
  ten_k_target   TEXT     NOT NULL DEFAULT '60:00',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_config ADD COLUMN IF NOT EXISTS active_gym_session JSONB DEFAULT NULL;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS active_run_session JSONB DEFAULT NULL;

ALTER TABLE user_config ADD COLUMN IF NOT EXISTS gym_goals JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS gym_rules JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS run_weeks JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS run_types JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS ten_k_target TEXT NOT NULL DEFAULT '60:00';

ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own config"
  ON user_config FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── workouts ───────────────────────────────────────────────────
-- One row per submitted workout session.

CREATE TABLE IF NOT EXISTS workouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  day_num      TEXT,
  day_name     TEXT NOT NULL,
  day_focus    TEXT,
  exercises    JSONB NOT NULL DEFAULT '[]'
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workouts"
  ON workouts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── run_sessions ───────────────────────────────────────────────
-- One row per submitted running session.

CREATE TABLE IF NOT EXISTS run_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  title            TEXT NOT NULL DEFAULT 'Run',
  run_type         TEXT,
  segments         JSONB NOT NULL DEFAULT '[]',
  total_distance   NUMERIC(6,2) DEFAULT 0,
  avg_pace         TEXT DEFAULT '',
  notes            TEXT DEFAULT '',
  duration_seconds INT  DEFAULT 0
);

ALTER TABLE run_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own run sessions"
  ON run_sessions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── community_plans ────────────────────────────────────────────
-- Workout plans created and shared by users.

CREATE TABLE IF NOT EXISTS community_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  plan_type   TEXT NOT NULL DEFAULT 'gym',   -- 'gym' | 'running' | 'hybrid'
  difficulty  TEXT DEFAULT 'intermediate',    -- 'beginner' | 'intermediate' | 'advanced'
  plan_data   JSONB NOT NULL DEFAULT '{}',
  likes       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read community plans
CREATE POLICY "Anyone can read community plans"
  ON community_plans FOR SELECT
  USING (true);

-- Only the author can insert/update/delete their own plans
CREATE POLICY "Users manage own community plans"
  ON community_plans FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
