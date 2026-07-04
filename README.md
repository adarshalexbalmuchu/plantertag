# Palamu Tiger Reserve (PTR) — QR Tree Tracker

A professional, mobile-first QR-based tree tracking web application developed for the Palamu Tiger Reserve (PTR) forest monitoring initiative. 

Scanning a tree's printed QR tag directs users to its public growth log. Staff can sign in to log watering visits and upload growth photos directly using their phone's camera.

---

## 🌲 Features

- **Public Tree Page (`/tree/[id]`)**: Server-rendered for instant loads on weak mobile data. Displays planter, species, date planted, coordinates (with Google Maps link), watering counts, and growth photo history.
- **Staff Portal & Verification (`/login`)**: Secure Supabase email/password authentication.
- **Staff Updates (`/tree/[id]/update`)**: Quick, low-friction mobile forms. The photo upload immediately invokes the phone's native camera (`capture="environment"`).
- **Admin Control Panel (`/admin`)**: Sortable, searchable data-table of all 50 seeded trees. Individual QR code previews and single downloads.
- **Printable QR Sheet (`/admin/qr-codes`)**: A print-ready tag layout containing reserve logos, tree species, ID labels, and high-fidelity QR codes sized for sticker or metal tag printing.
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
3. Copy the contents of [`database/supabase_setup.sql`](database/supabase_setup.sql) and execute it. This creates the tables, roles/profiles, atomic write RPCs, RLS policies, storage bucket configuration, and seeds the 50 trees. The script is idempotent — safe to re-run any time you pull schema changes.

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
To access `/tree/[id]/update` or `/admin`, staff must log in. Every new Supabase Auth user is automatically given a row in `public.profiles` with `role = 'staff'` (via the `on_auth_user_created` trigger) — staff can log visits and growth photos, but cannot edit core tree details or open `/admin`.

1. Navigate to **Authentication -> Users** in your Supabase dashboard and click **Add User -> Create User**.
2. To promote an account to **admin** (grants access to `/admin`, `/admin/qr-codes`, and editing core tree details), run in the SQL editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'admin-email@example.com';
   ```
   *(Replace `'admin-email@example.com'` with your newly created account's email).*

> Note: the app's demo login form pre-fills `demo@ptr.org` / `demo1234` **only when running in mock mode** (no Supabase env vars configured). Once real Supabase credentials are set, the demo hint disappears and the fields start empty — don't reintroduce hardcoded/visible credentials for a real deployment.

### 4. Run Locally
Install the dependencies and start the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your local browser.

---

## 🔒 Security & Scale Notes

- **Roles**: `public.profiles.role` (`staff` | `admin`) is enforced in Postgres RLS and inside the write RPCs — not just in the UI. Staff log visits/photos through `log_tree_visit` / `log_tree_photo`; only admins can call `update_tree_details` or open `/admin`.
- **Atomic writes**: logging a visit/photo and updating the tree's status happen inside a single RPC (one transaction), so a network blip mid-write can't leave a log recorded without its status update.
- **Server-stamped audit fields**: `staff_name`, `created_by`, `updated_by` are set by database triggers from the caller's JWT — never trusted from the client, so one authenticated account can't spoof another's identity in the log trail.
- **Storage**: the `tree-photos` bucket enforces a 5&nbsp;MB file-size limit and an image-only MIME allowlist server-side (previously only client-side canvas compression limited uploads). Only the uploader or an admin can delete a photo.
- **Offline sync**: a failed queued item no longer blocks every other queued item — it's skipped and retried on the next sync (up to 5 attempts) instead of aborting the whole queue.
- **Dashboard scale**: `/admin` reads from `tree_dashboard_view`, which pre-aggregates visit/photo counts in SQL, instead of downloading the full `tree_logs` table to the browser — keeps the dashboard fast as logs accumulate well beyond the current 50 seeded trees.
- Supabase's hosted connection pooler (Supavisor) handles concurrent connections for you — no extra configuration needed for ~100 concurrent users at this schema's scale.

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
