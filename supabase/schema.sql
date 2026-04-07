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
  ten_k_time     TEXT     NOT NULL DEFAULT '',
  ten_k_target   TEXT     NOT NULL DEFAULT '60:00',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

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
