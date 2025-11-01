# PawPortal (Next.js + Tailwind + Supabase)

A 90% production-ready bridging website for ethical pet adoption. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind**, and **Supabase** (Auth + Postgres + Storage).

## Features
- Public pet catalog with search & filters
- Pet detail pages + adoption application flow
- User dashboard: track your applications
- Admin dashboard: manage pets, review applications, view users
- Supabase Auth (email/password), RLS policies, and Storage for pet photos
- Clean, responsive UI with Tailwind

## 1) Quick Start (Local)
```bash
# 1. Unzip, open folder
cd pawportal-next

# 2. Install deps
npm i

# 3. Copy env
cp .env.example .env
# Fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run dev server
npm run dev
# Visit http://localhost:3000
```

## 2) Supabase Setup
1. Create a project at https://supabase.com
2. In SQL Editor, run: `supabase/schema.sql` (creates tables + RLS policies)
3. (Optional) Seed sample pets: run `supabase/seed.sql`
4. Storage: create a **public** bucket named `pets`
5. Auth: enable email/password
6. Get your project **URL** and **Anon Key** → paste into `.env`

> Admin role: After your first sign-up, open the `profiles` table in Supabase and set your `role` to `admin`.

## 3) Production Deploy (Vercel)
- Push the repo to GitHub
- Import to Vercel → set **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Redeploy. Done!

## Notes
- All admin pages are server-protected by role checks via Supabase.
- For real payments/donations, integrate a provider (e.g., Stripe) in a separate route.
- For messaging or real-time updates, use Supabase Realtime channels.
- Prefer signed URLs for photos if you need stricter access controls (bucket privacy).

## Project Structure
```
app/                # App Router pages
components/         # UI components
lib/                # Supabase server/browser clients, shared types
styles/             # Tailwind
supabase/           # SQL schema + seeds
```

## License
MIT
