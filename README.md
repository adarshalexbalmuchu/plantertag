# Palamu Tiger Reserve (PTR) — QR Tree Tracker

A professional, mobile-first QR-based tree tracking web application developed for the Palamu Tiger Reserve (PTR) forest monitoring initiative. 

Scanning a tree's printed QR tag directs users to its public growth log. Staff can sign in to log watering visits and upload growth photos directly using their phone's camera.

---

## 🌲 Features

- **Public Tree Page (`/tree/[id]`)**: Server-rendered for instant loads on weak mobile data. Displays planter, species, date planted, coordinates (with Google Maps link), watering counts, and growth photo history.
- **Staff Portal & Verification (`/login`)**: Secure Supabase email/password authentication.
- **Staff Updates (`/tree/[id]/update`)**: Quick, low-friction mobile forms. The photo upload immediately invokes the phone's native camera (`capture="environment"`).
- **Admin Control Panel (`/admin`)**: Sortable, searchable data-table of all 50 seeded trees. Individual QR code previews and single downloads.
- **Printable QR Sheet (`/admin/print`)**: A print-ready tag layout containing reserve logos, tree species, ID labels, and high-fidelity QR codes sized for sticker or metal tag printing.
- **Seed Data**: Preloaded with 50 realistic trees situated in the Palamu Tiger Reserve GPS bounds and historical watering logs.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 & shadcn/ui components
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage)
- **QR Generation**: `qrcode.react`
- **Utility**: `lucide-react` & `date-fns`

---

## ⚙️ Setup & Installation

### 1. Database Configuration (Supabase)
1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project.
3. Copy the contents of the [`supabase_schema.sql`](file:///c:/Users/avish/Desktop/PLANTER%20TAGS/supabase_schema.sql) file and execute it. This creates the tables, indexes, RLS policies, storage bucket configurations, and seeds the 50 trees.

### 2. Configure Environment Variables
1. Rename or copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and paste your Supabase project credentials (obtainable from **Project Settings -> API**):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 3. Create a Staff & Admin Account
To access `/tree/[id]/update` or `/admin`, staff must log in:
1. Navigate to **Authentication -> Users** in your Supabase dashboard and click **Add User -> Create User**.
2. To assign the **Admin** role (which grants access to `/admin` and DDL edit policies):
   Run the following query in the Supabase SQL editor to set the user's role metadata:
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb 
   WHERE email = 'admin-email@example.com';
   ```
   *(Replace `'admin-email@example.com'` with your newly created admin account's email).*

### 4. Run Locally
Install the dependencies and start the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your local browser.

---

## 📐 Brand & Theme Settings

The application color scheme is customized around the **Palamu Tiger Reserve** logo:
- Primary Accent: Deep Forest Green (`#1B5E20`)
- Accent Secondary: Emerald Leaf Green (`#2E7D32`)
- Canvas Background: Warm grey-green tint (`#f5f7f5`)
- Layout Border Radius: Rounded card shapes (`1rem` / `rounded-xl`)
- Logo: Stored at `/public/logo.png`. Displays on headers, login screen, footers, and printable metal-tag grids.

---

## 🚀 Deploy on Vercel

1. Push the project code to a GitHub repository.
2. Link your repository in the Vercel dashboard.
3. Configure the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project deployment screen.
4. Click **Deploy**.
