-- =====================================================================
-- SUPABASE SCHEMA DDL - PALAMAU TIGER RESERVE (PTR) TREE TRACKER
-- =====================================================================

-- 1. Create trees table
CREATE TABLE IF NOT EXISTS public.trees (
    id SERIAL PRIMARY KEY,
    planter_name TEXT NOT NULL,
    species TEXT NOT NULL,
    planted_date DATE NOT NULL,
    main_photo_url TEXT NOT NULL,
    latitude NUMERIC(9, 6) NULL,
    longitude NUMERIC(9, 6) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create tree_logs table
CREATE TABLE IF NOT EXISTS public.tree_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id INT NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('photo', 'visit')),
    photo_url TEXT NULL,
    note TEXT NULL,
    staff_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on tree_id for faster lookup
CREATE INDEX IF NOT EXISTS idx_tree_logs_tree_id ON public.tree_logs(tree_id);

-- 3. Row-Level Security (RLS) Configuration

-- Enable RLS
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_logs ENABLE ROW LEVEL SECURITY;

-- Trees policies
-- SELECT: Anyone can read (public)
CREATE POLICY "Allow public read trees" 
ON public.trees FOR SELECT 
USING (true);

-- WRITE (INSERT, UPDATE, DELETE): Only authenticated users with user_metadata role = 'admin'
CREATE POLICY "Allow admin write trees" 
ON public.trees FOR ALL 
TO authenticated 
USING (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin')
WITH CHECK (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin');

-- Tree Logs policies
-- SELECT: Anyone can read (public)
CREATE POLICY "Allow public read tree_logs" 
ON public.tree_logs FOR SELECT 
USING (true);

-- INSERT: Only authenticated users (staff) can insert
CREATE POLICY "Allow authenticated insert tree_logs" 
ON public.tree_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- DELETE/UPDATE: Only admin can delete or edit logs
CREATE POLICY "Allow admin write tree_logs" 
ON public.tree_logs FOR ALL 
TO authenticated 
USING (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin')
WITH CHECK (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin');


-- 4. Storage Bucket Setup for growth photos
-- Note: Create a bucket named 'growth_photos' in the Supabase Storage dashboard, and set it to public.
-- Below are the SQL commands to configure the storage policies.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('growth_photos', 'growth_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Read Policy: Allow anyone to view objects
CREATE POLICY "Allow public read growth_photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'growth_photos');

-- Storage Insert Policy: Allow authenticated staff to upload
CREATE POLICY "Allow authenticated insert growth_photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'growth_photos');

-- Storage Delete Policy: Allow admins to delete
CREATE POLICY "Allow admin delete growth_photos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'growth_photos' AND COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin');


-- =====================================================================
-- SEED DATA (50 Trees + Sample Logs)
-- =====================================================================

-- Clean old seed data if present
TRUNCATE TABLE public.tree_logs CASCADE;
TRUNCATE TABLE public.trees CASCADE;

-- Insert 50 trees with ID 1 to 50
-- We use realistic Palamau Tiger Reserve species, locations, and planter names.
-- Coordinates are in the Palamau Tiger Reserve range: Lat 23.80 - 23.90, Long 84.10 - 84.30.
INSERT INTO public.trees (id, planter_name, species, planted_date, main_photo_url, latitude, longitude) VALUES
(1, 'Kumar Ashish, IFS', 'Sal (Shorea robusta)', '2025-06-15', '/seed/tree_mature.png', 23.854120, 84.123450),
(2, 'Dr. S. K. Verma', 'Teak (Tectona grandis)', '2025-06-20', '/seed/tree_mature.png', 23.861250, 84.135600),
(3, 'Ramesh Minz (Forest Guard)', 'Mahua (Madhuca longifolia)', '2025-07-02', '/seed/tree_growing.png', 23.842340, 84.112340),
(4, 'Sunita Oraon', 'Arjun (Terminalia arjuna)', '2025-07-10', '/seed/tree_sapling.png', 23.871120, 84.148760),
(5, 'Deepak Kujur', 'Neem (Azadirachta indica)', '2025-07-15', '/seed/tree_growing.png', 23.859000, 84.129900),
(6, 'Priya Soren', 'Bamboo (Dendrocalamus strictus)', '2025-08-01', '/seed/tree_growing.png', 23.834450, 84.105430),
(7, 'Anoop Lakra', 'Karanj (Millettia pinnata)', '2025-08-10', '/seed/tree_sapling.png', 23.865430, 84.152310),
(8, 'Manish Tiwari, IFS', 'Palash (Butea monosperma)', '2025-08-12', '/seed/tree_growing.png', 23.882100, 84.161100),
(9, 'Sanjay Munda', 'Sissoo (Dalbergia sissoo)', '2025-08-20', '/seed/tree_mature.png', 23.849980, 84.119980),
(10, 'Asha Devi', 'Amla (Phyllanthus emblica)', '2025-09-01', '/seed/tree_sapling.png', 23.857650, 84.132100),
(11, 'Rajesh Toppo', 'Sal (Shorea robusta)', '2025-09-05', '/seed/tree_growing.png', 23.863100, 84.144400),
(12, 'Pradip Yadav', 'Teak (Tectona grandis)', '2025-09-10', '/seed/tree_mature.png', 23.841100, 84.109800),
(13, 'Sita Kumari', 'Mahua (Madhuca longifolia)', '2025-09-15', '/seed/tree_sapling.png', 23.873200, 84.156500),
(14, 'Vijay Bhargav', 'Arjun (Terminalia arjuna)', '2025-10-01', '/seed/tree_growing.png', 23.851230, 84.124560),
(15, 'Kiran Singh', 'Neem (Azadirachta indica)', '2025-10-05', '/seed/tree_mature.png', 23.868700, 84.139800),
(16, 'Suresh Bhagat', 'Bamboo (Dendrocalamus strictus)', '2025-10-10', '/seed/tree_growing.png', 23.839800, 84.114300),
(17, 'Anjali Hembrom', 'Karanj (Millettia pinnata)', '2025-10-20', '/seed/tree_sapling.png', 23.876540, 84.162340),
(18, 'Nitin Tirkey', 'Palash (Butea monosperma)', '2025-11-01', '/seed/tree_growing.png', 23.852400, 84.127800),
(19, 'Suman Oraon', 'Sissoo (Dalbergia sissoo)', '2025-11-05', '/seed/tree_mature.png', 23.861110, 84.131110),
(20, 'Vikram Rathore', 'Amla (Phyllanthus emblica)', '2025-11-12', '/seed/tree_sapling.png', 23.844320, 84.116540),
(21, 'Renu Devi', 'Sal (Shorea robusta)', '2025-11-18', '/seed/tree_growing.png', 23.878900, 84.159900),
(22, 'Gopal Kisku', 'Teak (Tectona grandis)', '2025-11-25', '/seed/tree_mature.png', 23.850100, 84.121200),
(23, 'Poonam Linda', 'Mahua (Madhuca longifolia)', '2025-12-01', '/seed/tree_sapling.png', 23.869900, 84.143200),
(24, 'Ashok Bakhla', 'Arjun (Terminalia arjuna)', '2025-12-05', '/seed/tree_growing.png', 23.841900, 84.108900),
(25, 'Preeti Tigga', 'Neem (Azadirachta indica)', '2025-12-10', '/seed/tree_mature.png', 23.875400, 84.151200),
(26, 'Sanjeev Mundu', 'Bamboo (Dendrocalamus strictus)', '2025-12-15', '/seed/tree_growing.png', 23.853200, 84.126500),
(27, 'Meena Bara', 'Karanj (Millettia pinnata)', '2026-01-02', '/seed/tree_sapling.png', 23.860120, 84.137890),
(28, 'Umesh Oraon', 'Palash (Butea monosperma)', '2026-01-10', '/seed/tree_growing.png', 23.847650, 84.113210),
(29, 'Jyoti Xalxo', 'Sissoo (Dalbergia sissoo)', '2026-01-15', '/seed/tree_mature.png', 23.870500, 84.149900),
(30, 'Arvind Ekka', 'Amla (Phyllanthus emblica)', '2026-01-20', '/seed/tree_sapling.png', 23.855400, 84.128700),
(31, 'Pinki Kujur', 'Sal (Shorea robusta)', '2026-02-01', '/seed/tree_growing.png', 23.862220, 84.135550),
(32, 'Devendra Singh', 'Teak (Tectona grandis)', '2026-02-05', '/seed/tree_mature.png', 23.840900, 84.107700),
(33, 'Mamta Soren', 'Mahua (Madhuca longifolia)', '2026-02-12', '/seed/tree_sapling.png', 23.879990, 84.167770),
(34, 'Rajiv Beck', 'Arjun (Terminalia arjuna)', '2026-02-18', '/seed/tree_growing.png', 23.851900, 84.123210),
(35, 'Nisha Devi', 'Neem (Azadirachta indica)', '2026-03-01', '/seed/tree_mature.png', 23.867700, 84.141200),
(36, 'Harish Minz', 'Bamboo (Dendrocalamus strictus)', '2026-03-05', '/seed/tree_growing.png', 23.843430, 84.118180),
(37, 'Pushpa Hembrom', 'Karanj (Millettia pinnata)', '2026-03-10', '/seed/tree_sapling.png', 23.872340, 84.153450),
(38, 'Manoj Tigga', 'Palash (Butea monosperma)', '2026-03-20', '/seed/tree_growing.png', 23.856540, 84.130980),
(39, 'Kavita Linda', 'Sissoo (Dalbergia sissoo)', '2026-04-02', '/seed/tree_mature.png', 23.864320, 84.136540),
(40, 'Rakesh Bara', 'Amla (Phyllanthus emblica)', '2026-04-08', '/seed/tree_sapling.png', 23.846540, 84.110120),
(41, 'Reena Xalxo', 'Sal (Shorea robusta)', '2026-04-15', '/seed/tree_growing.png', 23.871100, 84.148800),
(42, 'Dilip Kujur', 'Teak (Tectona grandis)', '2026-04-20', '/seed/tree_mature.png', 23.852100, 84.125400),
(43, 'Savitri Oraon', 'Mahua (Madhuca longifolia)', '2026-05-01', '/seed/tree_sapling.png', 23.866500, 84.142100),
(44, 'Abhishek Munda', 'Arjun (Terminalia arjuna)', '2026-05-05', '/seed/tree_growing.png', 23.838900, 84.106500),
(45, 'Rita Devi', 'Neem (Azadirachta indica)', '2026-05-12', '/seed/tree_mature.png', 23.874300, 84.158900),
(46, 'Sunil Beck', 'Bamboo (Dendrocalamus strictus)', '2026-05-20', '/seed/tree_growing.png', 23.854900, 84.129990),
(47, 'Anita Toppo', 'Karanj (Millettia pinnata)', '2026-06-01', '/seed/tree_sapling.png', 23.861990, 84.138880),
(48, 'Sanjay Singh', 'Palash (Butea monosperma)', '2026-06-05', '/seed/tree_growing.png', 23.845450, 84.115450),
(49, 'Bina Kumari', 'Sissoo (Dalbergia sissoo)', '2026-06-10', '/seed/tree_mature.png', 23.877700, 84.165400),
(50, 'Ranjit Oraon', 'Amla (Phyllanthus emblica)', '2026-06-15', '/seed/tree_sapling.png', 23.858900, 84.133200);

-- Make serial id sequence restart at 51
SELECT setval('public.trees_id_seq', 50, true);

-- Add sample logs for Tree 1 (mature Sal) and Tree 3 (growing Mahua) and Tree 4 (sapling Arjun)
INSERT INTO public.tree_logs (id, tree_id, type, photo_url, note, staff_name, created_at) VALUES
-- Tree 1 logs
(gen_random_uuid(), 1, 'visit', NULL, 'Initial inspection of the mature Sal tree. Tree is in excellent condition.', 'Officer Ramesh', '2025-06-16 10:00:00+00'),
(gen_random_uuid(), 1, 'visit', NULL, 'Standard watering and soil fertilization around the base.', 'Officer Ramesh', '2025-07-20 09:30:00+00'),
(gen_random_uuid(), 1, 'photo', '/seed/tree_tended.png', 'Tended the base, checked leaf canopy for pests. Healthy.', 'Guard Suresh', '2025-10-05 14:15:00+00'),
(gen_random_uuid(), 1, 'visit', NULL, 'Monthly checkup. Soil aerated.', 'Guard Suresh', '2026-03-12 11:00:00+00'),

-- Tree 3 logs
(gen_random_uuid(), 3, 'visit', NULL, 'Checked sapling growth. Soil is rich.', 'Officer Ramesh', '2025-07-05 08:00:00+00'),
(gen_random_uuid(), 3, 'photo', '/seed/tree_growing.png', 'Photographed growth progression. Significant height increase.', 'Guard Suresh', '2025-11-20 15:45:00+00'),
(gen_random_uuid(), 3, 'visit', NULL, 'Watered and cleared weeds around the trunk.', 'Guard Suresh', '2026-02-15 10:30:00+00'),

-- Tree 4 logs
(gen_random_uuid(), 4, 'visit', NULL, 'Initial watering after planting.', 'Officer Ramesh', '2025-07-11 07:30:00+00'),
(gen_random_uuid(), 4, 'photo', '/seed/tree_sapling.png', 'Photo of newly planted sapling.', 'Guard Suresh', '2025-07-12 16:00:00+00'),
(gen_random_uuid(), 4, 'visit', NULL, 'Watered and checked soil moisture levels.', 'Officer Ramesh', '2025-08-15 08:30:00+00');
