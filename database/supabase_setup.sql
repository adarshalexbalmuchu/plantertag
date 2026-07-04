-- SQL script to set up database schema for Palamu Tiger Reserve (PTR) Tree Tracker
-- Safe to re-run on existing databases (idempotent)

-- ============================================================
-- 1. Create tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trees (
  id integer PRIMARY KEY,
  planter_name text NOT NULL,
  species text NOT NULL,
  planted_date date NOT NULL,
  main_photo_url text,
  latitude numeric,
  longitude numeric,
  status text DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Needs Attention', 'Dead')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tree_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id integer REFERENCES public.trees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'visit')),
  photo_url text,
  note text,
  log_latitude numeric,
  log_longitude numeric,
  staff_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- Enforce that every photo log must have a photo_url
  CONSTRAINT photo_requires_url CHECK (type != 'photo' OR photo_url IS NOT NULL)
);

-- One row per authenticated user; drives role-based access control.
-- Auto-provisioned by the on_auth_user_created trigger below (default role: staff).
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Idempotently add columns (safe re-runs on existing DBs)
-- ============================================================

ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS status text DEFAULT 'Healthy';
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

ALTER TABLE public.tree_logs ADD COLUMN IF NOT EXISTS log_latitude numeric;
ALTER TABLE public.tree_logs ADD COLUMN IF NOT EXISTS log_longitude numeric;
ALTER TABLE public.tree_logs ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Trees historically used a manually-assigned id with no sequence, so there was
-- no way to register a new tree without hand-picking an id. Back it with a
-- sequence so future inserts can omit id.
CREATE SEQUENCE IF NOT EXISTS public.trees_id_seq OWNED BY public.trees.id;
SELECT setval('public.trees_id_seq', COALESCE((SELECT MAX(id) FROM public.trees), 0) + 1, false);
ALTER TABLE public.trees ALTER COLUMN id SET DEFAULT nextval('public.trees_id_seq');

-- GPS values from device sensors can glitch; keep obviously-invalid coordinates out.
ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_latitude_range;
ALTER TABLE public.trees ADD CONSTRAINT trees_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_longitude_range;
ALTER TABLE public.trees ADD CONSTRAINT trees_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

ALTER TABLE public.tree_logs DROP CONSTRAINT IF EXISTS tree_logs_latitude_range;
ALTER TABLE public.tree_logs ADD CONSTRAINT tree_logs_latitude_range CHECK (log_latitude IS NULL OR log_latitude BETWEEN -90 AND 90);
ALTER TABLE public.tree_logs DROP CONSTRAINT IF EXISTS tree_logs_longitude_range;
ALTER TABLE public.tree_logs ADD CONSTRAINT tree_logs_longitude_range CHECK (log_longitude IS NULL OR log_longitude BETWEEN -180 AND 180);

-- Composite index matches the actual read pattern (all logs for one tree, newest first).
DROP INDEX IF EXISTS public.tree_logs_tree_id_idx;
CREATE INDEX IF NOT EXISTS tree_logs_tree_created_idx ON public.tree_logs (tree_id, created_at DESC);

-- ============================================================
-- 3. Data integrity fixes  (run on existing databases)
--    Safe to re-run — UPDATE affects 0 rows if already clean
-- ============================================================

-- Fix 1: photo logs that were seeded without a photo_url → demote to visit type
--   (these show as "Growth Photo" in the timeline but have no image, causing blank cards)
UPDATE public.tree_logs
SET type = 'visit'
WHERE type = 'photo' AND photo_url IS NULL;

-- Fix 2: remove placeholder/test URLs (placehold.co) that cause Next.js Image 400 errors
--   Demote these to visit logs so the note is preserved but no broken image renders
UPDATE public.tree_logs
SET type = 'visit', photo_url = NULL
WHERE photo_url LIKE '%placehold.co%';

-- Fix 3: add the constraint to the existing table if it was created without it
ALTER TABLE public.tree_logs
  DROP CONSTRAINT IF EXISTS photo_requires_url;
ALTER TABLE public.tree_logs
  ADD CONSTRAINT photo_requires_url
  CHECK (type != 'photo' OR photo_url IS NOT NULL);

-- ============================================================
-- 4. Roles: profiles table, auto-provisioning, is_admin() helper
-- ============================================================

