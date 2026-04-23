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
  show_performance BOOLEAN NOT NULL DEFAULT TRUE,
  show_methodology BOOLEAN NOT NULL DEFAULT TRUE,
  run_goals      JSONB    NOT NULL DEFAULT '[]',
  run_warmup_exercises JSONB NOT NULL DEFAULT '[]',
  liked_plans    JSONB    NOT NULL DEFAULT '[]',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_config ADD COLUMN IF NOT EXISTS active_gym_session JSONB DEFAULT NULL;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS active_run_session JSONB DEFAULT NULL;

ALTER TABLE user_config ADD COLUMN IF NOT EXISTS gym_goals JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS gym_rules JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS run_weeks JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS run_types JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS ten_k_target TEXT NOT NULL DEFAULT '60:00';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS show_performance BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS liked_plans JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS show_methodology BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS run_goals JSONB NOT NULL DEFAULT '[]';
ALTER TABLE user_config ADD COLUMN IF NOT EXISTS run_warmup_exercises JSONB NOT NULL DEFAULT '[]';

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

-- ── toggle_plan_like RPC ──────────────────────────────────────
-- Atomically increment or decrement the likes counter on any
-- community plan, bypassing RLS so any authenticated user can
-- like/unlike plans they don't own.

CREATE OR REPLACE FUNCTION toggle_plan_like(plan_id UUID, delta INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_likes INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF delta NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'delta must be -1 or 1';
  END IF;

  UPDATE community_plans
    SET likes = GREATEST(0, likes + delta)
    WHERE id = plan_id
    RETURNING likes INTO new_likes;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  RETURN new_likes;
END;
$$;

-- ── delete_user RPC ──────────────────────────────────────────
-- Allows a user to delete their own account from auth.users.
-- Since tables have ON DELETE CASCADE, this wipes everything.
-- Run this in Supabase SQL editor to enable true account deletion.

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- COACHING MARKETPLACE SCHEMA
-- ══════════════════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────────────────────
-- Public user display info so coaches can see user names.
-- Populated by the client on first login/registration.

CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT NOT NULL DEFAULT ''
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_write"   ON profiles FOR ALL   USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── coaches ───────────────────────────────────────────────────
-- One row per coach. A coach is a regular auth user who has
-- created a coach profile.

CREATE TABLE IF NOT EXISTS coaches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  bio             TEXT NOT NULL DEFAULT '',
  specializations TEXT[] NOT NULL DEFAULT '{}',
  certifications  TEXT[] NOT NULL DEFAULT '{}',
  price_per_month NUMERIC(10,2) NOT NULL DEFAULT 0,
  avatar_url      TEXT NOT NULL DEFAULT '',
  is_available    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaches_public_read"  ON coaches FOR SELECT USING (true);
CREATE POLICY "coaches_own_insert"   ON coaches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coaches_own_update"   ON coaches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coaches_own_delete"   ON coaches FOR DELETE USING (auth.uid() = user_id);

-- ── coach_requests ────────────────────────────────────────────
-- Hire requests from users to coaches.

CREATE TABLE IF NOT EXISTS coach_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_id     UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'accepted' | 'declined'
  message      TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, coach_id)
);

ALTER TABLE coach_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests_user_insert" ON coach_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "requests_participant_read" ON coach_requests FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT user_id FROM coaches WHERE id = coach_id)
  );

CREATE POLICY "requests_coach_update" ON coach_requests FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM coaches WHERE id = coach_id));

-- ── messages ──────────────────────────────────────────────────
-- Chat messages between user and coach within an accepted request.
-- message_type: 'text' | 'payment_request'

CREATE TABLE IF NOT EXISTS messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID REFERENCES coach_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content            TEXT NOT NULL DEFAULT '',
  message_type       TEXT NOT NULL DEFAULT 'text',
  payment_request_id UUID DEFAULT NULL,
  created_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_participant_read" ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = (SELECT cr.user_id FROM coach_requests cr WHERE cr.id = request_id) OR
    auth.uid() = (SELECT c.user_id FROM coaches c
                  JOIN coach_requests cr ON cr.coach_id = c.id
                  WHERE cr.id = request_id)
  );

CREATE POLICY "messages_participant_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- ── payment_requests ──────────────────────────────────────────
-- Synthetic invoices sent by coaches through chat.
-- platform_fee (15%) and coach_payout (85%) are computed columns.

CREATE TABLE IF NOT EXISTS payment_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID REFERENCES coach_requests(id) ON DELETE CASCADE NOT NULL,
  coach_id     UUID REFERENCES coaches(id) NOT NULL,
  user_id      UUID REFERENCES auth.users(id) NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(amount * 0.15, 2)) STORED,
  coach_payout NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(amount * 0.85, 2)) STORED,
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'paid'
  paid_at      TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_participant_read" ON payment_requests FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT user_id FROM coaches WHERE id = coach_id)
  );

CREATE POLICY "payments_coach_insert" ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM coaches WHERE id = coach_id));

CREATE POLICY "payments_user_pay" ON payment_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- ── workout_access ────────────────────────────────────────────
-- Granted automatically by trigger when user pays a payment_request.
-- Allows the coach read access to that user's workout history
-- and write access to their future plans.

CREATE TABLE IF NOT EXISTS workout_access (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES coach_requests(id) DEFAULT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, user_id)
);

ALTER TABLE workout_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_participant_read" ON workout_access FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT user_id FROM coaches WHERE id = coach_id)
  );

-- ── Trigger: grant workout_access on payment ─────────────────

CREATE OR REPLACE FUNCTION handle_payment_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'pending' THEN
    INSERT INTO workout_access (coach_id, user_id, request_id)
    VALUES (NEW.coach_id, NEW.user_id, NEW.request_id)
    ON CONFLICT (coach_id, user_id) DO NOTHING;
    NEW.paid_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_paid ON payment_requests;
CREATE TRIGGER on_payment_paid
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION handle_payment_paid();

-- ── Extended RLS: coach read access to workout data ──────────
-- Coaches can read workouts/run_sessions for users who have paid.

CREATE POLICY "workouts_coach_read" ON workouts FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM workout_access wa
      JOIN coaches c ON c.id = wa.coach_id
      WHERE wa.user_id = workouts.user_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "run_sessions_coach_read" ON run_sessions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM workout_access wa
      JOIN coaches c ON c.id = wa.coach_id
      WHERE wa.user_id = run_sessions.user_id AND c.user_id = auth.uid()
    )
  );

-- Coaches can also update future workout plans for their paid clients.
CREATE POLICY "user_config_coach_read" ON user_config FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM workout_access wa
      JOIN coaches c ON c.id = wa.coach_id
      WHERE wa.user_id = user_config.user_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "user_config_coach_update" ON user_config FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM workout_access wa
      JOIN coaches c ON c.id = wa.coach_id
      WHERE wa.user_id = user_config.user_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM workout_access wa
      JOIN coaches c ON c.id = wa.coach_id
      WHERE wa.user_id = user_config.user_id AND c.user_id = auth.uid()
    )
  );

-- ── Realtime publication ──────────────────────────────────────
-- These tables back live chat, coach-request status changes, and
-- coach-driven plan edits in the user app.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE coach_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_config;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
