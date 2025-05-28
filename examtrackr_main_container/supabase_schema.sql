-- ExamTrackr Supabase SQL Schema

-- Users are managed by Supabase Auth and stored in the "auth.users" table, which uses uuid as their primary key (id).

-- ============ Exams Table ============
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  date date NOT NULL,
  -- Allow direct grade/reflection fields for simple queries/UI, but see below for grades_reflections log
  grade text NULL,
  reflection text NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for per-user exam fetching/sorting
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams (user_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON public.exams (date);

-- ============ Milestones Table ============
CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'done')), -- restrict status values
  created_at timestamptz DEFAULT now()
);

-- Indexes for filtering and fast lookup
CREATE INDEX IF NOT EXISTS idx_milestones_exam_id ON public.milestones (exam_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON public.milestones (user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON public.milestones (target_date);

-- ============ Grades & Reflections Table ============
-- Allows users to log multiple grade/reflection entries per exam for history, or you can use only one record per (user_id, exam_id).
CREATE TABLE IF NOT EXISTS public.grades_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade text NOT NULL,
  reflection_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (exam_id, user_id, grade, created_at)
);

-- Index for querying all grades/reflections for user or exam
CREATE INDEX IF NOT EXISTS idx_grades_exam_id ON public.grades_reflections (exam_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON public.grades_reflections (user_id);

-- ============ Notes ============
-- All user_id foreign keys reference 'auth.users(id)' from Supabase Auth.
-- 'exams.grade' and 'exams.reflection' columns are for the current/latest entry for quick dashboard access.
-- Full grade history is stored in grades_reflections (optional for this simple app).
-- Sorting/filtering are done at the app/query layer; relevant indexes provided.

-- ============ Extensions ============
-- Enable uuid generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