-- SECURITY DEFINER + fixed search_path: reads profiles regardless of the
-- calling role's RLS grants, and is immune to search_path hijacking.
-- Safe from recursive-RLS issues because it bypasses RLS on profiles itself.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any users created before this trigger existed.
INSERT INTO public.profiles (id, email, display_name)
SELECT id, email, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Server-stamped audit fields
--    Client-supplied staff_name / created_by / updated_by are never trusted —
--    the DB overwrites them from the request's own JWT, closing the
--    "any authenticated caller can claim to be anyone" gap.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_tree_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trees_audit_fields ON public.trees;
CREATE TRIGGER trees_audit_fields
  BEFORE INSERT OR UPDATE ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.set_tree_audit_fields();

CREATE OR REPLACE FUNCTION public.set_tree_log_author()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_by := auth.uid();
  NEW.staff_name := COALESCE(auth.jwt() ->> 'email', 'Unknown Staff');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tree_logs_set_author ON public.tree_logs;
CREATE TRIGGER tree_logs_set_author
  BEFORE INSERT ON public.tree_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_tree_log_author();

-- ============================================================
-- 6. Atomic write RPCs
--    Each function does its log-insert + tree-status-update (or detail edit)
--    inside a single transaction, so a mid-write failure can no longer leave
--    a log recorded without its status update (or vice versa).
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_tree_visit(
  p_tree_id integer,
  p_status text,
  p_note text DEFAULT NULL,
  p_created_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.tree_logs (tree_id, type, note, created_at)
  VALUES (p_tree_id, 'visit', p_note, COALESCE(p_created_at, now()));

  UPDATE public.trees SET status = p_status WHERE id = p_tree_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_tree_visit(integer, text, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_tree_photo(
  p_tree_id integer,
  p_status text,
  p_photo_url text,
  p_note text DEFAULT NULL,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_created_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_photo_url IS NULL THEN
    RAISE EXCEPTION 'photo_url is required for photo logs';
  END IF;

  INSERT INTO public.tree_logs (tree_id, type, photo_url, note, log_latitude, log_longitude, created_at)
  VALUES (p_tree_id, 'photo', p_photo_url, p_note, p_lat, p_lng, COALESCE(p_created_at, now()));

  UPDATE public.trees SET status = p_status WHERE id = p_tree_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_tree_photo(integer, text, text, text, numeric, numeric, timestamptz) TO authenticated;

-- Editing core tree identity (not just logging a visit) is an admin action —
-- matches the role split the README already documented but never enforced.
CREATE OR REPLACE FUNCTION public.update_tree_details(
  p_tree_id integer,
  p_planter_name text,
  p_species text,
  p_planted_date date,
  p_location text,
  p_main_photo_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to edit tree details';
  END IF;

  UPDATE public.trees
  SET planter_name = p_planter_name,
      species = p_species,
      planted_date = p_planted_date,
      location = p_location,
      main_photo_url = COALESCE(p_main_photo_url, main_photo_url)
  WHERE id = p_tree_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_tree_details(integer, text, text, date, text, text) TO authenticated;

-- ============================================================
-- 7. Dashboard aggregation view
--    Pre-aggregates visit/photo counts and last-activity per tree in SQL so
--    the admin dashboard no longer has to download the entire tree_logs
--    table to the browser just to compute counters — this is the part of
--    the app whose payload grows unbounded as logs accumulate.
-- ============================================================

CREATE OR REPLACE VIEW public.tree_dashboard_view AS
SELECT
  t.*,
  COALESCE(v.visit_count, 0) AS total_visits,
  COALESCE(p.photo_count, 0) AS total_photos,
  GREATEST(v.last_visit, p.last_photo) AS last_activity_at
FROM public.trees t
LEFT JOIN (
  SELECT tree_id, count(*) AS visit_count, max(created_at) AS last_visit
  FROM public.tree_logs WHERE type = 'visit' GROUP BY tree_id
) v ON v.tree_id = t.id
LEFT JOIN (
  SELECT tree_id, count(*) AS photo_count, max(created_at) AS last_photo
  FROM public.tree_logs WHERE type = 'photo' GROUP BY tree_id
) p ON p.tree_id = t.id;

GRANT SELECT ON public.tree_dashboard_view TO anon, authenticated;

-- ============================================================
-- 8. Row Level Security
-- ============================================================

ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS Policies
-- ============================================================

DROP POLICY IF EXISTS "Allow public read trees" ON public.trees;
DROP POLICY IF EXISTS "Allow authenticated insert trees" ON public.trees;
DROP POLICY IF EXISTS "Allow authenticated update trees" ON public.trees;
DROP POLICY IF EXISTS "Allow admin insert trees" ON public.trees;
DROP POLICY IF EXISTS "Allow admin update trees" ON public.trees;
DROP POLICY IF EXISTS "Allow public read tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Allow authenticated insert tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Allow authenticated update tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Allow admin insert tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Allow owner or admin update tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Trees: anyone can read (public QR scan); mutations go through the RPCs
-- above (SECURITY DEFINER, bypass RLS) or, for direct table access, admins only.
CREATE POLICY "Allow public read trees" ON public.trees
  FOR SELECT USING (true);

CREATE POLICY "Allow admin insert trees" ON public.trees
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin update trees" ON public.trees
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tree logs: anyone can read; direct writes (outside the RPCs) are admin-only.
-- Staff log visits/photos exclusively through log_tree_visit / log_tree_photo.
CREATE POLICY "Allow public read tree_logs" ON public.tree_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow admin insert tree_logs" ON public.tree_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Allow owner or admin update tree_logs" ON public.tree_logs
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- Profiles: users can see their own row; admins can see everyone's (needed to
-- manage staff). is_admin() itself bypasses this via SECURITY DEFINER.
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- ============================================================
-- 10. Storage bucket: tree-photos
-- ============================================================

-- file_size_limit/allowed_mime_types cap uploads server-side — previously
-- only the client's canvas compression limited size, which a direct API
-- call could bypass entirely.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tree-photos', 'tree-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow public read tree-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload tree-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete tree-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner or admin delete tree-photos" ON storage.objects;

CREATE POLICY "Allow public read tree-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tree-photos');

CREATE POLICY "Allow authenticated upload tree-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tree-photos');

-- Only the uploader (or an admin) can delete a photo — previously any
-- authenticated staff account could delete any file in the shared bucket.
CREATE POLICY "Allow owner or admin delete tree-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tree-photos' AND (owner = auth.uid() OR public.is_admin()));

-- ============================================================
-- 11. Seed 50 Trees  (ON CONFLICT DO NOTHING — safe to re-run)
-- ============================================================

INSERT INTO public.trees (id, planter_name, species, planted_date, main_photo_url, latitude, longitude, status) VALUES
(1,  'Birsa Oraon',     'Sal (Shorea robusta)',           '2026-06-25', '/demo/tree_mature.png',  23.85412, 84.12345, 'Healthy'),
(2,  'Karmi Munda',     'Mahua (Madhuca longifolia)',     '2026-06-25', '/demo/tree_mature.png',  23.86125, 84.13560, 'Healthy'),
(3,  'Sukhram Ho',      'Arjun (Terminalia arjuna)',      '2026-06-25', '/demo/tree_growing.png', 23.84234, 84.11234, 'Healthy'),
(4,  'Phulo Soren',     'Neem (Azadirachta indica)',      '2026-06-25', '/demo/tree_sapling.png', 23.87112, 84.14876, 'Healthy'),
(5,  'Lakhiram Tudu',   'Teak (Tectona grandis)',         '2026-06-25', '/demo/tree_growing.png', 23.85900, 84.12990, 'Healthy'),
(6,  'Ramesh Oraon',    'Semal (Bombax ceiba)',           '2026-03-10', '/demo/tree_mature.png',  23.85500, 84.12500, 'Healthy'),
(7,  'Sita Devi',       'Jamun (Syzygium cumini)',        '2026-03-12', '/demo/tree_growing.png', 23.85610, 84.12610, 'Healthy'),
(8,  'Sunil Munda',     'Bel (Aegle marmelos)',           '2026-03-15', '/demo/tree_sapling.png', 23.85720, 84.12720, 'Needs Attention'),
(9,  'Gita Kisku',      'Karanj (Millettia pinnata)',     '2026-03-18', '/demo/tree_growing.png', 23.85830, 84.12830, 'Healthy'),
(10, 'Anil Hembrom',    'Bamboo (Dendrocalamus strictus)','2026-03-20', '/demo/tree_mature.png',  23.85940, 84.12940, 'Healthy'),
(11, 'Rajesh Oraon',    'Sal (Shorea robusta)',           '2026-04-01', '/demo/tree_growing.png', 23.86050, 84.13050, 'Healthy'),
(12, 'Meena Munda',     'Mahua (Madhuca longifolia)',     '2026-04-03', '/demo/tree_mature.png',  23.86160, 84.13160, 'Healthy'),
(13, 'Suman Ho',        'Arjun (Terminalia arjuna)',      '2026-04-05', '/demo/tree_sapling.png', 23.86270, 84.13270, 'Healthy'),
(14, 'Sanjay Soren',    'Neem (Azadirachta indica)',      '2026-04-08', '/demo/tree_growing.png', 23.86380, 84.13380, 'Healthy'),
(15, 'Asha Tudu',       'Teak (Tectona grandis)',         '2026-04-10', '/demo/tree_mature.png',  23.86490, 84.13490, 'Healthy'),
(16, 'Vijay Oraon',     'Semal (Bombax ceiba)',           '2026-04-15', '/demo/tree_sapling.png', 23.86600, 84.13600, 'Dead'),
(17, 'Puja Devi',       'Jamun (Syzygium cumini)',        '2026-04-18', '/demo/tree_growing.png', 23.86710, 84.13710, 'Healthy'),
(18, 'Santosh Munda',   'Bel (Aegle marmelos)',           '2026-04-20', '/demo/tree_mature.png',  23.86820, 84.13820, 'Healthy'),
(19, 'Sunita Kisku',    'Karanj (Millettia pinnata)',     '2026-04-22', '/demo/tree_sapling.png', 23.86930, 84.13930, 'Healthy'),
(20, 'Amit Hembrom',    'Bamboo (Dendrocalamus strictus)','2026-04-25', '/demo/tree_growing.png', 23.87040, 84.14040, 'Healthy'),
(21, 'Kiran Oraon',     'Sal (Shorea robusta)',           '2026-05-01', '/demo/tree_mature.png',  23.87150, 84.14150, 'Healthy'),
(22, 'Sanjay Munda',    'Mahua (Madhuca longifolia)',     '2026-05-03', '/demo/tree_growing.png', 23.87260, 84.14260, 'Needs Attention'),
(23, 'Jyoti Ho',        'Arjun (Terminalia arjuna)',      '2026-05-05', '/demo/tree_sapling.png', 23.87370, 84.14370, 'Healthy'),
(24, 'Rakesh Soren',    'Neem (Azadirachta indica)',      '2026-05-08', '/demo/tree_growing.png', 23.87480, 84.14480, 'Healthy'),
(25, 'Priyanka Tudu',   'Teak (Tectona grandis)',         '2026-05-10', '/demo/tree_mature.png',  23.87590, 84.14590, 'Healthy'),
(26, 'Suresh Oraon',    'Semal (Bombax ceiba)',           '2026-05-12', '/demo/tree_sapling.png', 23.87700, 84.14700, 'Healthy'),
(27, 'Kavita Devi',     'Jamun (Syzygium cumini)',        '2026-05-15', '/demo/tree_growing.png', 23.87810, 84.14810, 'Healthy'),
(28, 'Manoj Munda',     'Bel (Aegle marmelos)',           '2026-05-18', '/demo/tree_mature.png',  23.87920, 84.14920, 'Healthy'),
(29, 'Babita Kisku',    'Karanj (Millettia pinnata)',     '2026-05-20', '/demo/tree_sapling.png', 23.88030, 84.15030, 'Healthy'),
(30, 'Deepak Hembrom',  'Bamboo (Dendrocalamus strictus)','2026-05-22', '/demo/tree_growing.png', 23.88140, 84.15140, 'Healthy'),
(31, 'Lalita Oraon',    'Sal (Shorea robusta)',           '2026-05-25', '/demo/tree_mature.png',  23.88250, 84.15250, 'Healthy'),
(32, 'Vikram Munda',    'Mahua (Madhuca longifolia)',     '2026-05-28', '/demo/tree_growing.png', 23.88360, 84.15360, 'Healthy'),
(33, 'Rupa Ho',         'Arjun (Terminalia arjuna)',      '2026-06-01', '/demo/tree_sapling.png', 23.88470, 84.15470, 'Healthy'),
(34, 'Ajay Soren',      'Neem (Azadirachta indica)',      '2026-06-03', '/demo/tree_growing.png', 23.88580, 84.15580, 'Healthy'),
(35, 'Nisha Tudu',      'Teak (Tectona grandis)',         '2026-06-05', '/demo/tree_mature.png',  23.88690, 84.15690, 'Healthy'),
(36, 'Manish Oraon',    'Semal (Bombax ceiba)',           '2026-06-08', '/demo/tree_sapling.png', 23.88800, 84.15800, 'Healthy'),
(37, 'Soni Devi',       'Jamun (Syzygium cumini)',        '2026-06-10', '/demo/tree_growing.png', 23.88910, 84.15910, 'Healthy'),
(38, 'Rajendra Munda',  'Bel (Aegle marmelos)',           '2026-06-12', '/demo/tree_mature.png',  23.89020, 84.16020, 'Needs Attention'),
(39, 'Poonam Kisku',    'Karanj (Millettia pinnata)',     '2026-06-15', '/demo/tree_sapling.png', 23.89130, 84.16130, 'Healthy'),
(40, 'Vinod Hembrom',   'Bamboo (Dendrocalamus strictus)','2026-06-18', '/demo/tree_growing.png', 23.89240, 84.16240, 'Healthy'),
(41, 'Aarti Oraon',     'Sal (Shorea robusta)',           '2026-06-20', '/demo/tree_mature.png',  23.89350, 84.16350, 'Healthy'),
(42, 'Dinesh Munda',    'Mahua (Madhuca longifolia)',     '2026-06-22', '/demo/tree_growing.png', 23.89460, 84.16460, 'Healthy'),
(43, 'Reena Ho',        'Arjun (Terminalia arjuna)',      '2026-06-23', '/demo/tree_sapling.png', 23.89570, 84.16570, 'Healthy'),
(44, 'Subhash Soren',   'Neem (Azadirachta indica)',      '2026-06-24', '/demo/tree_growing.png', 23.89680, 84.16680, 'Healthy'),
(45, 'Sapna Tudu',      'Teak (Tectona grandis)',         '2026-06-25', '/demo/tree_mature.png',  23.89790, 84.16790, 'Healthy'),
(46, 'Alok Oraon',      'Semal (Bombax ceiba)',           '2026-06-25', '/demo/tree_sapling.png', 23.89900, 84.16900, 'Healthy'),
(47, 'Kusum Devi',      'Jamun (Syzygium cumini)',        '2026-06-25', '/demo/tree_growing.png', 23.90010, 84.17010, 'Healthy'),
(48, 'Pankaj Munda',    'Bel (Aegle marmelos)',           '2026-06-25', '/demo/tree_mature.png',  23.90120, 84.17120, 'Healthy'),
(49, 'Champa Kisku',    'Karanj (Millettia pinnata)',     '2026-06-25', '/demo/tree_sapling.png', 23.90230, 84.17230, 'Healthy'),
(50, 'Sanjay Hembrom',  'Bamboo (Dendrocalamus strictus)','2026-06-25', '/demo/tree_growing.png', 23.90340, 84.17340, 'Healthy')
ON CONFLICT (id) DO NOTHING;

-- Backfill location on the seed rows (matches the mock-mode defaults in mockData.ts)
UPDATE public.trees SET location = 'Qila Grassland' WHERE id = 1 AND location IS NULL;
UPDATE public.trees SET location = 'Kasturba School, PTR' WHERE id != 1 AND location IS NULL;

-- ============================================================
-- 12. Seed sample logs for Trees 1 & 2
--    Photo logs now include photo_url to satisfy the constraint
-- ============================================================

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 1, 'visit', 'Initial base fertilization complete.', 'Ramesh Kerketta', now() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND note LIKE '%fertilization%');

INSERT INTO public.tree_logs (tree_id, type, photo_url, note, staff_name, created_at)
SELECT 1, 'photo', '/demo/tree_sapling.png', 'Planting day snapshot.', 'Sunita Tigga', now() - INTERVAL '1 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND type = 'photo');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 1, 'visit', 'Watered in the evening, soil moisture verified.', 'Ajay Lakra', now() - INTERVAL '12 hours'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND note LIKE '%soil moisture%');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 1, 'visit', 'Checked trunk health. Clear.', 'Poonam Minz', now()
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND note LIKE '%trunk health%');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 2, 'visit', 'Soil aerated and watered.', 'Sunita Tigga', now() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 2 AND note LIKE '%aerated%');

INSERT INTO public.tree_logs (tree_id, type, photo_url, note, staff_name, created_at)
SELECT 2, 'photo', '/demo/tree_growing.png', 'Initial health checkup photo.', 'Ajay Lakra', now() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 2 AND type = 'photo');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 2, 'visit', 'Evening checking. Watering complete.', 'Deepak Toppo', now() - INTERVAL '1 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 2 AND note LIKE '%Evening checking%');
